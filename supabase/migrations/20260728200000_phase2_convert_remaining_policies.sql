-- Phase 2, batch 2b: convert the remaining role-based policies.
--
-- Uses the keys minted in 20260728190000, each seeded to the exact role set the
-- policy names today, so access is unchanged. The RLS golden baseline must come
-- out byte-identical.
--
-- Three policies are rewritten explicitly rather than by substitution:
--   * monthly_lp_history.p_mlh_admin and reward_redemptions.p_redemptions_admin
--     read `can_govern_gamification() OR role = 'finance'`, which is exactly the
--     membership of can_fulfill_payouts.
--   * enrolled_devices.p_enrolled_devices_admin_write carries a dead
--     `OR (role = 'hr' AND ...)` branch - HR already satisfies the first
--     disjunct via can_manage_attendance, so the branch can never be reached.
--
-- profiles.p_profiles_self_update is deliberately left alone: it calls
-- current_user_role() without naming a role, as a self-escalation guard.

do $$
declare
  m       record;
  pol     record;
  v_qual  text;
  v_check text;
  v_sql   text;
  -- Both syntactic forms the role checks appear in.
  v_pat_any constant text := '\(current_user_role\(\) = ANY \(ARRAY\[[^\]]*\]\)\)';
  v_pat_eq  constant text := '\(current_user_role\(\) = ''[a-z_]+''::text\)';
  v_count int := 0;
