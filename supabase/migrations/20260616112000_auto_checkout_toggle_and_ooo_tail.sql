-- Make the end-of-day auto-checkout job configurable (it previously always ran), and
-- account for out-of-office (OOO) departures that never returned by excluding the away
-- time from worked hours before the auto-checkout writes work_end as the checkout.
ALTER TABLE attendance_settings
  ADD COLUMN auto_checkout boolean NOT NULL DEFAULT true;

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
