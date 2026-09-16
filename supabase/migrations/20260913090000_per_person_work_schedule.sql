-- Per-person working days.
--
-- Until now "is this a working day?" was a company-wide question: Sunday off,
-- Saturday per attendance_settings.saturday_working, holidays off. That is the
-- right default and stays the default — but it has no way to describe somebody
-- whose week is not the company's week. A business developer who works Saturday
-- and Sunday could not check in at all (attendancePolicy.checkDayGates refused
-- the punch) and could not file a standup (fn_standup_window closed the window
-- on a non-working day).
--
-- This is deliberately NOT folded into profiles.job_type. job_type answers
-- "where do you work from" and drives job_type_policies (office-network gate,
-- schedule-window enforcement, terminal-only attendance). Working days answer
-- "when do you work". They are independent: a hybrid person may keep a normal
-- Mon-Fri week, and another hybrid person may work Tue-Sat. Encoding both on one
-- column needs the cross-product of the two ('hybrid_flexible', 'remote_flexible'…),
-- which is how an enum stops describing anything.
--
-- Purely additive: every existing profile gets schedule_mode 'company', which is
-- the behaviour they have today.

-- ── The schedule itself ──────────────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS schedule_mode text NOT NULL DEFAULT 'company'
    CHECK (schedule_mode IN ('company', 'custom_days', 'flexible'));

-- Day numbers match EXTRACT(DOW): 0 = Sunday … 6 = Saturday.
-- Meaningful only for 'custom_days'; NULL everywhere else.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS work_days smallint[];

COMMENT ON COLUMN profiles.schedule_mode IS
  'company = follow the company calendar (default); custom_days = profiles.work_days; flexible = any non-holiday day is workable and the absence job never marks them.';
COMMENT ON COLUMN profiles.work_days IS
  'Working weekdays, 0=Sunday .. 6=Saturday. Only read when schedule_mode is custom_days.';

-- A custom week has to actually name its days, and they have to be real days.
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_work_days_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_work_days_check CHECK (
  CASE
    WHEN schedule_mode = 'custom_days'
      THEN work_days IS NOT NULL
       AND array_length(work_days, 1) > 0
       AND work_days <@ ARRAY[0,1,2,3,4,5,6]::smallint[]
    ELSE true
  END
);

-- ── The per-person gate ──────────────────────────────────────────────────────
-- Holidays stay company-wide in every mode: a public holiday is a fact about the
-- country, not about one person's rota. Somebody who genuinely works a holiday
-- can still be recorded — the terminal path records punches it would have
-- refused — it is just never *expected* of them.
CREATE OR REPLACE FUNCTION fn_is_working_day_for(p_profile uuid, d date)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_mode text;
  v_days smallint[];
BEGIN
  IF EXISTS (SELECT 1 FROM holidays WHERE date = d) THEN RETURN false; END IF;

  SELECT p.schedule_mode, p.work_days INTO v_mode, v_days
    FROM profiles p WHERE p.id = p_profile;

  -- No profile (or a row written before this migration ran) behaves as before.
  IF v_mode IS NULL OR v_mode = 'company' THEN
    RETURN fn_is_working_day(d);
  END IF;

  IF v_mode = 'flexible' THEN
    RETURN true;
  END IF;

  RETURN EXTRACT(DOW FROM d)::smallint = ANY(COALESCE(v_days, ARRAY[]::smallint[]));
END;
$$;

COMMENT ON FUNCTION fn_is_working_day_for(uuid, date) IS
  'Per-person sibling of fn_is_working_day. Every rule asking "is this a working day for THIS person" must use this one.';