begin
  for m in
    select * from (values
      -- Delivery writes: {super_admin, admin, project_manager}
      ('approvals',            'p_approvals_insert',            'can_edit_delivery'),
      ('attachments',          'p_attachments_delete',          'can_edit_delivery'),
      ('attachments',          'p_attachments_insert',          'can_edit_delivery'),
      ('attachments',          'p_attachments_update',          'can_edit_delivery'),
      ('mentions',             'p_mentions_insert',             'can_edit_delivery'),
      ('project_watchers',     'p_project_watchers_delete',     'can_edit_delivery'),
      ('project_watchers',     'p_project_watchers_insert',     'can_edit_delivery'),
      ('stages',               'p_stages_delete',               'can_edit_delivery'),
      ('stages',               'p_stages_insert',               'can_edit_delivery'),
      ('stages',               'p_stages_update',               'can_edit_delivery'),
      ('tasks',                'p_tasks_insert',                'can_edit_delivery'),
      ('tasks',                'p_tasks_update',                'can_edit_delivery'),
      -- Cross-project reads: {super_admin, admin, project_manager, finance}
      ('approvals',            'p_approvals_internal_select',   'can_view_all_projects'),
      ('attachments',          'p_attachments_internal_select', 'can_view_all_projects'),
      ('mentions',             'p_mentions_select',             'can_view_all_projects'),
      ('projects',             'p_projects_internal_select',    'can_view_all_projects'),
      ('stages',               'p_stages_internal_select',      'can_view_all_projects'),
      ('tasks',                'p_tasks_internal_select',       'can_view_all_projects'),
      -- Team-scoped attendance
      ('attendance',            'p_attendance_team',            'can_view_team_attendance'),
      ('attendance_exceptions', 'p_exc_team',                   'can_view_team_attendance'),
      ('leave_requests',        'p_leave_team',                 'can_view_team_attendance'),
      ('overtime_requests',     'p_ot_team',                    'can_view_team_attendance'),
      ('wfh_requests',          'p_wfh_team',                   'can_view_team_attendance'),
      -- Attendance record deletion: {super_admin, admin}
      ('attendance_exceptions', 'p_exc_delete',                 'can_delete_attendance_records'),
      ('leave_requests',        'p_leave_delete',               'can_delete_attendance_records'),
      ('overtime_requests',     'p_ot_delete',                  'can_delete_attendance_records'),
      ('wfh_requests',          'p_wfh_delete',                 'can_delete_attendance_records'),
      -- Compensation: {super_admin, admin, hr}
      ('employee_salaries',    'p_salary_select',               'can_view_salaries'),
      ('employee_salaries',    'p_salary_insert',               'can_view_salaries'),
      ('employee_salaries',    'p_salary_update',               'can_view_salaries'),
      -- Standups
      ('standup_entries',      'p_standup_entries_select',      'can_view_standups'),
      ('standups',             'p_standups_select',             'can_view_standups'),
      -- Remaining {super_admin, admin} singletons
      ('comments',             'p_comments_delete',             'can_moderate_comments'),
      ('comments',             'p_comments_update',             'can_moderate_comments'),
      ('services',             'p_services_write',              'can_manage_services'),
      ('profiles',             'p_profiles_admin_update',       'can_edit_any_profile'),
      ('job_type_policies',    'p_job_type_policies_write',     'can_manage_job_types'),
      ('reward_redemptions',   'p_redemptions_admin_update',    'can_manage_redemptions'),
      ('clients',              'p_clients_internal_select',     'can_manage_clients'),
      -- Equality form
      ('levels',               'p_levels_admin_write',          'can_manage_levels')
    ) as t(tbl, pol, key)
  loop
    select qual, with_check, cmd, roles, permissive
      into pol
      from pg_policies
     where schemaname = 'public' and tablename = m.tbl and policyname = m.pol;

    if not found then
      raise exception 'policy %.% not found', m.tbl, m.pol;
    end if;

    v_qual  := regexp_replace(coalesce(pol.qual, ''),       v_pat_any, format('has_feature(%L)', m.key), 'g');
    v_qual  := regexp_replace(v_qual,                       v_pat_eq,  format('has_feature(%L)', m.key), 'g');
    v_check := regexp_replace(coalesce(pol.with_check, ''), v_pat_any, format('has_feature(%L)', m.key), 'g');
    v_check := regexp_replace(v_check,                      v_pat_eq,  format('has_feature(%L)', m.key), 'g');

    if coalesce(pol.qual, '') = v_qual and coalesce(pol.with_check, '') = v_check then
      raise exception 'no role expression matched in %.% - aborting', m.tbl, m.pol;
    end if;

    execute format('drop policy if exists %I on public.%I', m.pol, m.tbl);

    v_sql := format('create policy %I on public.%I as %s for %s to %s',
                    m.pol, m.tbl,
                    case when pol.permissive = 'PERMISSIVE' then 'permissive' else 'restrictive' end,
                    case pol.cmd
                      when 'ALL' then 'all' when 'SELECT' then 'select'
                      when 'INSERT' then 'insert' when 'UPDATE' then 'update'
                      when 'DELETE' then 'delete' end,
                    array_to_string(pol.roles, ', '));
    if nullif(v_qual, '')  is not null then v_sql := v_sql || format(' using (%s)', v_qual); end if;
    if nullif(v_check, '') is not null then v_sql := v_sql || format(' with check (%s)', v_check); end if;

    execute v_sql;
    v_count := v_count + 1;
  end loop;

  raise notice 'converted % policies', v_count;
end $$;

-- ── Explicit rewrites ────────────────────────────────────────────────────────

-- can_govern_gamification() OR role='finance' is exactly can_fulfill_payouts.
drop policy if exists p_mlh_admin on monthly_lp_history;
create policy p_mlh_admin on monthly_lp_history
  for select to authenticated
  using (has_feature('can_fulfill_payouts'));

drop policy if exists p_redemptions_admin on reward_redemptions;
create policy p_redemptions_admin on reward_redemptions
  for select to authenticated
  using (has_feature('can_fulfill_payouts'));

-- The `OR (role='hr' AND ...)` branch is unreachable: HR holds
-- can_manage_attendance, so the first disjunct is already true for them.
drop policy if exists p_enrolled_devices_admin_write on enrolled_devices;
create policy p_enrolled_devices_admin_write on enrolled_devices
  for update to authenticated
  using (has_feature('can_manage_attendance'))
  with check (has_feature('can_manage_attendance'));
