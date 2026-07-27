-- ════════════════════════════════════════════════════════════════════
-- Standup participation — part 2 of 2, plus editing and team scoping.
--
-- 1. WHO SUBMITS is now read from the settings added in part 1
--    (fn_standup_required) instead of the hardcoded role = 'employee'.
--    submit_standup() enforces it too — previously anyone could POST a
--    standup, the requirement was advisory UI state.
--
-- 2. EDITING: a submitted standup can be corrected by its owner until the
--    window closes (the next working day's start — the same instant that
--    already ends the submission window). is_late and the 5 XP are frozen at
--    first submission: a correction can neither win points back nor lose them.
--
-- 3. TEAM SCOPING: team leads and PMs now see only their own team's standups,
--    matching what the attendance module already does (shares_team_with).
--    super_admin / admin / hr keep the company-wide view.
--
-- 4. AUDIT: standup edits and deletions land in audit_log under a new
--    'standup' module; an edit or delete performed on someone else's standup
--    is flagged as danger.
-- ════════════════════════════════════════════════════════════════════

-- ── 1. Edit bookkeeping ───────────────────────────────────────────────────────
ALTER TABLE standups
  ADD COLUMN IF NOT EXISTS edited_at  timestamptz,
  ADD COLUMN IF NOT EXISTS edit_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN standups.edit_count IS
  'Number of corrections after the original submission. is_late/XP are frozen at first submit.';

-- ── 2. Window ─────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS standup_window();
DROP FUNCTION IF EXISTS fn_standup_window(uuid);

CREATE OR REPLACE FUNCTION fn_standup_window(p_profile uuid)
RETURNS TABLE (
  server_now timestamptz, standup_date date, opens_at timestamptz, closes_at timestamptz,
  on_time_until timestamptz, is_open boolean, is_working_day boolean, is_required boolean,
  already_done boolean, my_standup_id uuid, can_edit boolean,
  work_end_time time, timezone text
) AS $$
DECLARE
  s attendance_settings; v_today date; v_end timestamptz; v_opens timestamptz; v_closes timestamptz;
  v_standup uuid;
BEGIN
  SELECT * INTO s FROM attendance_settings LIMIT 1;
  v_today  := (now() AT TIME ZONE s.timezone)::date;
  v_end    := (v_today::text || ' ' || s.work_end_time)::timestamp AT TIME ZONE s.timezone;
  v_opens  := v_end - interval '5 minutes';
  v_closes := fn_next_working_start(v_today);

  SELECT st.id INTO v_standup
    FROM standups st
   WHERE st.profile_id = p_profile AND st.standup_date = v_today;

  server_now     := now();
  standup_date   := v_today;
  opens_at       := v_opens;
  on_time_until  := v_opens + interval '60 minutes';
  closes_at      := v_closes;
  is_working_day := fn_is_working_day(v_today);
  is_open        := now() >= v_opens AND now() <= v_closes AND is_working_day;
  is_required    := fn_standup_required(p_profile, v_today);
  already_done   := v_standup IS NOT NULL;
  my_standup_id  := v_standup;
  -- Corrections are allowed for as long as the window itself is open.
  can_edit       := v_standup IS NOT NULL AND now() <= v_closes;
  work_end_time  := s.work_end_time;
  timezone       := s.timezone;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION standup_window()
RETURNS TABLE (
  server_now timestamptz, standup_date date, opens_at timestamptz, closes_at timestamptz,
  on_time_until timestamptz, is_open boolean, is_working_day boolean, is_required boolean,
  already_done boolean, my_standup_id uuid, can_edit boolean,
  work_end_time time, timezone text
) AS $$
  SELECT * FROM fn_standup_window(auth.uid())
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ── 3. Submission (now refuses people who are not on the list) ────────────────
CREATE OR REPLACE FUNCTION submit_standup(p_entries jsonb, p_notes text DEFAULT NULL)
RETURNS uuid AS $$
DECLARE
  w record; v_standup uuid; v_entry jsonb; v_idx int := 0; v_late boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000'; END IF;
  SELECT * INTO w FROM fn_standup_window(auth.uid());

  IF NOT w.is_working_day THEN RAISE EXCEPTION 'Standups are only submitted on working days' USING ERRCODE = 'P0001'; END IF;
  IF NOT w.is_required THEN RAISE EXCEPTION 'You are not on the standup list for today' USING ERRCODE = 'P0009'; END IF;
  IF now() < w.opens_at THEN RAISE EXCEPTION 'The standup window is not open yet' USING ERRCODE = 'P0002'; END IF;
  IF now() > w.closes_at THEN RAISE EXCEPTION 'The standup window has closed for today' USING ERRCODE = 'P0003'; END IF;
  IF w.already_done THEN RAISE EXCEPTION 'You already submitted today''s standup' USING ERRCODE = 'P0004'; END IF;
  IF jsonb_typeof(p_entries) <> 'array' OR jsonb_array_length(p_entries) = 0 THEN
    RAISE EXCEPTION 'Add at least one project update' USING ERRCODE = 'P0005'; END IF;

  v_late := now() > w.on_time_until;

  INSERT INTO standups (profile_id, standup_date, is_late, notes)
  VALUES (auth.uid(), w.standup_date, v_late, NULLIF(btrim(p_notes), ''))
  RETURNING id INTO v_standup;

  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries) LOOP
    INSERT INTO standup_entries (standup_id, project_id, task_id, work_done, minutes_spent, blocker, order_index)
    VALUES (v_standup, (v_entry->>'project_id')::uuid, NULLIF(v_entry->>'task_id','')::uuid,
            btrim(v_entry->>'work_done'), (v_entry->>'minutes_spent')::int,
            NULLIF(btrim(COALESCE(v_entry->>'blocker','')),''), v_idx);
    v_idx := v_idx + 1;
  END LOOP;

  -- On-time standup → +5 XP and +5 reputation (one positive tx credits both).
  IF NOT v_late THEN
    INSERT INTO xp_transactions (profile_id, amount, reason)
    VALUES (auth.uid(), 5, 'Daily standup: ' || w.standup_date);
  END IF;

  RETURN v_standup;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── 4. Correcting a submitted standup ─────────────────────────────────────────
