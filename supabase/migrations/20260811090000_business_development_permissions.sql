-- Business Development, part 1: capability keys and the roles that carry them.
--
-- Purely additive. Nothing reads these yet beyond the nav gate and route guard,
-- so it cannot change anyone's existing access.
--
-- Why the two roles are is_system = false:
--
--   profiles.role carries a CHECK constraint limited to the nine built-in slugs,
--   and 57 legacy policies still read it directly (see
--   20260728160000_sync_profiles_primary_role.sql). A custom slug can never be
--   written there. So a BD person holds one of these roles ALONGSIDE 'employee'
--   rather than instead of it: fn_sync_profile_primary_role() keeps
--   profiles.role at 'employee', every legacy policy keeps working untouched,
--   and they stay a tracked employee for attendance, standups and gamification.
--
-- Same shape as the 'sticky-notes' role — a role that exists to carry a
-- capability, not to replace someone's position in the company.

-- ── Capabilities ─────────────────────────────────────────────────────────────
-- Slotted between Clients (20) and People (30) in the permission matrix.
--
-- The split is view vs. manage, NOT rep vs. manager. A rep's write access to
-- their own leads comes from RLS ownership (assigned_rep_id = auth.uid()), not
-- from a permission — so the module's visibility gate is can_view_bd, which
-- every BD person holds, and can_manage_bd gates department-wide edits
-- (reassigning leads, setting targets, editing pipeline stages).
insert into permissions (key, label, category, sort_order, description) values
  ('can_view_bd',   'View business development',   'Business Development', 25,
   'Open the BD pipeline, dashboard and reports.'),
  ('can_manage_bd', 'Manage business development', 'Business Development', 26,
   'Reassign leads, set revenue and activity targets, and edit pipeline stages.')
on conflict (key) do nothing;

-- ── Roles ────────────────────────────────────────────────────────────────────
-- Positions sit below project_manager (60) so fn_guard_profile_roles() only
-- lets someone who already outranks them hand them out — in practice admin and
-- above, since granting also requires can_manage_roles.
insert into roles (slug, name, color, position, is_system, is_default) values
  ('bd_manager', 'BD Manager',           '#F59E0B', 55, false, false),
  ('bd_rep',     'Business Development', '#FBBF24', 45, false, false)
on conflict (slug) do nothing;

-- BD Manager: the whole department.
insert into role_permissions (role_id, permission_key)
select r.id, k.key
from roles r
cross join (values ('can_view_bd'), ('can_manage_bd')) as k(key)
where r.slug = 'bd_manager'
on conflict do nothing;

-- BD Representative: sees the module, owns their own leads through RLS.
insert into role_permissions (role_id, permission_key)
select r.id, 'can_view_bd'
from roles r
where r.slug = 'bd_rep'
on conflict do nothing;

-- Leadership and portal admins. super_admin is intentionally absent: it holds
-- 'administrator', which already grants every permission including future ones.
insert into role_permissions (role_id, permission_key)
select r.id, k.key
from roles r
cross join (values ('can_view_bd'), ('can_manage_bd')) as k(key)
where r.slug = 'admin'
on conflict do nothing;
