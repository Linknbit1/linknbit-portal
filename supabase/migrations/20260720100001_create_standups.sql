-- ════════════════════════════════════════════════════════════════════
-- Daily Standup — structured end-of-day updates.
--
-- The submission slot opens 5 minutes BEFORE work_end_time and hard-closes
-- 60 minutes after it, so nobody can write their update while packing up
-- early. The window is enforced server-side (SECURITY DEFINER RPC using the
-- office timezone) — client clocks are never trusted.
--
-- Format is enforced by CHECK constraints: every entry needs a project, a
-- real amount of time, and a meaningful description. This is what replaces
-- the free-text "learning" one-liners.
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE standups (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  standup_date date        NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  -- Submitted after work_end + grace (still allowed, but visible as late).
  is_late      boolean     NOT NULL DEFAULT false,
  -- Optional day-level note (tomorrow's plan / general remark).
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, standup_date)
);

CREATE INDEX idx_standups_date    ON standups (standup_date DESC);
CREATE INDEX idx_standups_profile ON standups (profile_id, standup_date DESC);

CREATE TRIGGER trg_standups_touch
  BEFORE UPDATE ON standups
  FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

CREATE TABLE standup_entries (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  standup_id    uuid        NOT NULL REFERENCES standups(id) ON DELETE CASCADE,
  project_id    uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  -- Optional link to the real task worked on.
  task_id       uuid        REFERENCES tasks(id) ON DELETE SET NULL,
  -- What was actually done — min length blocks "learning" / "wip".
  work_done     text        NOT NULL CHECK (length(btrim(work_done)) >= 15),
  minutes_spent integer     NOT NULL CHECK (minutes_spent BETWEEN 5 AND 960),
  -- Blocker is optional, but when present must be substantive.
  blocker       text        CHECK (blocker IS NULL OR length(btrim(blocker)) >= 10),
  order_index   integer     NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_standup_entries_standup ON standup_entries (standup_id, order_index);
CREATE INDEX idx_standup_entries_project ON standup_entries (project_id);

-- ── RLS ──────────────────────────────────────────────────────────────
ALTER TABLE standups        ENABLE ROW LEVEL SECURITY;
ALTER TABLE standup_entries ENABLE ROW LEVEL SECURITY;

-- Own standup always visible; management sees everyone's.
CREATE POLICY p_standups_select ON standups FOR SELECT
  USING (
    profile_id = auth.uid()
    OR current_user_role() IN ('super_admin', 'admin', 'hr', 'project_manager', 'team_lead')
  );

-- Writes go through submit_standup(); no direct INSERT/UPDATE policy for staff.
CREATE POLICY p_standups_admin_write ON standups FOR ALL
  USING     (current_user_role() IN ('super_admin', 'admin'))
  WITH CHECK (current_user_role() IN ('super_admin', 'admin'));

CREATE POLICY p_standup_entries_select ON standup_entries FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM standups s WHERE s.id = standup_entries.standup_id
      AND (s.profile_id = auth.uid()
           OR current_user_role() IN ('super_admin', 'admin', 'hr', 'project_manager', 'team_lead'))
  ));

CREATE POLICY p_standup_entries_admin_write ON standup_entries FOR ALL
  USING     (current_user_role() IN ('super_admin', 'admin'))
  WITH CHECK (current_user_role() IN ('super_admin', 'admin'));

-- ── Window helper ────────────────────────────────────────────────────
-- Returns the office-local day plus the exact open/close instants for it.
CREATE OR REPLACE FUNCTION fn_standup_window(p_profile uuid)
RETURNS TABLE (
  server_now      timestamptz,
  standup_date    date,
  opens_at        timestamptz,
  closes_at       timestamptz,
  is_open         boolean,
  is_working_day  boolean,
  is_required     boolean,
  already_done    boolean,
  work_end_time   time,
  timezone        text
) AS $$
DECLARE
  s        attendance_settings;
  v_today  date;
  v_end    timestamptz;
  v_role   text;
  v_active boolean;
  v_excl   boolean;
  v_onleave boolean;
