-- attendance.status was carrying two independent facts in one column:
--   (a) did this person turn up, and were they on time  — present / late / absent
--   (b) what kind of day was it                          — leave / half_day / wfh / holiday
--
-- Because one column cannot hold both, whichever fact was written LAST erased the
-- other, and the answer depended on the order events happened in:
--
--   half-day leave approved, then they check in
--     -> classifyExistingRow() has no 'half_day' case, so the row is treated as an
--        ordinary override and the check-in writes status = 'present'.
--        The leave disappears.
--   they check in, then half-day leave approved
--     -> fn_sync_leave_to_attendance overwrites unless source = 'self'. A biometric
--        punch is source = 'biometric', so it IS overwritten -> status = 'half_day'.
--        The arrival time and lateness disappear.
--
-- Same underlying day, two orders, two different answers. That is the bug.
--
-- The fix is to stop making them compete for one column. Three columns, each with
-- exactly one job, mirroring how leave_requests already models this:
--
--   status    present | late | absent | NULL   -- attendance fact; NULL = none expected/recorded
--   day_type  work | leave | wfh | holiday     -- what kind of day it was
--   day_part  full | first_half | second_half  -- how much of it day_type covers
--
-- "Half day" stops being a status. It is leave with day_part <> 'full', which is
-- precisely what the employee requested in the first place — so the attendance row
-- now says the same thing as the leave request instead of a lossy summary of it.
--
-- Writers are split accordingly: leave/WFH/holiday sync touches only day_type and
-- day_part; check-in and the biometric bridge touch only status and check_in.
-- Neither can erase the other's fact, so order stops mattering.

-- ── 1. Columns ────────────────────────────────────────────────────────────────
ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS day_type text NOT NULL DEFAULT 'work',
  ADD COLUMN IF NOT EXISTS day_part text NOT NULL DEFAULT 'full';

-- status must be droppable now: a full day of leave or a holiday has no attendance
-- fact at all, and 'absent' would be a lie (it implies unexcused).
ALTER TABLE attendance ALTER COLUMN status DROP NOT NULL;
ALTER TABLE attendance ALTER COLUMN status DROP DEFAULT;

-- ── 2. Backfill, before the new constraints are enforced ──────────────────────
-- Every existing half_day row resolves to a real day_part from its leave request
-- (verified: 23/23, no fallback needed), and 6 of them still hold the check_in the
-- overwrite could not erase — so the lost attendance fact is recoverable by
-- recomputing present/late from that timestamp against the grace cutoff.
WITH s AS (SELECT timezone, work_start_time, grace_period_min FROM attendance_settings LIMIT 1),
resolved AS (
  SELECT a.id,
         a.status AS old_status,
         a.check_in,
         COALESCE(lr.day_part, 'full') AS part,
         ((a.date + s.work_start_time) AT TIME ZONE s.timezone)
           + make_interval(mins => COALESCE(s.grace_period_min, 0)) AS cutoff
  FROM attendance a
  CROSS JOIN s
  LEFT JOIN LATERAL (
    SELECT l.day_part FROM leave_requests l
    WHERE l.profile_id = a.profile_id AND l.status = 'approved'
      AND a.date BETWEEN l.start_date AND l.end_date
    -- Prefer an explicit half over a full-day request covering the same date.
    ORDER BY (l.day_part <> 'full') DESC
    LIMIT 1
  ) lr ON true
  WHERE a.status IN ('half_day', 'leave', 'wfh', 'holiday')
)
UPDATE attendance a
SET day_type = CASE r.old_status
                 WHEN 'half_day' THEN 'leave'
                 WHEN 'leave'    THEN 'leave'
                 WHEN 'wfh'      THEN 'wfh'
                 WHEN 'holiday'  THEN 'holiday'
               END,
    day_part = CASE WHEN r.old_status = 'half_day' THEN r.part ELSE 'full' END,
    -- Recover the erased attendance fact where the check-in survived; otherwise
    -- leave it unknown rather than inventing an absence years after the fact.
    status   = CASE
                 WHEN r.check_in IS NULL THEN NULL
                 WHEN r.check_in <= r.cutoff THEN 'present'
                 ELSE 'late'
               END
FROM resolved r
WHERE a.id = r.id;

-- Everything else was already a pure attendance fact on an ordinary working day.
UPDATE attendance SET day_type = 'work', day_part = 'full'
WHERE status IN ('present', 'late', 'absent');

-- ── 3. Constraints ────────────────────────────────────────────────────────────
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_status_check;
ALTER TABLE attendance ADD CONSTRAINT attendance_status_check
  CHECK (status IS NULL OR status IN ('present', 'late', 'absent'));

ALTER TABLE attendance ADD CONSTRAINT attendance_day_type_check
  CHECK (day_type IN ('work', 'leave', 'wfh', 'holiday'));

ALTER TABLE attendance ADD CONSTRAINT attendance_day_part_check
  CHECK (day_part IN ('full', 'first_half', 'second_half'));

