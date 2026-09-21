-- Second half of the employment-period change: day_roster, month_roster and
-- report_employee_backlog.
--
-- Split from 20260921101000 only because the three bodies here are long; it is one
-- logical change with that migration and they were applied together.
--
-- day_roster and month_roster also pick up the (select auth.uid()) wrapping from
-- 20260921094000 — CREATE OR REPLACE rewrites the body, so the bare auth.uid()
-- would otherwise creep back into these three functions.
--
-- month_roster and report_employee_backlog take a RANGE, so they test overlap with
-- the employment period rather than a single day: joined_on <= p_to AND (left_on IS
-- NULL OR left_on >= p_from). report_employee_backlog additionally tests each day
-- inside its `owed` sum, so a person who joined mid-period is not charged required
-- minutes for the days before they started.

CREATE OR REPLACE FUNCTION public.day_roster(p_date date)
 RETURNS TABLE(profile_id uuid, name text, avatar_url text, role text, job_title text, team_names text[], status text, day_part text, is_late boolean, check_in timestamp with time zone, check_out timestamp with time zone, leave_type text, leave_color text, holiday_name text, company_wfh text, detail_visible boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_manage boolean; v_holiday text; v_company_wfh text; v_non_working boolean;
begin
  if not is_internal() then raise exception 'day_roster: internal users only'; end if;
  v_manage := has_feature('can_manage_attendance');
  select h.name into v_holiday from holidays h
   where h.date = p_date and h.type in ('public_holiday','company_off') limit 1;
  select c.reason into v_company_wfh from company_wfh_days c where c.date = p_date limit 1;
  select case extract(isodow from p_date)
           when 7 then true
           when 6 then not (s.saturday_working
                            or exists (select 1 from working_saturdays w where w.date = p_date))
           else false end
    into v_non_working from attendance_settings s where s.singleton;

  return query
  select p.id, p.name, p.avatar_url, p.role, p.job_title,
    coalesce(tm.names, '{}'::text[]),
    case
      when v_holiday is not null          then 'holiday'
      when a.day_type = 'holiday'         then 'holiday'
      when a.day_type = 'leave'           then 'leave'
      when a.day_type = 'wfh'             then 'wfh'
      when a.check_in is not null         then 'in_office'
      when v_company_wfh is not null      then 'wfh'
      when coalesce(v_non_working, false) then 'off'
      else                                     'not_checked_in'
    end::text,
    coalesce(a.day_part, 'full'),
    case when vis.ok then a.status = 'late' end,
    case when vis.ok then a.check_in end,
    case when vis.ok then a.check_out end,
    case when vis.ok then lv.name end,
    lv.color, v_holiday, v_company_wfh, vis.ok
  from profiles p
  cross join lateral (
    select (coalesce(v_manage, false)
            or p.id is not distinct from (select auth.uid())
            or coalesce(shares_team_with(p.id), false)) as ok
  ) vis
  left join attendance a on a.profile_id = p.id and a.date = p_date
  left join lateral (
    select lt.name, lt.color from leave_requests lr
      join leave_types lt on lt.id = lr.leave_type_id
     where lr.profile_id = p.id and lr.status = 'approved'
       and p_date between lr.start_date and lr.end_date limit 1
  ) lv on true
  left join lateral (
    select array_agg(t.name order by t.name) as names
      from team_members m join teams t on t.id = m.team_id
     where m.profile_id = p.id
  ) tm on true
  where fn_employed_on(p.id, p_date)
    and not p.attendance_excluded
    and p.role not in ('client_owner','client_member')
  order by p.name;
end;
$function$;

CREATE OR REPLACE FUNCTION public.month_roster(p_from date, p_to date)
 RETURNS TABLE(entry_id uuid, profile_id uuid, name text, avatar_url text, kind text, status text, start_date date, end_date date, day_part text, label text, label_color text, exception_type text, requested_time time without time zone, return_time time without time zone, detail_visible boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_manage boolean;
BEGIN
  IF NOT is_internal() THEN
    RAISE EXCEPTION 'month_roster: internal users only';
  END IF;

  IF p_to < p_from OR p_to - p_from > 366 THEN
    RAISE EXCEPTION 'month_roster: span must be between 0 and 366 days';
  END IF;

  v_manage := has_feature('can_view_all_attendance');

  RETURN QUERY
  SELECT
    lr.id, p.id, p.name, p.avatar_url,
    'leave'::text, lr.status, lr.start_date, lr.end_date, lr.day_part,
    CASE WHEN vis.ok THEN lt.name END,
    CASE WHEN vis.ok THEN lt.color END,
    NULL::text, NULL::time, NULL::time,
    vis.ok
  FROM leave_requests lr
  JOIN profiles p ON p.id = lr.profile_id
  LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id
  CROSS JOIN LATERAL (
    SELECT (coalesce(v_manage, false)
            OR p.id IS NOT DISTINCT FROM (select auth.uid())
            OR coalesce(shares_team_with(p.id), false)) AS ok
  ) vis
  WHERE lr.status IN ('approved', 'pending')
    AND p.joined_on <= p_to AND (p.left_on IS NULL OR p.left_on >= p_from)
    AND lr.start_date <= p_to
    AND lr.end_date >= p_from

  UNION ALL

  SELECT
    wr.id, p.id, p.name, p.avatar_url,
    'wfh'::text, wr.status, wr.start_date, wr.end_date, wr.day_part,
    NULL::text, NULL::text, NULL::text, NULL::time, NULL::time,
    (coalesce(v_manage, false)
     OR p.id IS NOT DISTINCT FROM (select auth.uid())
     OR coalesce(shares_team_with(p.id), false))
  FROM wfh_requests wr
  JOIN profiles p ON p.id = wr.profile_id
  WHERE wr.status IN ('approved', 'pending')
    AND p.joined_on <= p_to AND (p.left_on IS NULL OR p.left_on >= p_from)
    AND wr.start_date <= p_to
    AND wr.end_date >= p_from

  UNION ALL

  SELECT
    ae.id, p.id, p.name, p.avatar_url,
    'exception'::text, ae.status, ae.date, ae.date, 'full'::text,
    NULL::text, NULL::text,
    ae.exception_type, ae.requested_time, ae.return_time,
    true
  FROM attendance_exceptions ae
  JOIN profiles p ON p.id = ae.profile_id
  WHERE ae.status IN ('approved', 'pending')
    AND p.joined_on <= p_to AND (p.left_on IS NULL OR p.left_on >= p_from)
    AND ae.date BETWEEN p_from AND p_to
    AND (coalesce(v_manage, false)
         OR p.id IS NOT DISTINCT FROM (select auth.uid())
         OR coalesce(shares_team_with(p.id), false));
END;
$function$;

CREATE OR REPLACE FUNCTION public.report_employee_backlog(p_from date, p_to date)
 RETURNS TABLE(profile_id uuid, profile_name text, avatar_url text, role text, timer_minutes integer, standup_minutes integer, variance_minutes integer, standups_submitted integer, standups_late integer, required_minutes integer, projects integer, unpaid_minutes integer, made_up_minutes integer, makeup_balance_minutes integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_tz text; v_from timestamptz; v_to timestamptz;
BEGIN
  SELECT timezone INTO v_tz FROM attendance_settings LIMIT 1;
  v_from := (p_from::text || ' 00:00')::timestamp AT TIME ZONE v_tz;
  v_to   := ((p_to + 1)::text || ' 00:00')::timestamp AT TIME ZONE v_tz;

  RETURN QUERY
  WITH timer AS (
    SELECT te.profile_id,
           SUM(fn_clamped_minutes(te.started_at, te.ended_at, v_from, v_to))::int AS mins
      FROM task_time_entries te
     WHERE te.started_at < v_to AND COALESCE(te.ended_at, now()) > v_from
     GROUP BY te.profile_id
  ),
  sup AS (
    SELECT s.profile_id,
           SUM(se.minutes_spent)::int AS mins,
           COUNT(DISTINCT s.id)::int  AS submitted,
           COUNT(DISTINCT s.id) FILTER (WHERE s.is_late)::int AS late,
           COUNT(DISTINCT se.project_id)::int AS projects
      FROM standups s
      JOIN standup_entries se ON se.standup_id = s.id
     WHERE s.standup_date BETWEEN p_from AND p_to
     GROUP BY s.profile_id
  ),
  owed AS (
    SELECT pr.id AS profile_id,
           COALESCE(SUM(fn_standup_required_minutes(pr.id, d.day::date)), 0)::int AS mins
      FROM profiles pr
      CROSS JOIN generate_series(p_from, p_to, interval '1 day') AS d(day)
     WHERE pr.joined_on <= p_to AND (pr.left_on IS NULL OR pr.left_on >= p_from)
       AND fn_employed_on(pr.id, d.day::date)
     GROUP BY pr.id
  )
  SELECT pr.id, pr.name, pr.avatar_url, pr.role,
         COALESCE(ti.mins, 0), COALESCE(su.mins, 0),
         COALESCE(su.mins, 0) - COALESCE(ti.mins, 0),
         COALESCE(su.submitted, 0), COALESCE(su.late, 0),
         COALESCE(ow.mins, 0), COALESCE(su.projects, 0),
         mk.owed_minutes, mk.made_up_minutes, mk.balance_minutes
    FROM profiles pr
    LEFT JOIN timer ti ON ti.profile_id = pr.id
    LEFT JOIN sup   su ON su.profile_id = pr.id
    LEFT JOIN owed  ow ON ow.profile_id = pr.id
    CROSS JOIN LATERAL fn_makeup_balance(pr.id, p_from, p_to) mk
   WHERE pr.joined_on <= p_to AND (pr.left_on IS NULL OR pr.left_on >= p_from)
     AND pr.role NOT IN ('client_owner', 'client_member')
     AND fn_can_report_on(pr.id)
   ORDER BY COALESCE(su.mins, 0) + COALESCE(ti.mins, 0) DESC, pr.name;
END;
$function$;
