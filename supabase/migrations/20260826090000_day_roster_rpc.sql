-- Attendance "Today": one row per person expected at work on a given day, with
-- their presence already resolved server-side.
--
-- Answers in one round trip what Leave, WFH, Daily Records and the holiday
-- calendar answered in four: who is in the office, who is working from home,
-- who is off, and who has not checked in yet. The client previously had to
-- fetch and reconcile all four itself.
--
-- Visibility. Any internal user may read the roster — knowing who is in the
-- office today is not privileged, and hiding it is what forced people to ask in
-- chat. The *detail* behind a status is privileged: exact check-in/check-out
-- times, the late flag and the leave type come back only for yourself, for
-- people you share a team with, and for attendance managers. Everyone else sees
-- the coarse status and nothing more. `detail_visible` tells the UI which of
-- the two it is holding, so it never renders an empty column as "—".
--
-- Additive: a new function only. No existing column or signature changes, so a
-- deployed client that has never heard of it keeps working.

create or replace function public.day_roster(p_date date)
returns table (
  profile_id     uuid,
  name           text,
  avatar_url     text,
  role           text,
  job_title      text,
  team_names     text[],
  status         text,
  day_part       text,
  is_late        boolean,
  check_in       timestamptz,
  check_out      timestamptz,
  leave_type     text,
  leave_color    text,
  holiday_name   text,
  company_wfh    text,
  detail_visible boolean
)
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_manage      boolean;
  v_holiday     text;
  v_company_wfh text;
  v_non_working boolean;
begin
  if not is_internal() then
    raise exception 'day_roster: internal users only';
  end if;

  v_manage := has_feature('can_manage_attendance');

  select h.name into v_holiday
    from holidays h
   where h.date = p_date
     and h.type in ('public_holiday', 'company_off')
   limit 1;

  select c.reason into v_company_wfh
    from company_wfh_days c
   where c.date = p_date
   limit 1;

  -- Sunday is always off; Saturday is off unless the org works Saturdays or
  -- this particular one was declared a working Saturday. Without this the
  -- roster reports the entire company as "not checked in" every weekend.
  select case extract(isodow from p_date)
           when 7 then true
           when 6 then not (s.saturday_working
                            or exists (select 1 from working_saturdays w where w.date = p_date))
           else false
         end
    into v_non_working
    from attendance_settings s
   where s.singleton;

  return query
  select
    p.id,
    p.name,
    p.avatar_url,
    p.role,
    p.job_title,
    coalesce(tm.names, '{}'::text[]),
    -- Company-wide facts outrank the individual row: a public holiday is not a
    -- working day for anybody, so a stale WFH row from before the holiday was
    -- declared must not report one person as working while the office is shut.
    -- Below that the attendance row wins, because approved leave and WFH are
    -- synced into it as source='system' and it is the resolved truth for the day.
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
    -- The colour carries no detail on its own, and the calendar needs it to band
    -- a day even for a viewer who may not see which leave type it was.
    lv.color,
    v_holiday,
    v_company_wfh,
    vis.ok
  from profiles p
  cross join lateral (
    -- Every term is null-safe: a NULL from any one of them makes the whole OR
    -- NULL, and `detail_visible` would arrive as null rather than false — which
    -- the UI reads as "not yet loaded" instead of "not allowed". `= auth.uid()`
    -- is the subtle one: it yields NULL, not false, when there is no session.
    select (coalesce(v_manage, false)
            or p.id is not distinct from auth.uid()
            or coalesce(shares_team_with(p.id), false)) as ok
  ) vis
  left join attendance a
    on a.profile_id = p.id
   and a.date = p_date
  left join lateral (
    select lt.name, lt.color
      from leave_requests lr
      join leave_types lt on lt.id = lr.leave_type_id
     where lr.profile_id = p.id
       and lr.status = 'approved'
       and p_date between lr.start_date and lr.end_date
     limit 1
  ) lv on true
  left join lateral (
    select array_agg(t.name order by t.name) as names
      from team_members m
      join teams t on t.id = m.team_id
     where m.profile_id = p.id
  ) tm on true
  where p.is_active
    -- Contractors and anyone deliberately outside attendance tracking are not
    -- "missing" from the office; leaving them in would make the counters lie.
    and not p.attendance_excluded
    and p.role not in ('client_owner', 'client_member')
  order by p.name;
end;
$$;

comment on function public.day_roster(date) is
  'Resolved presence for every tracked person on p_date. Coarse status is visible to all internal users; times, late flag and leave type only to self, teammates and attendance managers.';

grant execute on function public.day_roster(date) to authenticated;
