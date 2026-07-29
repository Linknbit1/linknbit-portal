-- Phase 2, batch 1: convert the role-based policies whose role set matches an
-- existing permission EXACTLY.
--
-- Only these are safe to convert mechanically. A policy naming
-- {super_admin, admin, project_manager} must NOT be swapped for
-- can_manage_projects, because team_lead also holds that permission and would
-- silently gain write access. Those cases need a decision (and in most cases a
-- new permission key), and are listed in docs/permission-model-v2.md.
--
-- The rewrite is a surgical substitution: the `current_user_role() = ANY(...)`
-- sub-expression is replaced with has_feature('<key>') and every other clause
-- in the policy is preserved verbatim. Nothing is hand-retyped, so a policy
-- cannot lose a condition through transcription error.
--
-- Expected access change: NONE. The RLS golden baseline must be unchanged.

do $$
declare
  m        record;
  pol      record;
  v_qual   text;
  v_check  text;
  v_roles  text;
  v_cmd    text;
  v_sql    text;
  v_pat    constant text := '\(current_user_role\(\) = ANY \(ARRAY\[[^\]]*\]\)\)';
  v_count  int := 0;
begin
  for m in
    select * from (values
      -- Governance
      ('role_feature_flags', 'p_rff_admin_write',                 'can_manage_roles'),
      ('impersonation_log',  'p_impersonation_log_read',          'can_view_audit_log'),
      -- Standups
      ('standups',           'p_standups_admin_write',            'can_manage_standups'),
      ('standup_entries',    'p_standup_entries_admin_write',     'can_manage_standups'),
      -- People
      ('designations',       'p_designations_write',              'can_manage_people'),
      ('teams',              'p_teams_admin_write',               'can_manage_people'),
      ('team_members',       'p_team_members_write',              'can_manage_people'),
      -- Attendance
      ('attendance',            'p_attendance_admin',                  'can_view_all_attendance'),
      ('attendance',            'p_attendance_admin_write',            'can_manage_attendance'),
      ('attendance_exceptions', 'p_exc_admin_select',                  'can_view_all_attendance'),
      ('attendance_settings',   'p_attendance_settings_write',         'can_manage_attendance'),
      ('leave_types',           'p_leave_types_write',                 'can_manage_attendance'),
      ('enrolled_devices',      'p_enrolled_devices_admin_select',     'can_manage_attendance'),
      ('enrolled_devices',      'p_enrolled_devices_admin_write',      'can_manage_attendance')
    ) as t(tbl, pol, key)
  loop
    select qual, with_check, cmd, roles, permissive
      into pol
      from pg_policies
     where schemaname = 'public' and tablename = m.tbl and policyname = m.pol;

    if not found then
      raise notice 'skipping %.% (not found)', m.tbl, m.pol;
      continue;
    end if;

    v_qual  := regexp_replace(coalesce(pol.qual, ''),       v_pat, format('has_feature(%L)', m.key), 'g');
    v_check := regexp_replace(coalesce(pol.with_check, ''), v_pat, format('has_feature(%L)', m.key), 'g');

    -- Refuse to proceed if the pattern did not actually match: a silent no-op
    -- here would leave a policy role-based while the migration claims otherwise.
    if coalesce(pol.qual, '') = v_qual and coalesce(pol.with_check, '') = v_check then
      raise exception 'no role expression matched in %.% - aborting', m.tbl, m.pol;
    end if;

    v_roles := array_to_string(pol.roles, ', ');
    v_cmd   := case pol.cmd
                 when 'ALL' then 'all' when 'SELECT' then 'select'
                 when 'INSERT' then 'insert' when 'UPDATE' then 'update'
                 when 'DELETE' then 'delete' end;

    v_sql := format('drop policy if exists %I on public.%I', m.pol, m.tbl);
    execute v_sql;

    v_sql := format('create policy %I on public.%I as %s for %s to %s',
                    m.pol, m.tbl,
                    case when pol.permissive = 'PERMISSIVE' then 'permissive' else 'restrictive' end,
                    v_cmd, v_roles);
    if nullif(v_qual, '')  is not null then v_sql := v_sql || format(' using (%s)', v_qual); end if;
    if nullif(v_check, '') is not null then v_sql := v_sql || format(' with check (%s)', v_check); end if;

    execute v_sql;
    v_count := v_count + 1;
  end loop;

  raise notice 'converted % policies to has_feature()', v_count;
end $$;