BEGIN
  SELECT * INTO s FROM attendance_settings LIMIT 1;
  v_today := (now() AT TIME ZONE s.timezone)::date;
  v_end   := (v_today::text || ' ' || s.work_end_time)::timestamp AT TIME ZONE s.timezone;

  SELECT p.role, p.is_active, p.attendance_excluded
    INTO v_role, v_active, v_excl
  FROM profiles p WHERE p.id = p_profile;

  SELECT EXISTS (
    SELECT 1 FROM attendance a
    WHERE a.profile_id = p_profile AND a.date = v_today AND a.status = 'leave'
  ) INTO v_onleave;

  server_now     := now();
  standup_date   := v_today;
  opens_at       := v_end - interval '5 minutes';
  closes_at      := v_end + interval '60 minutes';
  is_working_day := fn_is_working_day(v_today);
  is_open        := now() >= opens_at AND now() <= closes_at AND is_working_day;
  -- Only employees must submit (team leads and management are exempt).
  is_required    := is_working_day AND COALESCE(v_active, false) AND NOT COALESCE(v_excl, false)
                    AND v_role = 'employee' AND NOT v_onleave;
  already_done   := EXISTS (SELECT 1 FROM standups st WHERE st.profile_id = p_profile AND st.standup_date = v_today);
  work_end_time  := s.work_end_time;
  timezone       := s.timezone;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

/** Window state for the signed-in user (drives the UI countdown + lock). */
CREATE OR REPLACE FUNCTION standup_window()
RETURNS TABLE (
  server_now timestamptz, standup_date date, opens_at timestamptz, closes_at timestamptz,
  is_open boolean, is_working_day boolean, is_required boolean, already_done boolean,
  work_end_time time, timezone text
) AS $$
  SELECT * FROM fn_standup_window(auth.uid())
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ── Submission ───────────────────────────────────────────────────────
-- Entries arrive as a JSON array; the whole thing is one transaction so a
-- malformed entry rejects the entire submission.
CREATE OR REPLACE FUNCTION submit_standup(p_entries jsonb, p_notes text DEFAULT NULL)
RETURNS uuid AS $$
DECLARE
  w          record;
  v_standup  uuid;
  v_entry    jsonb;
  v_idx      int := 0;
  v_end      timestamptz;
  s          attendance_settings;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO w FROM fn_standup_window(auth.uid());

  IF NOT w.is_working_day THEN
    RAISE EXCEPTION 'Standups are only submitted on working days' USING ERRCODE = 'P0001';
  END IF;
  IF now() < w.opens_at THEN
    RAISE EXCEPTION 'The standup window is not open yet' USING ERRCODE = 'P0002';
  END IF;
  IF now() > w.closes_at THEN
    RAISE EXCEPTION 'The standup window has closed for today' USING ERRCODE = 'P0003';
  END IF;
  IF w.already_done THEN
    RAISE EXCEPTION 'You already submitted today''s standup' USING ERRCODE = 'P0004';
  END IF;
  IF jsonb_typeof(p_entries) <> 'array' OR jsonb_array_length(p_entries) = 0 THEN
    RAISE EXCEPTION 'Add at least one project update' USING ERRCODE = 'P0005';
  END IF;

  SELECT * INTO s FROM attendance_settings LIMIT 1;
  v_end := (w.standup_date::text || ' ' || s.work_end_time)::timestamp AT TIME ZONE s.timezone;

  INSERT INTO standups (profile_id, standup_date, is_late, notes)
  VALUES (auth.uid(), w.standup_date, now() > v_end + interval '15 minutes', NULLIF(btrim(p_notes), ''))
  RETURNING id INTO v_standup;

  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries) LOOP
    INSERT INTO standup_entries (standup_id, project_id, task_id, work_done, minutes_spent, blocker, order_index)
    VALUES (
      v_standup,
      (v_entry->>'project_id')::uuid,
      NULLIF(v_entry->>'task_id', '')::uuid,
      btrim(v_entry->>'work_done'),
      (v_entry->>'minutes_spent')::int,
      NULLIF(btrim(COALESCE(v_entry->>'blocker', '')), ''),
      v_idx
    );
    v_idx := v_idx + 1;
  END LOOP;

  RETURN v_standup;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── Team view ────────────────────────────────────────────────────────
-- Everyone who was required to submit on a date, with their status. Powers the
-- manager board (submitted / missed / on-leave).
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
    AND p.attendance_excluded = false
    AND p.role = 'employee'
    AND current_user_role() IN ('super_admin', 'admin', 'hr', 'project_manager', 'team_lead')
  ORDER BY (st.id IS NOT NULL), p.name
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
