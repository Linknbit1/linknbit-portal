-- Allow employees to check in a configurable number of minutes BEFORE work_start_time
-- (people often arrive early). Default 30 min. This only widens the lower bound of the
-- check-in window; the late threshold (grace_period_min) is unchanged, and an early
-- check-in is still marked 'present'.

ALTER TABLE attendance_settings
  ADD COLUMN early_checkin_min integer NOT NULL DEFAULT 30;

-- Recompute the lower bound in the status trigger to honour the early window.
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

    -- Block check-ins before the early window opens
    IF v_local_time < v_early_open THEN
      RAISE EXCEPTION 'Check-in is not allowed before % (%)', v_early_open, v_settings.timezone;
    END IF;

    -- Present if within grace window, late otherwise (early arrivals are present)
    NEW.status := CASE WHEN v_local_time <= v_late_cutoff THEN 'present' ELSE 'late' END;
  END IF;
  RETURN NEW;
END;
$$;
