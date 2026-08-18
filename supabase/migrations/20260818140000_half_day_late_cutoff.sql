-- Lateness on a first-half day off is measured from the SECOND half, not 08:00.
--
-- Someone on first-half leave is not expected in until the afternoon, but the
-- late cutoff was always `work_start + grace`, so every such arrival was marked
-- late by definition — Arooba came in at 10:59 on 2026-08-06, hours before she
-- was due, and the portal called her late. There was no way for her not to be.
--
-- The boundary is a setting rather than a derived midpoint: 08:00–17:00 splits
-- at 12:30 arithmetically, but a lunch or prayer break can move where the halves
-- actually fall, and that is an operational decision, not a calculation.
--
-- Keyed on day_part alone, so it covers a partial WFH too: someone working the
-- morning from home and the afternoon from the office is in exactly the same
-- position as someone on first-half leave.

ALTER TABLE attendance_settings
  ADD COLUMN IF NOT EXISTS half_day_start_time time NOT NULL DEFAULT '12:30';

COMMENT ON COLUMN attendance_settings.half_day_start_time IS
  'When the second half of the working day begins. Someone off for the first half is due in at this time, so their late cutoff is this + grace_period_min instead of work_start_time + grace_period_min.';

-- ── One definition of "was this arrival late", used by every writer ──────────
-- The trigger, the leave sync and the backfill below all call this, so they
-- cannot drift apart. The edge functions mirror it in TypeScript (resolveCutoffs
-- in _shared/attendancePolicy.ts) because they also layer per-employee
-- allowances and approved late-arrival exceptions on top, which this does not.
CREATE OR REPLACE FUNCTION public.fn_arrival_status(p_check_in timestamptz, p_day_part text)
RETURNS text LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT CASE
    WHEN p_check_in IS NULL THEN NULL
    WHEN (p_check_in AT TIME ZONE s.timezone)::time
         <= CASE WHEN p_day_part = 'first_half' THEN s.half_day_start_time
                 ELSE s.work_start_time END
            + (s.grace_period_min || ' minutes')::interval
    THEN 'present'
    ELSE 'late'
  END
  FROM attendance_settings s;
$$;

COMMENT ON FUNCTION public.fn_arrival_status(timestamptz, text) IS
  'present | late for an arrival, measured against the half the person is actually due in for. Ignores per-employee allowances and late-arrival exceptions; the edge functions layer those on.';

-- ── Self check-in trigger ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_set_attendance_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_settings    attendance_settings%ROWTYPE;
  v_local_time  time;
  v_early_open  time;
BEGIN
  IF NEW.source = 'self' AND NEW.check_in IS NOT NULL THEN
    SELECT * INTO v_settings FROM attendance_settings;
    v_local_time := (NEW.check_in AT TIME ZONE v_settings.timezone)::time;
    v_early_open := v_settings.work_start_time
                    - (v_settings.early_checkin_min || ' minutes')::interval;

    IF v_local_time < v_early_open THEN
      RAISE EXCEPTION 'Check-in is not allowed before % (%)', v_early_open, v_settings.timezone;
    END IF;

    NEW.status := fn_arrival_status(NEW.check_in, NEW.day_part);
  END IF;
  RETURN NEW;
END;
$$;

-- ── Order independence ──────────────────────────────────────────────────────
-- Arrival paths write status, day-kind paths write day_type/day_part, and that
-- split is what makes the two orders agree. But the cutoff now DEPENDS on
-- day_part, so a check-in recorded before the half day was approved was judged
-- against 08:00 and keeps that verdict. When leave sync stamps a partial day on
-- a row that already holds an arrival, the verdict is recomputed — it is the
-- same fact, re-measured against the half the person turned out to owe.
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

    -- Back to a whole working day: re-measure any arrival against work_start.
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
    WHERE fn_is_working_day(g.d::date)
    ON CONFLICT (profile_id, date) DO UPDATE
      SET day_type = 'leave',
          day_part = EXCLUDED.day_part,
          marked_by = EXCLUDED.marked_by,
          note = EXCLUDED.note,
          -- Full-day leave cancels any attendance fact (and satisfies the
          -- no-status-on-a-full-off-day constraint). A half day keeps it: the
          -- person may well have worked the other half — but re-measured,
          -- because the cutoff moves with the half they are due in for.
          status = CASE
                     WHEN EXCLUDED.day_part = 'full' THEN NULL
                     -- Only an ARRIVAL is re-measured. With no check-in there is
                     -- nothing to measure, and the existing mark (an 'absent'
                     -- from the nightly job) must survive rather than be nulled.
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

-- ── Repair the records already marked late for arriving on time ─────────────
-- Every first-half row carrying an arrival is re-measured. Rows that were
-- correctly late (arrived after the second half had started) stay late.
UPDATE attendance
SET status = fn_arrival_status(check_in, day_part), updated_at = now()
WHERE day_part = 'first_half'
  AND check_in IS NOT NULL
  AND status IS NOT NULL
  AND status IS DISTINCT FROM fn_arrival_status(check_in, day_part);
