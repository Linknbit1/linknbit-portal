-- Points were given for an on-time check-in and never taken back.
--
-- fn_attendance_xp awarded on status = 'present' and deduped on a reason string.
-- Nothing ever reversed it, so when a manager corrected a check-in and the day
-- became 'late' — or the row was cleared — the three points stayed. Seven such
-- awards, 21 points, were sitting in live balances against days that no longer
-- said present.
--
-- The trigger now reverses as well as awards, keyed on the same reason string, so
-- a correction is symmetrical with the award it undoes. The negative is INSERTED
-- rather than the original deleted: balances are maintained by
-- fn_apply_xp_transaction off this table, so inserting is what actually moves the
-- balance, and the history keeps a record that a correction happened.

CREATE OR REPLACE FUNCTION public.fn_attendance_xp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_xp int;
  v_reason text;
  v_awarded int;
BEGIN
  v_reason := 'On-time check-in: ' || NEW.date;

  SELECT COALESCE(SUM(amount), 0) INTO v_awarded
    FROM xp_transactions
   WHERE profile_id = NEW.profile_id AND reason = v_reason;

  IF NEW.status = 'present' THEN
    IF v_awarded <= 0 THEN
      SELECT xp_on_time_checkin INTO v_xp FROM attendance_settings;
      IF COALESCE(v_xp, 0) <> 0 THEN
        INSERT INTO xp_transactions (profile_id, amount, reason)
        VALUES (NEW.profile_id, v_xp, v_reason);
      END IF;
    END IF;
  ELSIF v_awarded > 0 THEN
    INSERT INTO xp_transactions (profile_id, amount, reason)
    VALUES (NEW.profile_id, -v_awarded, v_reason);
  END IF;

  RETURN NEW;
END;
$function$;

INSERT INTO xp_transactions (profile_id, amount, reason)
SELECT x.profile_id, -SUM(x.amount), x.reason
  FROM xp_transactions x
  JOIN attendance a
    ON a.profile_id = x.profile_id
   AND a.date::text = right(x.reason, 10)
 WHERE x.reason LIKE 'On-time check-in: %'
   AND a.status IS DISTINCT FROM 'present'
 GROUP BY x.profile_id, x.reason
HAVING SUM(x.amount) > 0;
