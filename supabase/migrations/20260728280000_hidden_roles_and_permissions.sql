-- Let a role or permission be hidden from the admin UI.
--
-- A hidden row is visible only to holders of `administrator` — today that is a
-- single account. Everyone else, including other admins, sees the roles and
-- permissions screens with those rows simply absent.
--
-- This is presentation, not enforcement. Hiding does NOT weaken anything:
-- has_feature() and my_permissions() are SECURITY DEFINER and read the tables
-- directly, so the people holding a hidden permission keep using the feature
-- exactly as before. It only stops the row appearing in the roles list and the
-- permission matrix.
--
-- Generic on purpose — a flag rather than a hardcoded slug, so anything else
-- can be hidden later without touching RLS again.

alter table roles       add column if not exists is_hidden boolean not null default false;
alter table permissions add column if not exists is_hidden boolean not null default false;

comment on column roles.is_hidden is
  'Hide from the roles list for everyone without the administrator permission.';
comment on column permissions.is_hidden is
  'Hide from the permission matrix for everyone without the administrator permission.';

update roles       set is_hidden = true where slug = 'sticky-notes';
update permissions set is_hidden = true where key  = 'can_use_sticky_notes';

-- ── Visibility ───────────────────────────────────────────────────────────────

drop policy if exists p_roles_select on roles;
create policy p_roles_select on roles
  for select to authenticated
  using (not is_hidden or has_feature('administrator'));

drop policy if exists p_permissions_select on permissions;
create policy p_permissions_select on permissions
  for select to authenticated
  using (not is_hidden or has_feature('administrator'));

-- A grant is hidden when either side of it is: showing "<hidden role> → View
-- reports" or "Employee → <hidden permission>" would give the secret away.
drop policy if exists p_role_permissions_select on role_permissions;
create policy p_role_permissions_select on role_permissions
  for select to authenticated
  using (
    has_feature('administrator')
    or (
      not exists (select 1 from roles r where r.id = role_permissions.role_id and r.is_hidden)
      and not exists (
        select 1 from permissions p
        where p.key = role_permissions.permission_key and p.is_hidden
      )
    )
  );

-- Likewise the assignment: nobody should be able to tell that a person holds a
-- role that does not appear in the list.
drop policy if exists p_profile_roles_select on profile_roles;
create policy p_profile_roles_select on profile_roles
  for select to authenticated
  using (
    has_feature('administrator')
    or not exists (
      select 1 from roles r where r.id = profile_roles.role_id and r.is_hidden
    )
  );
