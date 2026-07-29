-- Phase 2, batch 2c: FIX a regression introduced by 20260728200000.
--
-- Four policies contained TWO different role expressions - an unconditional
-- branch for one role set, and a narrower branch gated by a scoping predicate.
-- The regex substitution replaced both with the same key, which collapsed the
-- distinction and widened access:
--
--   * standups / standup_entries: {sa,admin,hr} unconditional OR
--     {pm,team_lead} AND shares_team_with(...). Both became can_view_standups,
--     so team leads and PMs matched the unconditional branch and could read
--     EVERY standup company-wide instead of only their team's.
--
--   * projects / tasks: (deleted_at IS NULL OR {sa,admin}) AND
--     ({sa,admin,pm,finance} OR member OR creator). Both became
--     can_view_all_projects, so project managers and finance gained visibility
--     of soft-deleted rows.
--
-- Original definitions were recovered from the pre-migration pg_dump.
-- Each branch now gets its own key, restoring the exact original access.

-- ── Keys for the previously-collapsed branches ───────────────────────────────
insert into permissions (key, label, category, sort_order, description) values
  ('can_view_deleted_projects', 'View deleted projects', 'Projects',  15, 'See soft-deleted projects and tasks.'),
  ('can_view_team_standups',    'View team standups',    'Standups',  62, 'Read standups for people who share a team with you.')
on conflict (key) do nothing;

update permissions
   set label = 'View all standups',
       description = 'Read every standup company-wide, not only your own team''s.'
 where key = 'can_view_standups';

insert into role_permissions (role_id, permission_key)
select r.id, 'can_view_deleted_projects' from roles r where r.slug in ('super_admin','admin')
on conflict do nothing;

insert into role_permissions (role_id, permission_key)
select r.id, 'can_view_team_standups' from roles r where r.slug in ('project_manager','team_lead')
on conflict do nothing;

-- can_view_standups was over-granted by the faulty conversion: it must mean
-- "all standups", which was {super_admin, admin, hr}.
delete from role_permissions rp
using roles r
where rp.role_id = r.id
  and rp.permission_key = 'can_view_standups'
  and r.slug in ('project_manager','team_lead');

-- ── Restore the correct two-branch structure ─────────────────────────────────

drop policy if exists p_projects_internal_select on projects;
create policy p_projects_internal_select on projects
  for select to authenticated
  using (
    is_internal()
    and (deleted_at is null or has_feature('can_view_deleted_projects'))
    and (
      has_feature('can_view_all_projects')
      or is_project_member(id)
      or created_by = auth.uid()
    )
  );

drop policy if exists p_tasks_internal_select on tasks;
create policy p_tasks_internal_select on tasks
  for select to authenticated
  using (
    is_internal()
    and (deleted_at is null or has_feature('can_view_deleted_projects'))
    and (
      has_feature('can_view_all_projects')
      or is_project_member(project_id)
      or is_project_creator(project_id)
    )
  );

drop policy if exists p_standups_select on standups;
create policy p_standups_select on standups
  for select to authenticated
  using (
    profile_id = auth.uid()
    or has_feature('can_view_standups')
    or (has_feature('can_view_team_standups') and shares_team_with(profile_id))
  );

drop policy if exists p_standup_entries_select on standup_entries;
create policy p_standup_entries_select on standup_entries
  for select to authenticated
  using (
    exists (
      select 1 from standups s
      where s.id = standup_entries.standup_id
        and (
          s.profile_id = auth.uid()
          or has_feature('can_view_standups')
          or (has_feature('can_view_team_standups') and shares_team_with(s.profile_id))
        )
    )
  );
