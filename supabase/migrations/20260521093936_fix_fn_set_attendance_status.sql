-- Fix fn_set_attendance_status:
-- 1. Only reject check-ins BEFORE work_start_time (late arrivals are allowed — marked 'late')
-- 2. Correct status threshold: present if within grace window, late otherwise
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

    -- Only block check-ins before the workday opens
    IF v_local_time < v_open_time THEN
      RAISE EXCEPTION 'Check-in is not allowed before % (%)', v_open_time, v_settings.timezone;
    END IF;

    -- Present if within grace window, late otherwise
    NEW.status := CASE WHEN v_local_time <= v_late_cutoff THEN 'present' ELSE 'late' END;
  END IF;
  RETURN NEW;
END;
$$;
