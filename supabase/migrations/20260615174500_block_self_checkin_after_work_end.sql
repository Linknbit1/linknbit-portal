-- Restore the work-end upper bound on self check-ins.
--
-- 20260521093936_fix_fn_set_attendance_status rewrote this trigger to allow late
-- arrivals (correct) but in doing so dropped the guard that rejects check-ins
-- *after* work_end_time. The attendance-checkin Edge Function still enforces the
-- window, but the database is the source of truth and must reject after-hours
-- self check-ins regardless of which path attempts the insert (or a stale Edge
-- Function deploy). System/admin rows (leave, WFH, absence, manual backfill) are
-- unaffected because the guard only applies to source = 'self'.
CREATE OR REPLACE FUNCTION public.fn_set_attendance_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_settings    attendance_settings%ROWTYPE;
  v_local_time  time;
  v_late_cutoff time;
  v_open_time   time;
BEGIN
  IF NEW.source = 'self' AND NEW.check_in IS NOT NULL THEN
    SELECT * INTO v_settings FROM attendance_settings;
    v_local_time  := (NEW.check_in AT TIME ZONE v_settings.timezone)::time;
    v_open_time   := v_settings.work_start_time;
    v_late_cutoff := v_settings.work_start_time
                     + (v_settings.grace_period_min || ' minutes')::interval;

    -- Block check-ins before the workday opens
    IF v_local_time < v_open_time THEN
      RAISE EXCEPTION 'Check-in is not allowed before % (%)', v_open_time, v_settings.timezone;
    END IF;

    -- Block check-ins after the workday ends (the absence job marks them absent)
    IF v_local_time > v_settings.work_end_time THEN
      RAISE EXCEPTION 'Check-in is not allowed after % (%)', v_settings.work_end_time, v_settings.timezone;
    END IF;

    -- Present if within grace window, late otherwise
    NEW.status := CASE WHEN v_local_time <= v_late_cutoff THEN 'present' ELSE 'late' END;
  END IF;
  RETURN NEW;
END;
$$;
