-- The 23:59 auto-checkout cron was logging one audit row per employee, every
-- night, credited to the employee as "Faisal Yasin updated their attendance /
-- Self update". Nobody did it — fn_auto_checkout_missing() stamps check_out on
-- every still-open row.
--
-- Why the existing "system actions are not logged" rule (20260731170000) missed
-- it: that rule is `IF v_actor IS NULL AND v_actor_kind <> 'self' THEN RETURN
-- NULL`, and the cron does NOT change `source`. A self check-in row keeps
-- source='self', so fn_audit_capture takes the first attendance branch, sets
-- actor = profile_id / kind = 'self', and the rule never fires. 20260806180000
-- fixed the same class of bug for source='system' rows only.
--
-- `source` cannot be the discriminator here (the row genuinely was a self
-- check-in), and neither can auth.uid() IS NULL: a real self check-out goes
-- through the attendance edge function, which is also service_role with no
-- auth.uid(). The only honest signal is the cron declaring itself, so it now
-- sets a transaction-local GUC that the trigger honours.
--
-- Scoped deliberately: the flag is respected ONLY when auth.uid() IS NULL, so a
-- signed-in session can never use it to hide its own edits — the audit log stays
-- tamper-proof for the people it watches.

-- ── 1. The cron declares itself ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_auto_checkout_missing()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_settings    attendance_settings%ROWTYPE;
  v_today       date;
  v_checkout_ts timestamptz;
BEGIN
  SELECT * INTO v_settings FROM attendance_settings;

  -- Respect the toggle — when off, leave open rows untouched.
  IF NOT v_settings.auto_checkout THEN
    RETURN;
  END IF;

  -- Nothing this job writes is a human action: keep it out of the audit log.
  -- is_local => true, so it reverts when this transaction ends.
  PERFORM set_config('app.audit_suppress', 'on', true);

  -- Today's date in the office timezone
  v_today := (NOW() AT TIME ZONE v_settings.timezone)::date;

  -- Checkout timestamp: end-of-workday in office timezone converted to UTC for storage
  v_checkout_ts := (v_today::text || ' ' || v_settings.work_end_time)::timestamp
                   AT TIME ZONE v_settings.timezone;

  -- OOO left-and-never-returned: exclude departure -> end-of-day from worked hours.
  UPDATE attendance a
  SET    excluded_minutes = GREATEST(
           0,
           EXTRACT(EPOCH FROM (v_checkout_ts - e.actual_departure)) / 60
         )::int,
         updated_at = NOW()
  FROM   attendance_exceptions e
  WHERE  a.date      = v_today
    AND  a.check_in  IS NOT NULL
    AND  a.check_out IS NULL
    AND  e.profile_id     = a.profile_id
    AND  e.date           = v_today
    AND  e.exception_type = 'out_of_office'
    AND  e.status         = 'approved'
    AND  e.actual_departure IS NOT NULL
    AND  e.actual_return    IS NULL;

  UPDATE attendance
  SET    check_out  = v_checkout_ts,
         updated_at = NOW()
  WHERE  date      = v_today
    AND  check_in  IS NOT NULL
    AND  check_out IS NULL;
END;
$$;

-- ── 2. The trigger honours it ─────────────────────────────────────────────────
-- Patched in place rather than re-emitted: fn_audit_capture is ~400 lines of
-- accumulated branch logic and re-declaring it here would silently revert any
-- change made after this file was written. Same guarded-replace approach as
-- 20260806170000 / 20260806180000 — RAISE if the anchor is gone.
DO $patch$
DECLARE
  v_def     text;
  v_anchor  text := E'BEGIN\n  IF v_auth IS NOT NULL';
  v_replace text := E'BEGIN\n'
                 || E'  -- Automated job that declared itself (set_config with is_local => true).\n'
                 || E'  -- Only honoured with no authenticated session, so a signed-in user can\n'
                 || E'  -- never set it to hide their own writes.\n'
                 || E'  IF v_auth IS NULL\n'
                 || E'     AND COALESCE(current_setting(''app.audit_suppress'', true), '''') = ''on'' THEN\n'
                 || E'    RETURN NULL;\n'
                 || E'  END IF;\n\n'
                 || E'  IF v_auth IS NOT NULL';
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_def
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'fn_audit_capture';

  IF v_def IS NULL THEN
    RAISE EXCEPTION 'fn_audit_capture not found';
  END IF;
  IF position(v_anchor in v_def) = 0 THEN
    RAISE EXCEPTION 'body-start anchor not found in fn_audit_capture';
  END IF;

  EXECUTE replace(v_def, v_anchor, v_replace);
END
$patch$;

-- ── 3. Purge the 65 rows already written by this job ──────────────────────────
-- Signature: attendance UPDATE at 23:59 PKT touching only check_out (+ the OOO
-- branch's excluded_minutes) and updated_at. updated_at is the tell — the edge
-- function never stamps it, so genuine self check-outs (24 rows, ~17:00 PKT,
-- changed_fields = {check_out}) do not match and are kept. Verified before
-- deleting: 65 rows match, all 65 rows at 23:59 match, none is flagged.
-- Precedent: 20260731170000 (~69 rows), 20260806180000 (13 rows).
DELETE FROM audit_log
WHERE  table_name = 'attendance'
  AND  operation  = 'UPDATE'
  AND  (created_at AT TIME ZONE 'Asia/Karachi')::time BETWEEN '23:58' AND '23:59:59'
  AND  changed_fields <@ ARRAY['check_out','excluded_minutes','updated_at']
  AND  changed_fields @> ARRAY['check_out','updated_at'];
