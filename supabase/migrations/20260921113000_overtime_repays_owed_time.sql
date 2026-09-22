-- Approved overtime finally counts for something.
--
-- 24 overtime requests had been approved. The only code in the database that
-- touched overtime_requests was the audit trigger. It added no hours, reduced no
-- debt, earned no points and reached no payroll: somebody asked to work late, a
-- manager agreed, and the system forgot.
--
-- Meanwhile the reverse worked. Leave early on an approved exception and
-- fn_unpaid_exception_minutes recorded the time owed. The ledger ran one way —
-- you could fall behind, never get ahead.
--
-- The old "made up" side counted standup minutes logged ABOVE the required day.
-- That was already circular (the only way to clear a debt was to type a bigger
-- number into the form) and 20260921110000 removed the requirement those minutes
-- were measured against, so it now means nothing at all.
--
-- Repaid time is therefore approved overtime: a fact a manager signed off, on a
-- date, in hours — not a self-reported figure. Owed still comes from approved
-- exceptions. Both sides of the ledger are now somebody's decision.
--
-- Effect on live data: six people who had logged approved overtime now show it
-- against their balance; khizer hayat's 60 owed minutes are cleared by 1,170
-- minutes of approved overtime. Five people with owed time and no overtime are
-- unchanged.

CREATE OR REPLACE FUNCTION public.fn_makeup_balance(p_profile uuid, p_from date, p_to date)
 RETURNS TABLE(owed_minutes integer, made_up_minutes integer, balance_minutes integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH owed AS (
    SELECT COALESCE(SUM(fn_unpaid_exception_minutes(p_profile, d::date)), 0)::int AS mins
      FROM generate_series(p_from, p_to, interval '1 day') d
  ),
  made AS (
    SELECT COALESCE(SUM(ROUND(o.hours * 60)), 0)::int AS mins
      FROM overtime_requests o
     WHERE o.profile_id = p_profile
       AND o.status     = 'approved'
       AND o.date BETWEEN p_from AND p_to
  )
  SELECT owed.mins,
         made.mins,
         GREATEST(0, owed.mins - made.mins)::int
    FROM owed, made;
$function$;