-- Entries are replaced wholesale (the client always sends the full list), which
-- keeps the ordering honest and avoids a diffing protocol. Deliberately does NOT
-- touch is_late or award/revoke XP.
CREATE OR REPLACE FUNCTION update_standup(p_standup_id uuid, p_entries jsonb, p_notes text DEFAULT NULL)
RETURNS uuid AS $$
DECLARE
  st standups; v_entry jsonb; v_idx int := 0; v_closes timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000'; END IF;

  SELECT * INTO st FROM standups WHERE id = p_standup_id;
  IF st.id IS NULL THEN
    RAISE EXCEPTION 'Standup not found' USING ERRCODE = 'P0006';
  END IF;
  IF st.profile_id <> auth.uid() THEN
    RAISE EXCEPTION 'You can only edit your own standup' USING ERRCODE = 'P0007';
  END IF;

  v_closes := fn_next_working_start(st.standup_date);
  IF now() > v_closes THEN
    RAISE EXCEPTION 'This standup is locked — the window has closed' USING ERRCODE = 'P0008';
  END IF;
  IF jsonb_typeof(p_entries) <> 'array' OR jsonb_array_length(p_entries) = 0 THEN
    RAISE EXCEPTION 'Add at least one project update' USING ERRCODE = 'P0005';
  END IF;

  DELETE FROM standup_entries WHERE standup_id = st.id;

  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries) LOOP
    INSERT INTO standup_entries (standup_id, project_id, task_id, work_done, minutes_spent, blocker, order_index)
    VALUES (st.id, (v_entry->>'project_id')::uuid, NULLIF(v_entry->>'task_id','')::uuid,
            btrim(v_entry->>'work_done'), (v_entry->>'minutes_spent')::int,
            NULLIF(btrim(COALESCE(v_entry->>'blocker','')),''), v_idx);
    v_idx := v_idx + 1;
  END LOOP;

  UPDATE standups
     SET notes      = NULLIF(btrim(p_notes), ''),
         edited_at  = now(),
         edit_count = edit_count + 1
   WHERE id = st.id;

  RETURN st.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── 5. Team scoping ───────────────────────────────────────────────────────────
-- Leads and PMs see their own team only; the wider view stays with sa/admin/hr.
-- shares_team_with() is the same helper the attendance policies use.
DROP POLICY IF EXISTS p_standups_select ON standups;
CREATE POLICY p_standups_select ON standups FOR SELECT
  USING (
    profile_id = auth.uid()
    OR current_user_role() IN ('super_admin', 'admin', 'hr')
    OR (current_user_role() IN ('team_lead', 'project_manager') AND shares_team_with(profile_id))
  );

DROP POLICY IF EXISTS p_standup_entries_select ON standup_entries;
CREATE POLICY p_standup_entries_select ON standup_entries FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM standups s
     WHERE s.id = standup_entries.standup_id
       AND (s.profile_id = auth.uid()
            OR current_user_role() IN ('super_admin', 'admin', 'hr')
            OR (current_user_role() IN ('team_lead', 'project_manager') AND shares_team_with(s.profile_id)))
  ));

