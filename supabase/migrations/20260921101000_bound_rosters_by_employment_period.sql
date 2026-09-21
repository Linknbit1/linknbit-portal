-- Bound every roster by the employment period, not by is_active.
--
-- Companion to 20260921100000. That migration added joined_on/left_on; this one
-- makes the functions that decide "who counts" actually read them.
--
-- fn_employed_on(profile, date) is the single predicate. It replaces `p.is_active`
-- in the roster functions, because those ask a question about a DATE and is_active
-- is a fact about now. The two only ever agreed by accident.
--
-- trg_profiles_stamp_left_on stamps left_on when somebody is deactivated and clears
-- it when they are reactivated — but only when the same statement did not set
-- left_on itself, so an HR correction still wins. Without it, deactivating without
-- a leaving date would leave that person on today's roster forever.
--
-- Verified on live data after applying:
--   * day_roster('2026-09-18') no longer lists Nasir Hussain (joined 21 Sep);
--     day_roster('2026-09-21') does. Roster 17 then, 18 now.
--   * standup_roster('2026-09-18') excludes him too.
--   * Mirror bug fixed: Saleha Ali and Mahnoor Khalid, both departed, appear again
--     on 2026-08-01 when they were employed, and not on today's roster.
--
-- No cleanup needed afterwards: joined_on was derived from the attendance itself,
-- so no attendance row falls outside anybody's period in either direction.

CREATE OR REPLACE FUNCTION public.fn_employed_on(p_profile uuid, p_date date)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
     WHERE p.id = p_profile
       AND p.joined_on <= p_date
       AND (p.left_on IS NULL OR p_date <= p.left_on)
  );
$function$;

CREATE OR REPLACE FUNCTION public.fn_stamp_left_on()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.is_active AND NOT NEW.is_active AND NEW.left_on IS NULL THEN
    NEW.left_on := GREATEST(NEW.joined_on, CURRENT_DATE);
  ELSIF NOT OLD.is_active AND NEW.is_active AND NEW.left_on IS NOT NULL
        AND NEW.left_on IS NOT DISTINCT FROM OLD.left_on THEN
    NEW.left_on := NULL;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_profiles_stamp_left_on ON public.profiles;
CREATE TRIGGER trg_profiles_stamp_left_on
  BEFORE UPDATE OF is_active ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION fn_stamp_left_on();

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

  -- The unworked half of a half-day leave asks the same question and gets the
  -- same answer: it is only an absence for somebody the office expected to see.
  UPDATE attendance a
  SET status = 'absent', updated_at = now()
  WHERE a.date = d
    AND a.status IS NULL
    AND a.check_in IS NULL
    AND a.day_type = 'leave'
    AND a.day_part <> 'full'
    AND fn_employed_on(a.profile_id, d)
    AND fn_unmarked_day_type(a.profile_id) = 'absent';
END;
$function$;

CREATE OR REPLACE FUNCTION public.standup_roster(p_date date)
 RETURNS TABLE(profile_id uuid, name text, avatar_url text, role text, standup_id uuid, submitted_at timestamp with time zone, is_late boolean, on_leave boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    p.id, p.name, p.avatar_url, p.role,
    st.id, st.submitted_at, st.is_late,
    EXISTS (SELECT 1 FROM attendance a
             WHERE a.profile_id = p.id AND a.date = p_date
               AND a.day_type IN ('leave', 'holiday') AND a.day_part = 'full')
  FROM profiles p
  LEFT JOIN standups st ON st.profile_id = p.id AND st.standup_date = p_date
  WHERE fn_employed_on(p.id, p_date)
    AND fn_standup_participant(p.id)
    AND (
      has_feature('can_view_standups')
      OR (has_feature('can_view_team_standups') AND shares_team_with(p.id))
    )
  ORDER BY (st.id IS NOT NULL), p.name
$function$;

CREATE OR REPLACE FUNCTION public.bd_update_roster(p_date date)
 RETURNS TABLE(profile_id uuid, profile_name text, avatar_url text, is_required boolean, is_working_day boolean, update_id uuid, submitted_at timestamp with time zone, summary text, platforms text[], proposals_sent integer, calls_made integer, meetings_held integer, leads_added integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id, p.name, p.avatar_url,
         true,
         fn_is_working_day_for(p.id, p_date),
         u.id, u.submitted_at, u.summary,
         u.platforms, u.proposals_sent, u.calls_made, u.meetings_held, u.leads_added
    FROM profiles p
    LEFT JOIN bd_daily_updates u
      ON u.rep_id = p.id AND u.update_date = p_date
   WHERE fn_employed_on(p.id, p_date)
     AND fn_bd_update_required(p.id)
     AND (p.id = (select auth.uid()) OR has_feature('can_view_bd_team_updates'))
   ORDER BY (u.submitted_at IS NULL) DESC, p.name;
$function$;
