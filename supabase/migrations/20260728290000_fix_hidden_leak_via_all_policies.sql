-- Fix: hidden roles and permissions were still visible to any admin.
--
-- The write policies were declared `FOR ALL`, which in Postgres includes
-- SELECT. Permissive policies OR together, so `p_roles_write` (true for anyone
-- with can_manage_roles) granted read access regardless of what the dedicated
-- SELECT policy said, and the is_hidden filter never applied to them.
--
-- Narrowing each write policy to the three commands it is actually for leaves
-- the SELECT policy as the only read path. Write authority is unchanged: the
-- same people can still insert, update and delete exactly as before.

-- ── roles ────────────────────────────────────────────────────────────────────
drop policy if exists p_roles_write on roles;

create policy p_roles_insert on roles
  for insert to authenticated with check (has_feature('can_manage_roles'));
create policy p_roles_update on roles
  for update to authenticated
  using (has_feature('can_manage_roles')) with check (has_feature('can_manage_roles'));
create policy p_roles_delete on roles
  for delete to authenticated using (has_feature('can_manage_roles'));

-- ── role_permissions ─────────────────────────────────────────────────────────
drop policy if exists p_role_permissions_write on role_permissions;

create policy p_role_permissions_insert on role_permissions
  for insert to authenticated with check (has_feature('can_manage_roles'));
create policy p_role_permissions_update on role_permissions
  for update to authenticated
  using (has_feature('can_manage_roles')) with check (has_feature('can_manage_roles'));
create policy p_role_permissions_delete on role_permissions
  for delete to authenticated using (has_feature('can_manage_roles'));

-- ── profile_roles ────────────────────────────────────────────────────────────
drop policy if exists p_profile_roles_write on profile_roles;

create policy p_profile_roles_insert on profile_roles
  for insert to authenticated with check (has_feature('can_manage_roles'));
create policy p_profile_roles_update on profile_roles
  for update to authenticated
  using (has_feature('can_manage_roles')) with check (has_feature('can_manage_roles'));
create policy p_profile_roles_delete on profile_roles
  for delete to authenticated using (has_feature('can_manage_roles'));