-- ── 6. Roster ─────────────────────────────────────────────────────────────────
-- Now driven by the participation settings, and scoped the same way as the
-- policies above (it is SECURITY DEFINER, so it must repeat the rule itself).
CREATE OR REPLACE FUNCTION standup_roster(p_date date)
RETURNS TABLE (
  profile_id uuid, name text, avatar_url text, role text,
  standup_id uuid, submitted_at timestamptz, is_late boolean, on_leave boolean
) AS $$
  SELECT
    p.id, p.name, p.avatar_url, p.role,
    st.id, st.submitted_at, st.is_late,
    EXISTS (SELECT 1 FROM attendance a WHERE a.profile_id = p.id AND a.date = p_date AND a.status = 'leave')
  FROM profiles p
  LEFT JOIN standups st ON st.profile_id = p.id AND st.standup_date = p_date
  WHERE p.is_active
    AND fn_standup_participant(p.id)
    AND (
      current_user_role() IN ('super_admin', 'admin', 'hr')
      OR (current_user_role() IN ('team_lead', 'project_manager') AND shares_team_with(p.id))
    )
  ORDER BY (st.id IS NOT NULL), p.name
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ── 7. Audit ──────────────────────────────────────────────────────────────────
-- A dedicated capture (rather than an arm inside fn_audit_capture) because the
-- interesting fact here — "was this the owner correcting themselves?" — has no
-- analogue in the generic heuristics.
CREATE OR REPLACE FUNCTION fn_audit_standup()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_old jsonb; v_new jsonb; v_row jsonb; v_changed text[];
  v_actor uuid := auth.uid(); v_actor_name text; v_actor_role text; v_actor_kind text := 'user';
  v_subject uuid; v_subject_name text;
  v_action text; v_severity text := 'info';
  v_flagged boolean := false; v_flag_reason text; v_summary text;
BEGIN
  v_old := CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) ELSE NULL END;
  v_new := CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) ELSE NULL END;
  v_row := COALESCE(v_new, v_old);

  IF TG_OP = 'UPDATE' THEN
    SELECT array_agg(e.key ORDER BY e.key) INTO v_changed
      FROM jsonb_each(v_new) e
     WHERE e.value IS DISTINCT FROM (v_old -> e.key);
    -- Touch-only updates (the updated_at trigger) are noise.
    IF v_changed IS NULL OR v_changed <@ ARRAY['updated_at'] THEN
      RETURN NULL;
    END IF;
  END IF;

  v_subject := NULLIF(v_row->>'profile_id','')::uuid;

  IF TG_OP = 'DELETE' THEN
    v_action := 'standup.deleted'; v_severity := 'warning';
  ELSE
    v_action := 'standup.edited';
  END IF;

  -- The owner correcting their own update is routine; anyone else touching it
  -- is not — that is a manager rewriting someone's record of their day.
  IF v_actor IS NULL THEN
    v_actor_kind := 'system';
  ELSIF v_actor = v_subject THEN
    v_actor_kind := 'self';
  ELSE
    v_flagged := true; v_severity := 'danger';
    v_action  := CASE WHEN TG_OP = 'DELETE' THEN 'standup.deleted_on_behalf' ELSE 'standup.edited_on_behalf' END;
    v_flag_reason := format('Standup for %s was %s by someone else.',
                            COALESCE(v_row->>'standup_date','an earlier date'),
                            CASE WHEN TG_OP = 'DELETE' THEN 'deleted' ELSE 'edited' END);
  END IF;

  IF v_actor IS NOT NULL THEN
    SELECT name, role INTO v_actor_name, v_actor_role FROM profiles WHERE id = v_actor;
  END IF;
  v_actor_name := COALESCE(v_actor_name, 'System');
  v_actor_role := COALESCE(v_actor_role, 'system');
  IF v_subject IS NOT NULL THEN
    SELECT name INTO v_subject_name FROM profiles WHERE id = v_subject;
  END IF;

  v_summary := format('%s (%s): %s%s',
    v_actor_name, v_actor_role,
    replace(replace(v_action, '.', ' '), '_', ' '),
    CASE WHEN v_subject_name IS NOT NULL THEN ' — ' || v_subject_name ELSE '' END);

  INSERT INTO audit_log(
    module, table_name, record_id, operation, action, severity,
    actor_id, actor_name, actor_role, actor_kind,
    subject_id, subject_name, summary,
    old_values, new_values, changed_fields, flagged, flag_reason, context)
  VALUES (
    'standup', TG_TABLE_NAME, NULLIF(v_row->>'id','')::uuid, TG_OP, v_action, v_severity,
    v_actor, v_actor_name, v_actor_role, v_actor_kind,
    v_subject, v_subject_name, v_summary,
    v_old, v_new, v_changed, v_flagged, v_flag_reason,
    jsonb_build_object('standup_date', v_row->>'standup_date', 'edit_count', v_row->>'edit_count'));

  IF v_severity = 'danger' THEN
    PERFORM fn_notify(
      p.id, 'audit_alert',
      'Flagged action detected',
      COALESCE(v_flag_reason, v_summary),
      'audit_alert', NULLIF(v_row->>'id','')::text, v_actor)
    FROM profiles p
    WHERE p.is_active AND p.role IN ('super_admin','admin');
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_standups ON standups;
CREATE TRIGGER trg_audit_standups
  AFTER UPDATE OR DELETE ON standups
  FOR EACH ROW EXECUTE FUNCTION fn_audit_standup();