-- ── Absence marking ──────────────────────────────────────────────────────────
-- Two changes. The date-level early return is gone: on a Saturday the company
-- does not work but a custom_days person might, so the decision has moved into
-- the row filter. And 'flexible' people are never auto-marked absent — the whole
-- point of the mode is that no particular day was promised, so there is no day
-- to find them missing from.
CREATE OR REPLACE FUNCTION fn_mark_absent_for_date(d date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO attendance (profile_id, date, status, day_type, day_part, source)
  SELECT p.id, d, 'absent', 'work', 'full', 'system'
  FROM profiles p
  WHERE p.is_active
    AND is_internal_profile(p.id)
    AND p.schedule_mode <> 'flexible'
    AND fn_is_working_day_for(p.id, d)
    AND NOT EXISTS (SELECT 1 FROM attendance a WHERE a.profile_id = p.id AND a.date = d)
  ON CONFLICT (profile_id, date) DO NOTHING;

  UPDATE attendance
  SET status = 'absent', updated_at = now()
  WHERE date = d
    AND status IS NULL
    AND check_in IS NULL
    AND day_type = 'leave'
    AND day_part <> 'full';
END;
$$;

-- ── Standups ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_standup_required(p_profile uuid, p_date date)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT fn_standup_participant(p_profile)
     AND fn_is_working_day_for(p_profile, p_date)
     AND NOT EXISTS (
           SELECT 1 FROM attendance a
            WHERE a.profile_id = p_profile AND a.date = p_date
              AND a.day_type IN ('leave', 'holiday') AND a.day_part = 'full')
$$;

-- Only the guard changes; the deduction arithmetic below it is untouched.
CREATE OR REPLACE FUNCTION fn_standup_required_minutes(p_profile uuid, p_date date)
RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_start time; v_end time; v_half time;
  v_day_type text; v_day_part text;
  v_deducted int := 0;
  r record;
BEGIN
  IF NOT fn_is_working_day_for(p_profile, p_date) THEN RETURN 0; END IF;
  IF NOT fn_standup_required(p_profile, p_date) THEN RETURN 0; END IF;

  SELECT work_start_time, work_end_time, half_day_start_time
    INTO v_start, v_end, v_half
    FROM attendance_settings LIMIT 1;

  SELECT a.day_type, a.day_part INTO v_day_type, v_day_part
    FROM attendance a
   WHERE a.profile_id = p_profile AND a.date = p_date;

  IF v_day_type IN ('leave', 'holiday') AND COALESCE(v_day_part, 'full') = 'full' THEN
    RETURN 0;
  END IF;

  FOR r IN
    WITH raw(f, t) AS (
      SELECT v_start, v_half
       WHERE v_day_type = 'leave' AND v_day_part = 'first_half'
      UNION ALL
      SELECT v_half, v_end
       WHERE v_day_type = 'leave' AND v_day_part = 'second_half'
      UNION ALL
      SELECT
        CASE WHEN e.exception_type = 'late_arrival' THEN v_start ELSE e.requested_time END,
        CASE
          WHEN e.exception_type = 'late_arrival'    THEN e.requested_time
          WHEN e.exception_type = 'early_departure' THEN v_end
          ELSE COALESCE(e.return_time, v_end)
        END
      FROM attendance_exceptions e
      WHERE e.profile_id = p_profile AND e.date = p_date AND e.status = 'approved'
    ),
    valid AS (SELECT f, t FROM raw WHERE f IS NOT NULL AND t IS NOT NULL AND t > f),
    ordered AS (
      SELECT f, t, MAX(t) OVER (ORDER BY f, t ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS prev_max
        FROM valid
    ),
    grouped AS (
      SELECT f, t, SUM(CASE WHEN prev_max IS NULL OR f > prev_max THEN 1 ELSE 0 END)
                     OVER (ORDER BY f, t) AS run
        FROM ordered
    )
    SELECT MIN(f) AS f, MAX(t) AS t FROM grouped GROUP BY run
  LOOP
    v_deducted := v_deducted + fn_working_overlap_minutes(r.f, r.t);
  END LOOP;

  RETURN GREATEST(0, fn_working_day_minutes() - v_deducted);
END;
$$;

CREATE OR REPLACE FUNCTION fn_unpaid_exception_minutes(p_profile uuid, p_date date)
RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_start time; v_end time; v_total int := 0; r record;
BEGIN
  IF NOT fn_is_working_day_for(p_profile, p_date) THEN RETURN 0; END IF;

  SELECT work_start_time, work_end_time INTO v_start, v_end
    FROM attendance_settings LIMIT 1;

  FOR r IN
    WITH raw(f, t) AS (
      SELECT
        CASE WHEN e.exception_type = 'late_arrival' THEN v_start ELSE e.requested_time END,
        CASE
          WHEN e.exception_type = 'late_arrival'    THEN e.requested_time
          WHEN e.exception_type = 'early_departure' THEN v_end
          ELSE COALESCE(e.return_time, v_end)
        END
      FROM attendance_exceptions e
      WHERE e.profile_id = p_profile AND e.date = p_date AND e.status = 'approved'
    ),
    valid AS (SELECT f, t FROM raw WHERE f IS NOT NULL AND t IS NOT NULL AND t > f),
    ordered AS (
      SELECT f, t, MAX(t) OVER (ORDER BY f, t ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS prev_max
        FROM valid
    ),
    grouped AS (
      SELECT f, t, SUM(CASE WHEN prev_max IS NULL OR f > prev_max THEN 1 ELSE 0 END)
                     OVER (ORDER BY f, t) AS run
        FROM ordered
    )
    SELECT MIN(f) AS f, MAX(t) AS t FROM grouped GROUP BY run
  LOOP
    v_total := v_total + fn_working_overlap_minutes(r.f, r.t);
  END LOOP;

  RETURN v_total;
END;
$$;

-- The standup window's own working-day answer. is_open already ANDs this, so a
-- flexible or custom_days person's Saturday window now opens like any other day.
CREATE OR REPLACE FUNCTION fn_standup_window(p_profile uuid)
RETURNS TABLE(server_now timestamptz, standup_date date, opens_at timestamptz,
              closes_at timestamptz, on_time_until timestamptz, is_open boolean,
              is_working_day boolean, is_required boolean, already_done boolean,
              my_standup_id uuid, can_edit boolean, work_end_time time,
              timezone text, required_minutes integer, min_work_done_chars integer,
              enforce_required_hours boolean, xp_on_time integer,
              makeup_owed_minutes integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s attendance_settings; ss standup_settings;
  v_today date; v_opens timestamptz; v_closes timestamptz; v_standup uuid;
BEGIN
  SELECT * INTO s  FROM attendance_settings LIMIT 1;
  SELECT * INTO ss FROM standup_settings    LIMIT 1;

  v_today  := (now() AT TIME ZONE s.timezone)::date;
  v_opens  := fn_standup_opens_at(v_today);
  v_closes := fn_next_working_start(v_today);

  SELECT st.id INTO v_standup
    FROM standups st
   WHERE st.profile_id = p_profile AND st.standup_date = v_today;

  server_now     := now();
  standup_date   := v_today;
  opens_at       := v_opens;
  on_time_until  := v_opens + make_interval(mins => ss.on_time_window_min);
  closes_at      := v_closes;
  is_working_day := fn_is_working_day_for(p_profile, v_today);
  is_open        := now() >= v_opens AND now() <= v_closes AND is_working_day;
  is_required    := fn_standup_required(p_profile, v_today);
  already_done   := v_standup IS NOT NULL;
  my_standup_id  := v_standup;
  can_edit       := v_standup IS NOT NULL AND now() <= v_closes;
  work_end_time  := s.work_end_time;
  timezone       := s.timezone;

  required_minutes       := fn_standup_required_minutes(p_profile, v_today);
  min_work_done_chars    := ss.min_work_done_chars;
  enforce_required_hours := ss.enforce_required_hours;
  xp_on_time             := ss.xp_on_time;

  SELECT balance_minutes INTO makeup_owed_minutes
    FROM fn_makeup_balance(p_profile, date_trunc('month', v_today)::date, v_today - 1);
  makeup_owed_minutes := COALESCE(makeup_owed_minutes, 0);

  RETURN NEXT;
END;
$$;

-- ── Leave and WFH ────────────────────────────────────────────────────────────
-- A leave request costs the requester their own working days, and syncs onto
-- their own working days. Charging a Tue-Sat person for a Monday they never work
-- (or skipping the Saturday they do) is the same bug in two directions.
CREATE OR REPLACE FUNCTION fn_set_leave_days()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.day_part <> 'full' THEN
    IF NEW.start_date <> NEW.end_date THEN
      RAISE EXCEPTION 'Half-day leave must be a single day';
    END IF;
    NEW.days := CASE WHEN fn_is_working_day_for(NEW.profile_id, NEW.start_date) THEN 0.5 ELSE 0 END;
  ELSE
    NEW.days := (
      SELECT count(*) FROM generate_series(NEW.start_date, NEW.end_date, interval '1 day') g(d)
      WHERE fn_is_working_day_for(NEW.profile_id, g.d::date)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION fn_sync_leave_to_attendance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_type_name text;
BEGIN
  IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') AND OLD.status = 'approved' THEN
    UPDATE attendance
    SET day_type = 'work', day_part = 'full', note = NULL, updated_at = now()
    WHERE profile_id = OLD.profile_id
      AND date BETWEEN OLD.start_date AND OLD.end_date
      AND day_type = 'leave';

    DELETE FROM attendance
    WHERE profile_id = OLD.profile_id
      AND date BETWEEN OLD.start_date AND OLD.end_date
      AND source = 'system' AND check_in IS NULL AND status IS NULL;

    UPDATE attendance
    SET status = fn_arrival_status(check_in, 'full'), updated_at = now()
    WHERE profile_id = OLD.profile_id
      AND date BETWEEN OLD.start_date AND OLD.end_date
      AND check_in IS NOT NULL AND status IS NOT NULL AND day_part = 'full';
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;

  IF NEW.status = 'approved' THEN
    SELECT name INTO v_type_name FROM leave_types WHERE id = NEW.leave_type_id;

    INSERT INTO attendance (profile_id, date, day_type, day_part, status, source, marked_by, note)
    SELECT NEW.profile_id, g.d::date, 'leave', NEW.day_part, NULL, 'system', NEW.reviewed_by,
           COALESCE(v_type_name, 'Leave')
           || CASE NEW.day_part
                WHEN 'first_half'  THEN ' (first half)'
                WHEN 'second_half' THEN ' (second half)'
                ELSE ''
              END
    FROM generate_series(NEW.start_date, NEW.end_date, interval '1 day') g(d)
    WHERE fn_is_working_day_for(NEW.profile_id, g.d::date)
    ON CONFLICT (profile_id, date) DO UPDATE
      SET day_type = 'leave',
          day_part = EXCLUDED.day_part,
          marked_by = EXCLUDED.marked_by,
          note = EXCLUDED.note,
          status = CASE
                     WHEN EXCLUDED.day_part = 'full' THEN NULL
                     WHEN attendance.check_in IS NOT NULL
                       THEN fn_arrival_status(attendance.check_in, EXCLUDED.day_part)
                     ELSE attendance.status
                   END,
          check_in = CASE WHEN EXCLUDED.day_part = 'full' THEN NULL ELSE attendance.check_in END,
          check_out = CASE WHEN EXCLUDED.day_part = 'full' THEN NULL ELSE attendance.check_out END,
          updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION fn_sync_wfh_to_attendance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') AND OLD.status = 'approved' THEN
    UPDATE attendance a
    SET day_type = CASE
          WHEN EXISTS (SELECT 1 FROM company_wfh_days c WHERE c.date = a.date)
          THEN 'wfh' ELSE 'work' END,
        day_part = 'full',
        updated_at = now()
    WHERE a.profile_id = OLD.profile_id
      AND a.date BETWEEN OLD.start_date AND OLD.end_date
      AND a.day_type = 'wfh';

    DELETE FROM attendance a
    WHERE a.profile_id = OLD.profile_id
      AND a.date BETWEEN OLD.start_date AND OLD.end_date
      AND a.source = 'system' AND a.day_type = 'work'
      AND a.check_in IS NULL AND a.status IS NULL;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;

  IF NEW.status = 'approved' THEN
    INSERT INTO attendance (profile_id, date, day_type, day_part, status, source, marked_by, note)
    SELECT NEW.profile_id, g.d::date, 'wfh', NEW.day_part, NULL, 'system', NEW.reviewed_by,
           'Work from home'
           || CASE NEW.day_part
                WHEN 'first_half'  THEN ' (first half)'
                WHEN 'second_half' THEN ' (second half)'
                ELSE ''
              END
    FROM generate_series(NEW.start_date, NEW.end_date, interval '1 day') g(d)
    WHERE fn_is_working_day_for(NEW.profile_id, g.d::date)
    ON CONFLICT (profile_id, date) DO UPDATE
      SET day_type = 'wfh',
          day_part = EXCLUDED.day_part,
          marked_by = EXCLUDED.marked_by,
          note = EXCLUDED.note,
          updated_at = now()
      WHERE attendance.day_type <> 'leave';
  END IF;
  RETURN NEW;
END;
$$;

-- ── Reporting ────────────────────────────────────────────────────────────────
-- is_working_day was resolved once for the whole date and stamped onto every
-- row. With per-person calendars the answer differs by row, so it moves into a
-- lateral alongside the person. Everything downstream that read v_working now
-- reads wd.ok, and the expected start/end columns blank out for whoever is off
-- rather than for nobody or everybody.
CREATE OR REPLACE FUNCTION timesheet_roster(p_date date)
RETURNS TABLE(profile_id uuid, profile_name text, avatar_url text, role text,
              job_title text, team_names text[], is_working_day boolean,
              day_type text, day_part text, att_status text,
              check_in timestamptz, check_out timestamptz,
              leave_type text, leave_color text, holiday_name text,
              expected_start text, expected_end text, required_minutes integer,
              tracked_minutes integer, segments integer, exceptions jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tz text; v_from timestamptz; v_to timestamptz;
  v_start time; v_end time; v_half time;
  v_holiday text; v_company_wfh boolean;
BEGIN
  SELECT s.timezone, s.work_start_time, s.work_end_time, s.half_day_start_time
    INTO v_tz, v_start, v_end, v_half
    FROM attendance_settings s LIMIT 1;

  v_from := (p_date::text || ' 00:00')::timestamp AT TIME ZONE v_tz;
  v_to   := v_from + interval '1 day';

  v_company_wfh := EXISTS (SELECT 1 FROM company_wfh_days w WHERE w.date = p_date);
  SELECT h.name INTO v_holiday FROM holidays h WHERE h.date = p_date LIMIT 1;

  RETURN QUERY
  WITH person AS (
    SELECT pr.id, pr.name, pr.avatar_url, pr.role,
           COALESCE(dg.name, pr.job_title) AS title,
           pr.allowed_check_in
      FROM profiles pr
      LEFT JOIN designations dg ON dg.id = pr.designation_id
     WHERE pr.is_active
       AND pr.role NOT IN ('client_owner', 'client_member')
       AND fn_can_report_on(pr.id)
  )
  SELECT
    p.id, p.name, p.avatar_url, p.role, p.title,
    COALESCE(tm.names, ARRAY[]::text[]),
    wd.ok,
    COALESCE(
      a.day_type,
      CASE
        WHEN v_holiday IS NOT NULL              THEN 'holiday'
        WHEN lv.name IS NOT NULL                THEN 'leave'
        WHEN wf.day_part IS NOT NULL
          OR v_company_wfh                      THEN 'wfh'
        ELSE 'work'
      END
    ),
    COALESCE(a.day_part, lv.day_part, wf.day_part, 'full'),
    a.status, a.check_in, a.check_out,
    lv.name, lv.color, v_holiday,
    CASE
      WHEN NOT wd.ok THEN NULL
      WHEN COALESCE(a.day_type, CASE WHEN lv.name IS NOT NULL THEN 'leave' ELSE 'work' END)
             IN ('leave', 'holiday')
       AND COALESCE(a.day_part, lv.day_part, 'full') = 'full' THEN NULL
      WHEN COALESCE(a.day_part, lv.day_part, 'full') = 'first_half' THEN to_char(v_half::interval, 'HH24:MI')
      ELSE to_char(COALESCE(p.allowed_check_in, v_start)::interval, 'HH24:MI')
    END,
    CASE
      WHEN NOT wd.ok THEN NULL
      WHEN COALESCE(a.day_type, CASE WHEN lv.name IS NOT NULL THEN 'leave' ELSE 'work' END)
             IN ('leave', 'holiday')
       AND COALESCE(a.day_part, lv.day_part, 'full') = 'full' THEN NULL
      WHEN COALESCE(a.day_part, lv.day_part, 'full') = 'second_half' THEN to_char(v_half::interval, 'HH24:MI')
      ELSE to_char(v_end::interval, 'HH24:MI')
    END,
    fn_standup_required_minutes(p.id, p_date),
    COALESCE(tt.mins, 0), COALESCE(tt.segs, 0),
    COALESCE(ex.items, '[]'::jsonb)
  FROM person p

  LEFT JOIN LATERAL (SELECT fn_is_working_day_for(p.id, p_date) AS ok) wd ON true

  LEFT JOIN attendance a
    ON a.profile_id = p.id AND a.date = p_date

  LEFT JOIN LATERAL (
    SELECT array_agg(t.name ORDER BY t.name) AS names
      FROM team_members m JOIN teams t ON t.id = m.team_id
     WHERE m.profile_id = p.id
  ) tm ON true

  LEFT JOIN LATERAL (
    SELECT lr.day_part, lt.name, lt.color
      FROM leave_requests lr
      JOIN leave_types lt ON lt.id = lr.leave_type_id
     WHERE lr.profile_id = p.id
       AND lr.status = 'approved'
       AND p_date BETWEEN lr.start_date AND lr.end_date
     ORDER BY lr.created_at DESC
     LIMIT 1
  ) lv ON true

  LEFT JOIN LATERAL (
    SELECT wr.day_part
      FROM wfh_requests wr
     WHERE wr.profile_id = p.id
       AND wr.status = 'approved'
       AND p_date BETWEEN wr.start_date AND wr.end_date
     ORDER BY wr.created_at DESC
     LIMIT 1
  ) wf ON true

  LEFT JOIN LATERAL (
    SELECT SUM(fn_clamped_minutes(te.started_at, te.ended_at, v_from, v_to))::int AS mins,
           COUNT(*)::int AS segs
      FROM task_time_entries te
     WHERE te.profile_id = p.id
       AND te.started_at < v_to
       AND COALESCE(te.ended_at, now()) > v_from
  ) tt ON true

  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object(
             'type',             e.exception_type,
             'status',           e.status,
             'requested_time',   to_char(e.requested_time::interval, 'HH24:MI'),
             'return_time',      to_char(e.return_time::interval, 'HH24:MI'),
             'actual_departure', e.actual_departure,
             'actual_return',    e.actual_return,
             'reason',           e.reason
           ) ORDER BY e.requested_time) AS items
      FROM attendance_exceptions e
     WHERE e.profile_id = p.id
       AND e.date = p_date
       AND e.status <> 'rejected'
  ) ex ON true

  ORDER BY COALESCE(tt.mins, 0) DESC, p.name;
END;
$$;

-- ── Setting the schedule ─────────────────────────────────────────────────────
-- Two new parameters, both defaulted, so a browser still running the previous
-- bundle calls this with its six named arguments and behaves exactly as before.
CREATE OR REPLACE FUNCTION admin_update_profile_role(
  p_profile_id uuid,
  p_role text,
  p_designation_id uuid DEFAULT NULL,
  p_job_type text DEFAULT NULL,
  p_allowed_check_in text DEFAULT NULL,
  p_attendance_excluded boolean DEFAULT NULL,
  p_schedule_mode text DEFAULT NULL,
  p_work_days smallint[] DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_target_role text;
  v_mode text;
BEGIN
  SELECT role INTO v_target_role FROM profiles WHERE id = p_profile_id;
  IF v_target_role IS NULL THEN RAISE EXCEPTION 'profile_not_found'; END IF;

  IF p_profile_id = auth.uid() AND p_role <> v_target_role THEN
    RAISE EXCEPTION 'cannot_change_own_role';
  END IF;

  IF NOT can_manage_target(v_target_role) THEN RAISE EXCEPTION 'forbidden_target'; END IF;

  IF p_role NOT IN ('super_admin','admin','project_manager','team_lead','employee','hr','finance') THEN
    RAISE EXCEPTION 'invalid_role';
  END IF;
  IF NOT can_grant_role(p_role) THEN RAISE EXCEPTION 'forbidden_role'; END IF;

  IF p_designation_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM designations WHERE id = p_designation_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'invalid_designation';
  END IF;

  IF p_job_type IS NOT NULL AND p_job_type NOT IN ('on_site','hybrid','remote') THEN
    RAISE EXCEPTION 'invalid_job_type';
  END IF;

  IF p_schedule_mode IS NOT NULL AND p_schedule_mode NOT IN ('company','custom_days','flexible') THEN
    RAISE EXCEPTION 'invalid_schedule_mode';
  END IF;

  v_mode := COALESCE(p_schedule_mode, (SELECT schedule_mode FROM profiles WHERE id = p_profile_id));
  IF v_mode = 'custom_days' AND COALESCE(array_length(p_work_days, 1), 0) = 0 THEN
    RAISE EXCEPTION 'work_days_required';
  END IF;

  UPDATE profiles
  SET role = p_role,
      designation_id = p_designation_id,
      job_type = COALESCE(p_job_type, job_type),
      allowed_check_in = CASE
        WHEN p_allowed_check_in IS NULL THEN allowed_check_in
        WHEN p_allowed_check_in = ''   THEN NULL
        ELSE p_allowed_check_in::time
      END,
      attendance_excluded = COALESCE(p_attendance_excluded, attendance_excluded),
      schedule_mode = v_mode,
      -- Days are meaningless outside custom_days; clearing them keeps a later
      -- switch back to custom_days from silently reviving a stale rota.
      work_days = CASE WHEN v_mode = 'custom_days' THEN p_work_days ELSE NULL END
  WHERE id = p_profile_id;
END;
$$;

-- CREATE OR REPLACE with two extra parameters creates a SECOND function rather
-- than replacing the first, and a six-named-argument call then matches both --
-- PostgreSQL raises "function is not unique" and every role edit fails. The new
-- eight-parameter version defaults both additions, so the old signature's
-- callers (including any browser still on the previous bundle) resolve to it.
DROP FUNCTION IF EXISTS admin_update_profile_role(uuid, text, uuid, text, text, boolean);