-- A partial day only means something for leave. An ordinary working day, a holiday
-- or a WFH day is always whole, and allowing 'half' there would reintroduce states
-- with no agreed meaning.
ALTER TABLE attendance ADD CONSTRAINT attendance_day_part_only_for_leave
  CHECK (day_part = 'full' OR day_type = 'leave');

-- Someone on full-day leave or a holiday cannot also have turned up.
ALTER TABLE attendance ADD CONSTRAINT attendance_no_status_on_full_off_day
  CHECK (status IS NULL OR NOT (day_part = 'full' AND day_type IN ('leave', 'holiday')));

CREATE INDEX IF NOT EXISTS idx_attendance_day_type ON attendance (day_type) WHERE day_type <> 'work';

COMMENT ON COLUMN attendance.status IS
  'Attendance fact only: present/late/absent, or NULL when none is expected (full-day leave, holiday) or none was recorded. Never holds leave/wfh — those are day_type.';
COMMENT ON COLUMN attendance.day_type IS
  'What kind of day this was: work | leave | wfh | holiday. Independent of whether the person turned up.';
COMMENT ON COLUMN attendance.day_part IS
  'How much of the day day_type covers. full | first_half | second_half; only leave may be partial. A half day is day_type=leave with day_part<>full.';

-- ── 4. Writers: attendance axis ───────────────────────────────────────────────
-- The old version carried a hack: on a self UPDATE it returned early when
-- OLD.status was half_day/leave/wfh, to stop a check-in wiping the leave. That
-- existed only because the two facts shared a column. They no longer do, so the
-- guard is gone and this function computes the arrival fact unconditionally.
CREATE OR REPLACE FUNCTION public.fn_set_attendance_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_settings    attendance_settings%ROWTYPE;
  v_local_time  time;
  v_late_cutoff time;
  v_early_open  time;
BEGIN
  IF NEW.source = 'self' AND NEW.check_in IS NOT NULL THEN
    SELECT * INTO v_settings FROM attendance_settings;
    v_local_time  := (NEW.check_in AT TIME ZONE v_settings.timezone)::time;
    v_early_open  := v_settings.work_start_time
                     - (v_settings.early_checkin_min || ' minutes')::interval;
    v_late_cutoff := v_settings.work_start_time
                     + (v_settings.grace_period_min || ' minutes')::interval;

    IF v_local_time < v_early_open THEN
      RAISE EXCEPTION 'Check-in is not allowed before % (%)', v_early_open, v_settings.timezone;
    END IF;

    NEW.status := CASE WHEN v_local_time <= v_late_cutoff THEN 'present' ELSE 'late' END;
  END IF;
  RETURN NEW;
END;
$$;

-- ── 5. Writers: day-type axis ─────────────────────────────────────────────────
-- Leave sync now writes ONLY day_type/day_part. Two consequences, both wanted:
--   * approving leave after a check-in no longer erases the arrival — so the
--     `WHERE attendance.source <> 'self'` guard, which existed to protect the
--     check-in and silently failed for biometric rows, is no longer needed;
--   * un-approving no longer DELETEs the row, because that row may hold a real
--     check-in. It is reset to an ordinary working day, and only removed when
--     there is genuinely nothing left on it.
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
    WHERE fn_is_working_day(g.d::date)
    ON CONFLICT (profile_id, date) DO UPDATE
      SET day_type = 'leave',
          day_part = EXCLUDED.day_part,
          marked_by = EXCLUDED.marked_by,
          note = EXCLUDED.note,
          -- Full-day leave cancels any attendance fact (and satisfies the
          -- no-status-on-a-full-off-day constraint). A half day keeps it: the
          -- person may well have worked the other half.
          status = CASE WHEN EXCLUDED.day_part = 'full' THEN NULL ELSE attendance.status END,
          check_in = CASE WHEN EXCLUDED.day_part = 'full' THEN NULL ELSE attendance.check_in END,
          check_out = CASE WHEN EXCLUDED.day_part = 'full' THEN NULL ELSE attendance.check_out END,
          updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_sync_wfh_to_attendance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') AND OLD.status = 'approved' THEN
    UPDATE attendance
    SET day_type = 'work', updated_at = now()
    WHERE profile_id = OLD.profile_id AND date = OLD.date AND day_type = 'wfh';

    DELETE FROM attendance
    WHERE profile_id = OLD.profile_id AND date = OLD.date
      AND source = 'system' AND check_in IS NULL AND status IS NULL;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;

  IF NEW.status = 'approved' AND fn_is_working_day(NEW.date) THEN
    -- WFH is a location, not an absence: a check-in on a WFH day stays intact.
    INSERT INTO attendance (profile_id, date, day_type, day_part, status, source, marked_by, note)
    VALUES (NEW.profile_id, NEW.date, 'wfh', 'full', NULL, 'system', NEW.reviewed_by, 'Work from home')
    ON CONFLICT (profile_id, date) DO UPDATE
      SET day_type = 'wfh', marked_by = EXCLUDED.marked_by, updated_at = now()
      WHERE attendance.day_type <> 'leave';   -- leave outranks WFH for the same day
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_company_wfh_apply()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT fn_is_working_day(NEW.date) THEN RETURN NEW; END IF;

  INSERT INTO attendance (profile_id, date, day_type, day_part, status, source, marked_by, note)
  SELECT p.id, NEW.date, 'wfh', 'full', NULL, 'system', NEW.created_by, 'Company WFH — ' || NEW.reason
  FROM profiles p
  WHERE p.is_active
    AND p.role NOT IN ('client_owner','client_member')
    AND NOT p.attendance_excluded
  ON CONFLICT (profile_id, date) DO UPDATE
    SET day_type = 'wfh', marked_by = EXCLUDED.marked_by,
        note = EXCLUDED.note, updated_at = now()
    WHERE attendance.day_type <> 'leave';   -- someone's own leave outranks a company WFH day
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_company_wfh_revert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE attendance a
  SET day_type = 'work', updated_at = now()
  WHERE a.date = OLD.date
    AND a.day_type = 'wfh'
    AND NOT EXISTS (
      SELECT 1 FROM wfh_requests w
      WHERE w.profile_id = a.profile_id AND w.date = a.date AND w.status = 'approved'
    );

  DELETE FROM attendance a
  WHERE a.date = OLD.date AND a.source = 'system'
    AND a.day_type = 'work' AND a.check_in IS NULL AND a.status IS NULL;
  RETURN OLD;
