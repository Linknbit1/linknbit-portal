-- On-time LP was only awarded for self check-ins on INSERT (trg_attendance_xp fired
-- AFTER INSERT, fn_attendance_xp required source='self'). So when an admin/HR marks
-- or edits someone to 'present' — or a late row is corrected to present — no LP was
-- granted. Award the on-time LP whenever a day resolves to 'present' regardless of
-- source, on INSERT or UPDATE, idempotently (once per person per day). The 'present'
-- status already encodes the company check-in rule + the per-employee allowed_check_in.

CREATE OR REPLACE FUNCTION public.fn_attendance_xp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_xp int;
  v_reason text;
BEGIN
  v_reason := 'On-time check-in: ' || NEW.date;
  IF NEW.status = 'present'
     AND NOT EXISTS (
       SELECT 1 FROM xp_transactions
       WHERE profile_id = NEW.profile_id AND reason = v_reason
     ) THEN
    SELECT xp_on_time_checkin INTO v_xp FROM attendance_settings;
    INSERT INTO xp_transactions (profile_id, amount, reason)
    VALUES (NEW.profile_id, v_xp, v_reason);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_attendance_xp ON attendance;
CREATE TRIGGER trg_attendance_xp
  AFTER INSERT OR UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION fn_attendance_xp();
