-- fn_set_attendance_status previously recomputed present/late on every INSERT *and*
-- UPDATE of a self check-in, using only work_start + grace. Two problems:
--   1. It ignored the per-employee allowed_check_in override.
--   2. On UPDATE it clobbered manual admin/HR status edits (e.g. late → present),
--      so changing a self row's status never stuck.
-- Fix: only auto-derive on INSERT (the moment of check-in), honour allowed_check_in
-- (no grace) and any approved late-arrival exception, and leave UPDATEs alone so
-- manual edits and edge-function updates that set status explicitly are authoritative.

CREATE OR REPLACE FUNCTION public.fn_set_attendance_status()
RETURNS trigger LANGUAGE plpgsql AS $function$
DECLARE
  v_settings    attendance_settings%ROWTYPE;
  v_local_time  time;
  v_late_cutoff time;
  v_early_open  time;
  v_allowed     time;
  v_late_exc    time;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.source = 'self' AND NEW.check_in IS NOT NULL THEN
    SELECT * INTO v_settings FROM attendance_settings;
    SELECT allowed_check_in INTO v_allowed FROM profiles WHERE id = NEW.profile_id;

    v_local_time := (NEW.check_in AT TIME ZONE v_settings.timezone)::time;
    v_early_open := v_settings.work_start_time
                    - (v_settings.early_checkin_min || ' minutes')::interval;

    -- Per-employee allowed check-in overrides start+grace entirely (no grace applied).
    IF v_allowed IS NOT NULL THEN
      v_late_cutoff := v_allowed;
    ELSE
      v_late_cutoff := v_settings.work_start_time
                       + (v_settings.grace_period_min || ' minutes')::interval;
    END IF;

    -- An approved late-arrival exception widens the cutoff (requested + 10m grace).
    SELECT requested_time INTO v_late_exc
    FROM attendance_exceptions
    WHERE profile_id = NEW.profile_id AND date = NEW.date
      AND exception_type = 'late_arrival' AND status = 'approved'
    LIMIT 1;
    IF v_late_exc IS NOT NULL THEN
      v_late_cutoff := v_late_exc + interval '10 minutes';
    END IF;

    IF v_local_time < v_early_open THEN
      RAISE EXCEPTION 'Check-in is not allowed before % (%)', v_early_open, v_settings.timezone;
    END IF;

    NEW.status := CASE WHEN v_local_time <= v_late_cutoff THEN 'present' ELSE 'late' END;
  END IF;
  RETURN NEW;
END;
$function$;