END;
$$;

-- Holidays move to the day_type axis. The old pair flipped status between
-- 'holiday' and 'absent', which meant declaring a holiday retroactively destroyed
-- the record of who had been marked absent — and reverting it invented absences
-- for people who had actually attended.
CREATE OR REPLACE FUNCTION public.fn_holiday_backfill_attendance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE attendance
  SET day_type = 'holiday', status = NULL, updated_at = now()
  WHERE date = NEW.date AND day_type = 'work' AND check_in IS NULL;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_holiday_revert_attendance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.holidays WHERE date = OLD.date) THEN
    UPDATE public.attendance
    SET day_type = 'work',
        status = CASE WHEN check_in IS NULL THEN 'absent' ELSE status END,
        updated_at = now()
    WHERE date = OLD.date AND day_type = 'holiday';
  END IF;
  RETURN OLD;
END;
$$;

-- ── 6. Absence marking ────────────────────────────────────────────────────────
-- Now also closes off half-day leave that nobody worked: previously such a row
-- existed already, so the "skip anyone with a row" rule left it with no attendance
-- fact at all. A half day nobody turned up for is an absence for that half.
CREATE OR REPLACE FUNCTION public.fn_mark_absent_for_date(d date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT fn_is_working_day(d) THEN RETURN; END IF;

  INSERT INTO attendance (profile_id, date, status, day_type, day_part, source)
  SELECT p.id, d, 'absent', 'work', 'full', 'system'
  FROM profiles p
  WHERE p.is_active
    AND p.role IN ('super_admin', 'admin', 'hr', 'project_manager', 'team_lead', 'employee', 'finance')
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

-- ── 7. Readers that tested status = 'leave' ───────────────────────────────────
-- These ask "is this person off today". Only a FULL day off excuses a standup —
-- someone on half-day leave still works half the day.
CREATE OR REPLACE FUNCTION public.fn_standup_required(p_profile uuid, p_date date)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT fn_standup_participant(p_profile)
     AND fn_is_working_day(p_date)
     AND NOT EXISTS (
           SELECT 1 FROM attendance a
            WHERE a.profile_id = p_profile AND a.date = p_date
              AND a.day_type IN ('leave', 'holiday') AND a.day_part = 'full')
$$;

CREATE OR REPLACE FUNCTION public.standup_roster(p_date date)
RETURNS TABLE(profile_id uuid, name text, avatar_url text, role text, standup_id uuid,
              submitted_at timestamp with time zone, is_late boolean, on_leave boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p.id, p.name, p.avatar_url, p.role,
    st.id, st.submitted_at, st.is_late,
    EXISTS (SELECT 1 FROM attendance a
             WHERE a.profile_id = p.id AND a.date = p_date
               AND a.day_type IN ('leave', 'holiday') AND a.day_part = 'full')
  FROM profiles p
  LEFT JOIN standups st ON st.profile_id = p.id AND st.standup_date = p_date
  WHERE p.is_active
    AND fn_standup_participant(p.id)
    AND (
      current_user_role() IN ('super_admin', 'admin', 'hr')
      OR (current_user_role() IN ('team_lead', 'project_manager') AND shares_team_with(p.id))
    )
  ORDER BY (st.id IS NOT NULL), p.name
$$;
