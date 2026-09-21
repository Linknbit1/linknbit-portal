-- Leave balances, computed server-side.
--
-- Two bugs, both only fixable away from the browser.
--
-- 1. A request spanning new year counted entirely against the year it STARTED in.
--    fetchMyLeaveBalances filtered `start_date` between Jan 1 and Dec 31, so leave
--    from 28 Dec to 4 Jan took all its days out of the old year's allowance and
--    none out of the new one. This counts each working day against the year that
--    day actually falls in, using the same fn_is_working_day_for rule the request's
--    own `days` total was built from, so the two never disagree.
--
-- 2. The per-profile version silently under-counted. It read leave_requests through
--    the viewer's own RLS, so somebody allowed to see only part of a colleague's
--    leave got a balance built from the rows they could see — with no hint it was
--    partial. The code comment even admitted it: "empty -> full allowance shown".
--    That is a wrong number presented as fact, on the screen where an approver
--    decides whether to grant more leave.
--
--    This returns the true figure to a viewer entitled to it and raises 42501
--    otherwise, so the UI can say "you can't see this" rather than quietly showing
--    something false. Entitled means: yourself, or can_view_all_attendance, or
--    can_manage_attendance, or can_view_team_attendance for somebody on your team.
--
-- The caller subtracts used from allowed and does NOT clamp at zero — S. Arooba is
-- 1.5 days past her casual allowance and now reads "1.5 over" instead of "0 left".

CREATE OR REPLACE FUNCTION public.leave_balances(p_profile uuid, p_year integer DEFAULT NULL)
RETURNS TABLE(leave_type_id uuid, type_name text, color text, days_allowed integer, used_days numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_year int;
  v_from date;
  v_to   date;
BEGIN
  IF NOT is_internal() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF NOT (
    p_profile = auth.uid()
    OR has_feature('can_view_all_attendance')
    OR has_feature('can_manage_attendance')
    OR (has_feature('can_view_team_attendance') AND shares_team_with(p_profile))
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  v_year := COALESCE(p_year, EXTRACT(year FROM (now() AT TIME ZONE 'Asia/Karachi'))::int);
  v_from := make_date(v_year, 1, 1);
  v_to   := make_date(v_year, 12, 31);

  RETURN QUERY
  SELECT
    lt.id, lt.name, lt.color, lt.days_allowed,
    COALESCE((
      SELECT SUM(
        (
          SELECT count(*)
            FROM generate_series(
                   GREATEST(lr.start_date, v_from),
                   LEAST(lr.end_date,   v_to),
                   interval '1 day') g(d)
           WHERE fn_is_working_day_for(p_profile, g.d::date)
        ) * CASE WHEN lr.day_part = 'full' THEN 1 ELSE 0.5 END
      )
      FROM leave_requests lr
     WHERE lr.profile_id    = p_profile
       AND lr.leave_type_id = lt.id
       AND lr.status        = 'approved'
       AND lr.start_date   <= v_to
       AND lr.end_date     >= v_from
    ), 0)::numeric
  FROM leave_types lt
  WHERE lt.is_active
  ORDER BY lt.name;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.leave_balances(uuid, integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.leave_balances(uuid, integer) TO authenticated;
