-- ════════════════════════════════════════════════════════════════════
-- Two additions to the standup: work that belongs to no project, and a
-- starting point built from what the person actually did today.
--
-- ── Ad-hoc entries ───────────────────────────────────────────────────────────
-- Not every hour is billable to a project. Fetching the cake, sitting on an
-- interview panel, half a day of onboarding — real work, no project to file it
-- under, and with an eight-hour rule to satisfy there has to be somewhere to put
-- it. So `project_id` becomes optional and a free-text `title` joins it: an
-- entry now carries either a project or a title of its own.
--
-- Deliberately nothing to do with gamification. This is time accounting, not a
-- reward — a quest that happens to involve an errand is claimed on the quest
-- board as it always was, and logging the hour here neither earns nor implies
-- any XP.
--
-- ── Suggestions ──────────────────────────────────────────────────────────────
-- fn_standup_suggestions returns the tasks somebody plausibly worked on today,
-- so the form opens with rows already in it. Times are NOT suggested: measured
-- over the last 30 days the timer covers 3h46m of an 8h day on average, so a
-- prefilled duration would be wrong far more often than right, and correcting a
-- wrong number is slower than typing an empty one.
-- ════════════════════════════════════════════════════════════════════

-- ── 1. Ad-hoc entries ────────────────────────────────────────────────────────
ALTER TABLE standup_entries
  ALTER COLUMN project_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS title text;

-- A project, or a title. Never neither — an entry with no subject is unreadable
-- on the team board.
ALTER TABLE standup_entries
  DROP CONSTRAINT IF EXISTS standup_entries_has_subject,
  ADD  CONSTRAINT standup_entries_has_subject CHECK (
    project_id IS NOT NULL OR length(btrim(coalesce(title, ''))) >= 3
  );

COMMENT ON COLUMN standup_entries.title IS
  'Free-text subject for work that belongs to no project. Mutually exclusive with project_id in practice.';

-- ── 2. Write paths accept it ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION submit_standup(p_entries jsonb, p_notes text DEFAULT NULL)
RETURNS uuid AS $$
DECLARE
  w record; ss standup_settings; v_standup uuid; v_entry jsonb; v_idx int := 0; v_late boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000'; END IF;
  SELECT * INTO w  FROM fn_standup_window(auth.uid());
  SELECT * INTO ss FROM standup_settings LIMIT 1;

  IF NOT w.is_working_day THEN RAISE EXCEPTION 'Standups are only submitted on working days' USING ERRCODE = 'P0001'; END IF;
  IF now() < w.opens_at THEN RAISE EXCEPTION 'The standup window is not open yet' USING ERRCODE = 'P0002'; END IF;
  IF now() > w.closes_at THEN RAISE EXCEPTION 'The standup window has closed for today' USING ERRCODE = 'P0003'; END IF;
  IF w.already_done THEN RAISE EXCEPTION 'You already submitted today''s standup' USING ERRCODE = 'P0004'; END IF;

  PERFORM fn_validate_standup_entries(auth.uid(), w.standup_date, p_entries);

  v_late := now() > w.on_time_until;

  INSERT INTO standups (profile_id, standup_date, is_late, notes)
  VALUES (auth.uid(), w.standup_date, v_late, NULLIF(btrim(p_notes), ''))
  RETURNING id INTO v_standup;

  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries) LOOP
    INSERT INTO standup_entries (standup_id, project_id, task_id, title, work_done, work_done_doc, minutes_spent, blocker, order_index)
    VALUES (v_standup,
            NULLIF(v_entry->>'project_id','')::uuid,
            NULLIF(v_entry->>'task_id','')::uuid,
            NULLIF(btrim(COALESCE(v_entry->>'title','')),''),
            btrim(v_entry->>'work_done'), v_entry->'work_done_doc',
            (v_entry->>'minutes_spent')::int,
            NULLIF(btrim(COALESCE(v_entry->>'blocker','')),''), v_idx);
    v_idx := v_idx + 1;
  END LOOP;

  IF NOT v_late AND ss.xp_on_time > 0 THEN
    INSERT INTO xp_transactions (profile_id, amount, reason)
    VALUES (auth.uid(), ss.xp_on_time, 'Daily standup: ' || w.standup_date);
  END IF;

  RETURN v_standup;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION update_standup(p_standup_id uuid, p_entries jsonb, p_notes text DEFAULT NULL)
