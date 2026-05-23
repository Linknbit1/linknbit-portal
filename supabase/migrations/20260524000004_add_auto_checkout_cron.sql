-- Auto-checkout function: finds today's check-ins without a check-out and
-- sets check_out to work_end_time in the configured office timezone.
CREATE OR REPLACE FUNCTION fn_auto_checkout_missing()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_settings    attendance_settings%ROWTYPE;
  v_today       date;
  v_checkout_ts timestamptz;
BEGIN
  SELECT * INTO v_settings FROM attendance_settings;

  -- Today's date in the office timezone
  v_today := (NOW() AT TIME ZONE v_settings.timezone)::date;

  -- Checkout timestamp: end-of-workday in office timezone converted to UTC for storage
  v_checkout_ts := (v_today::text || ' ' || v_settings.work_end_time)::timestamp
                   AT TIME ZONE v_settings.timezone;

  UPDATE attendance
  SET    check_out  = v_checkout_ts,
         updated_at = NOW()
  WHERE  date      = v_today
    AND  check_in  IS NOT NULL
    AND  check_out IS NULL;
END;
$$;

-- Schedule: 23:59 Asia/Karachi = 18:59 UTC (PKT is UTC+5, no DST)
SELECT cron.schedule(
  'auto-checkout-missing',
  '59 18 * * *',
  'SELECT fn_auto_checkout_missing()'
);
