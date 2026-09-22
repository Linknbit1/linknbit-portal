-- Auto-checkout now closes days it missed, not just today.
--
-- The job only ever looked at the current date. If it did not run one evening —
-- or ran before somebody's last check-in — that row stayed open for good: a
-- check-in, no check-out, and therefore zero hours in every report that reads
-- the pair. 19 days were sitting like that, going back weeks. Nothing would ever
-- have picked them up.
--
-- Past days are closed at their OWN day's end, not today's, or a day missed in
-- August would record a fourteen-hour shift. Bounded to 90 days so a first run
-- after a long gap cannot rewrite the whole year.
--
-- They are also marked. A check-out nobody recorded is a guess, and a reader
-- looking at 18:00 on a row deserves to know whether somebody pressed a button or
-- the system assumed. Any existing note wins — the assumption is the least
-- interesting thing that could be said about the day.

CREATE OR REPLACE FUNCTION public.fn_auto_checkout_missing()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_settings    attendance_settings%ROWTYPE;
  v_today       date;
  v_checkout_ts timestamptz;
BEGIN
  SELECT * INTO v_settings FROM attendance_settings;

  IF NOT v_settings.auto_checkout THEN
    RETURN;
  END IF;

  PERFORM set_config('app.audit_suppress', 'on', true);

  v_today := (NOW() AT TIME ZONE v_settings.timezone)::date;

  v_checkout_ts := (v_today::text || ' ' || v_settings.work_end_time)::timestamp
                   AT TIME ZONE v_settings.timezone;

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

  UPDATE attendance a
  SET    check_out  = (a.date::text || ' ' || v_settings.work_end_time)::timestamp
                      AT TIME ZONE v_settings.timezone,
         note       = COALESCE(NULLIF(a.note, ''), 'No check-out recorded; assumed end of day'),
         updated_at = NOW()
  WHERE  a.date      < v_today
    AND  a.date     >= v_today - 90
    AND  a.check_in  IS NOT NULL
    AND  a.check_out IS NULL;
END;
$function$;

-- Close the 19 that had been open since before this fix.
SELECT public.fn_auto_checkout_missing();
