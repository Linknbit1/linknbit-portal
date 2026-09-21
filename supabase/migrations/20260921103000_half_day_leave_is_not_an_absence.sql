-- A half-day leave without a check-in is blank, not an absence.
--
-- The old rule, in fn_mark_absent_for_date, said the unworked half of a half-day
-- leave counted as an absence for anyone the office expected to see. It fired on
-- exactly one row in the entire database.
--
-- 18 rows match that situation exactly — half-day leave, on-site job type, no
-- check-in. 17 read blank, 1 read 'absent'. The difference was timing and nothing
-- else: the nightly job only runs for the current day, so the mark only stuck when
-- the job ran on a day that had no leave recorded yet, and the leave was approved
-- afterwards. 16 of the 17 blanks came from the 19 June 2026 bulk import and never
-- passed through the job at all. The two genuine live cases disagreed with each
-- other: Zain Malik 14 Jul (approved same day) blank, Yasir Birlas 28 Aug
-- (approved 3 days later) absent.
--
-- Decision: blank. It matches what 17 of 18 rows already said and what the team has
-- been reading all year, and the alternative would retroactively mark 17 half-days
-- as absences, moving XP and attendance figures people have already acted on.
--
-- Three changes so it cannot drift back:
--   1. fn_mark_absent_for_date no longer marks the unworked half.
--   2. fn_sync_leave_to_attendance recomputes status on conflict instead of
--      preserving whatever was there. Its ELSE branch used to keep the old value,
--      which is precisely how an absence survived a later approval.
--   3. fn_sync_wfh_to_attendance had the same latent bug from the other side: its
--      ON CONFLICT never touched status at all, so approving WFH over an existing
--      absent row left the absence in place. No live rows hit it yet; fixed anyway.
--
-- The data fix at the end covers leave and WFH, half days only, and only where
-- there is no check-in to contradict it.

CREATE OR REPLACE FUNCTION public.fn_mark_absent_for_date(d date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO attendance (profile_id, date, status, day_type, day_part, source, note)
  SELECT p.id, d,
         CASE WHEN u.kind = 'wfh' THEN NULL  ELSE 'absent' END,
         CASE WHEN u.kind = 'wfh' THEN 'wfh' ELSE 'work'   END,
         'full', 'system',
         CASE WHEN u.kind = 'wfh' THEN 'Remote (no office check-in)' END
  FROM profiles p
  CROSS JOIN LATERAL (SELECT fn_unmarked_day_type(p.id) AS kind) u
  WHERE p.is_active
    AND is_internal_profile(p.id)
    AND fn_employed_on(p.id, d)
    AND p.schedule_mode <> 'flexible'
    AND fn_is_working_day_for(p.id, d)
    AND NOT EXISTS (SELECT 1 FROM attendance a WHERE a.profile_id = p.id AND a.date = d)
  ON CONFLICT (profile_id, date) DO NOTHING;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_sync_leave_to_attendance()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_type_name text;
BEGIN
  IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') AND OLD.status = 'approved' THEN
    UPDATE attendance
    SET day_type = 'work', day_part = 'full', note = NULL, updated_at = now()
    WHERE profile_id = OLD.profile_id
      AND date BETWEEN OLD.start_date AND OLD.end_date
      AND day_type = 'leave';

    DELETE FROM attendance
    WHERE profile_id = OLD.profile_id
      AND date BETWEEN OLD.start_date AND OLD.end_date
      AND source = 'system' AND check_in IS NULL AND status IS NULL;

    UPDATE attendance
    SET status = fn_arrival_status(check_in, 'full'), updated_at = now()
    WHERE profile_id = OLD.profile_id
      AND date BETWEEN OLD.start_date AND OLD.end_date
      AND check_in IS NOT NULL AND status IS NOT NULL AND day_part = 'full';
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;

  IF NEW.status = 'approved' THEN
    SELECT name INTO v_type_name FROM leave_types WHERE id = NEW.leave_type_id;

    INSERT INTO attendance (profile_id, date, day_type, day_part, status, source, marked_by, note)
    SELECT NEW.profile_id, g.d::date, 'leave', NEW.day_part, NULL, 'system', NEW.reviewed_by,
           COALESCE(v_type_name, 'Leave')
           || CASE NEW.day_part
                WHEN 'first_half'  THEN ' (first half)'
                WHEN 'second_half' THEN ' (second half)'
                ELSE ''
              END
    FROM generate_series(NEW.start_date, NEW.end_date, interval '1 day') g(d)
    WHERE fn_is_working_day_for(NEW.profile_id, g.d::date)
    ON CONFLICT (profile_id, date) DO UPDATE
      SET day_type = 'leave',
          day_part = EXCLUDED.day_part,
          marked_by = EXCLUDED.marked_by,
          note = EXCLUDED.note,
          status = CASE
                     WHEN EXCLUDED.day_part = 'full' THEN NULL
                     WHEN attendance.check_in IS NOT NULL
                       THEN fn_arrival_status(attendance.check_in, EXCLUDED.day_part)
                     ELSE NULL
                   END,
          check_in = CASE WHEN EXCLUDED.day_part = 'full' THEN NULL ELSE attendance.check_in END,
          check_out = CASE WHEN EXCLUDED.day_part = 'full' THEN NULL ELSE attendance.check_out END,
          updated_at = now();
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_sync_wfh_to_attendance()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') AND OLD.status = 'approved' THEN
    UPDATE attendance a
    SET day_type = CASE
          WHEN EXISTS (SELECT 1 FROM company_wfh_days c WHERE c.date = a.date)
          THEN 'wfh' ELSE 'work' END,
        day_part = 'full',
        updated_at = now()
    WHERE a.profile_id = OLD.profile_id
      AND a.date BETWEEN OLD.start_date AND OLD.end_date
      AND a.day_type = 'wfh';

    DELETE FROM attendance a
    WHERE a.profile_id = OLD.profile_id
      AND a.date BETWEEN OLD.start_date AND OLD.end_date
      AND a.source = 'system' AND a.day_type = 'work'
      AND a.check_in IS NULL AND a.status IS NULL;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;

  IF NEW.status = 'approved' THEN
    INSERT INTO attendance (profile_id, date, day_type, day_part, status, source, marked_by, note)
    SELECT NEW.profile_id, g.d::date, 'wfh', NEW.day_part, NULL, 'system', NEW.reviewed_by,
           'Work from home'
           || CASE NEW.day_part
                WHEN 'first_half'  THEN ' (first half)'
                WHEN 'second_half' THEN ' (second half)'
                ELSE ''
              END
    FROM generate_series(NEW.start_date, NEW.end_date, interval '1 day') g(d)
    WHERE fn_is_working_day_for(NEW.profile_id, g.d::date)
    ON CONFLICT (profile_id, date) DO UPDATE
      SET day_type = 'wfh',
          day_part = EXCLUDED.day_part,
          marked_by = EXCLUDED.marked_by,
          note = EXCLUDED.note,
          status = CASE WHEN attendance.check_in IS NULL THEN NULL ELSE attendance.status END,
          updated_at = now()
      WHERE attendance.day_type <> 'leave';
  END IF;
  RETURN NEW;
END;
$function$;

UPDATE attendance
   SET status = NULL, updated_at = now()
 WHERE day_type IN ('leave', 'wfh')
   AND day_part <> 'full'
   AND check_in IS NULL
   AND status = 'absent';
