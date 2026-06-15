-- Team leads (and project managers) can already read their team's attendance rows
-- via p_attendance_team. Extend the same team-scoped, read-only visibility to the
-- related request tables so they can see their team's exceptions, WFH, overtime,
-- and leave. These policies are additive (OR'd with existing own/admin policies)
-- and grant SELECT only — approvals remain with HR/Admin.

-- Shared shape: viewer is a team_lead/PM AND the row's owner is in the viewer's team.
create policy p_exc_team on public.attendance_exceptions for select using (
  current_user_role() = any (array['team_lead', 'project_manager'])
  and exists (
    select 1 from public.profiles p
    where p.id = attendance_exceptions.profile_id
      and p.team_id is not null
      and p.team_id in (select team_id from public.profiles where id = auth.uid())
  )
);

create policy p_wfh_team on public.wfh_requests for select using (
  current_user_role() = any (array['team_lead', 'project_manager'])
  and exists (
    select 1 from public.profiles p
    where p.id = wfh_requests.profile_id
      and p.team_id is not null
      and p.team_id in (select team_id from public.profiles where id = auth.uid())
  )
);

create policy p_ot_team on public.overtime_requests for select using (
  current_user_role() = any (array['team_lead', 'project_manager'])
  and exists (
    select 1 from public.profiles p
    where p.id = overtime_requests.profile_id
      and p.team_id is not null
      and p.team_id in (select team_id from public.profiles where id = auth.uid())
  )
);

create policy p_leave_team on public.leave_requests for select using (
  current_user_role() = any (array['team_lead', 'project_manager'])
  and exists (
    select 1 from public.profiles p
    where p.id = leave_requests.profile_id
      and p.team_id is not null
      and p.team_id in (select team_id from public.profiles where id = auth.uid())
  )
);