RETURNS uuid AS $$
DECLARE
  st standups; v_entry jsonb; v_idx int := 0; v_closes timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000'; END IF;

  SELECT * INTO st FROM standups WHERE id = p_standup_id;
  IF st.id IS NULL THEN RAISE EXCEPTION 'Standup not found' USING ERRCODE = 'P0006'; END IF;
  IF st.profile_id <> auth.uid() THEN
    RAISE EXCEPTION 'You can only edit your own standup' USING ERRCODE = 'P0007';
  END IF;

  v_closes := fn_next_working_start(st.standup_date);
  IF now() > v_closes THEN
    RAISE EXCEPTION 'This standup is locked — the window has closed' USING ERRCODE = 'P0008';
  END IF;

  PERFORM fn_validate_standup_entries(st.profile_id, st.standup_date, p_entries);

  DELETE FROM standup_entries WHERE standup_id = st.id;

  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries) LOOP
    INSERT INTO standup_entries (standup_id, project_id, task_id, title, work_done, work_done_doc, minutes_spent, blocker, order_index)
    VALUES (st.id,
            NULLIF(v_entry->>'project_id','')::uuid,
            NULLIF(v_entry->>'task_id','')::uuid,
            NULLIF(btrim(COALESCE(v_entry->>'title','')),''),
            btrim(v_entry->>'work_done'), v_entry->'work_done_doc',
            (v_entry->>'minutes_spent')::int,
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

-- An entry needs a project or a title, and the check above only catches it after
-- the insert. Refusing in validation gives the person a sentence instead of a
-- constraint name.
CREATE OR REPLACE FUNCTION fn_validate_standup_entries(
  p_profile uuid, p_date date, p_entries jsonb
) RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ss standup_settings; v_entry jsonb; v_total int := 0; v_required int; v_len int;
BEGIN
  SELECT * INTO ss FROM standup_settings LIMIT 1;

  IF jsonb_typeof(p_entries) <> 'array' OR jsonb_array_length(p_entries) = 0 THEN
    RAISE EXCEPTION 'Add at least one update' USING ERRCODE = 'P0005';
  END IF;

  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries) LOOP
    IF NULLIF(v_entry->>'project_id','') IS NULL
       AND length(btrim(COALESCE(v_entry->>'title',''))) < 3 THEN
      RAISE EXCEPTION 'Every update needs a project, or a title of its own' USING ERRCODE = 'P0011';
    END IF;

    v_len := length(btrim(COALESCE(v_entry->>'work_done', '')));
    IF v_len < ss.min_work_done_chars THEN
      RAISE EXCEPTION 'Each update needs at least % characters (one has %)',
        ss.min_work_done_chars, v_len USING ERRCODE = 'P0009';
    END IF;
    v_total := v_total + COALESCE((v_entry->>'minutes_spent')::int, 0);
  END LOOP;

  v_required := fn_standup_required_minutes(p_profile, p_date);

  IF ss.enforce_required_hours AND v_required > 0 AND v_total <> v_required THEN
    RAISE EXCEPTION 'Log exactly % minutes for today — you have logged %',
      v_required, v_total USING ERRCODE = 'P0010';
  END IF;
END;
$$;

-- ── 3. What did this person work on today? ───────────────────────────────────
CREATE OR REPLACE FUNCTION fn_standup_suggestions(p_profile uuid, p_date date)
RETURNS TABLE (
  task_id uuid, project_id uuid, task_title text, project_name text,
  source text, tracked_minutes integer
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tz text;
BEGIN
  SELECT timezone INTO v_tz FROM attendance_settings LIMIT 1;

  RETURN QUERY
  WITH
  -- Strongest signal: they ran a timer on it today.
  timed AS (
    SELECT te.task_id,
           'timer'::text AS source,
           SUM(EXTRACT(EPOCH FROM (COALESCE(te.ended_at, now()) - te.started_at)) / 60)::int AS mins
      FROM task_time_entries te
     WHERE te.profile_id = p_profile
       AND (te.started_at AT TIME ZONE v_tz)::date = p_date
     GROUP BY te.task_id
  ),
  -- Assigned to them and currently moving.
  in_progress AS (
    SELECT t.id AS task_id, 'in_progress'::text AS source, 0 AS mins
      FROM tasks t
     WHERE t.assignee_id = p_profile
       AND t.status IN ('in_progress', 'review')
       AND t.deleted_at IS NULL
  ),
  -- They said something about it today.
  commented AS (
    SELECT c.task_id, 'commented'::text AS source, 0 AS mins
      FROM comments c
     WHERE c.author_id = p_profile
       AND c.task_id IS NOT NULL
       AND (c.created_at AT TIME ZONE v_tz)::date = p_date
     GROUP BY c.task_id
  ),
  merged AS (
    SELECT * FROM timed
    UNION ALL SELECT * FROM in_progress
    UNION ALL SELECT * FROM commented
  ),
  -- One row per task, keeping the strongest signal and any tracked time.
  ranked AS (
    SELECT m.task_id,
           MAX(m.mins) AS mins,
           MIN(CASE m.source WHEN 'timer' THEN 1 WHEN 'in_progress' THEN 2 ELSE 3 END) AS rank
      FROM merged m
     GROUP BY m.task_id
  )
  SELECT t.id, t.project_id, t.title, p.name,
         CASE r.rank WHEN 1 THEN 'timer' WHEN 2 THEN 'in_progress' ELSE 'commented' END,
         COALESCE(r.mins, 0)
    FROM ranked r
    JOIN tasks t    ON t.id = r.task_id AND t.deleted_at IS NULL
    LEFT JOIN projects p ON p.id = t.project_id
   ORDER BY r.rank, COALESCE(r.mins, 0) DESC, t.title;
END;
$$;

CREATE OR REPLACE FUNCTION standup_suggestions()
RETURNS TABLE (
  task_id uuid, project_id uuid, task_title text, project_name text,
  source text, tracked_minutes integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM fn_standup_suggestions(
    auth.uid(),
    (now() AT TIME ZONE (SELECT timezone FROM attendance_settings LIMIT 1))::date
  );
$$;

REVOKE ALL ON FUNCTION standup_suggestions() FROM public;
REVOKE ALL ON FUNCTION standup_suggestions() FROM anon;
GRANT EXECUTE ON FUNCTION standup_suggestions() TO authenticated;

COMMENT ON FUNCTION standup_suggestions() IS
  'Tasks the caller plausibly worked on today, strongest signal first. Times are informational only — the form never prefills a duration.';
