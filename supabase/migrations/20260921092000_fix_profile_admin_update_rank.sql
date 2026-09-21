-- p_profiles_admin_update protected nothing.
--
-- The policy read:
--   has_feature('can_edit_any_profile')
--   OR (has_feature('can_edit_any_profile') AND role <> 'super_admin')
--
-- `A OR (A AND B)` is `A`. The second branch — the whole point of the policy, "you
-- may not edit the super admin" — could never change the outcome, so anybody
-- holding can_edit_any_profile could update the super admin's row. It also tested a
-- role NAME, which CLAUDE.md forbids: a role renamed on the Roles screen would have
-- silently changed who was protected.
--
-- Replaced with the ladder the rest of the portal already uses. top_role_position()
-- returns the sentinel max int for anyone holding `administrator`, so an
-- administrator's row is unreachable by rank from any other account — which is the
-- protection the original clause was reaching for, expressed as standing rather
-- than as a string.
--
-- Self-edit is unaffected: p_profiles_self_update owns that path, and its WITH
-- CHECK already pins `role = current_user_role()` so nobody re-roles themselves.
--
-- Blast radius: nil for the app. Every admin-side profile write in src/ goes
-- through admin_update_profile_details() / admin_update_profile_role(), which are
-- SECURITY DEFINER and bypass RLS; the only direct table writes are
-- updateOwnProfile() and updateOwnTheme(), both self-updates. This policy is the
-- backstop for a direct PostgREST call, which is exactly the case it failed at.

DROP POLICY IF EXISTS p_profiles_admin_update ON public.profiles;

CREATE POLICY p_profiles_admin_update ON public.profiles
  FOR UPDATE
  USING (
    has_feature('can_edit_any_profile')
    AND my_role_rank() >= top_role_position(id)
  )
  WITH CHECK (
    has_feature('can_edit_any_profile')
    AND my_role_rank() >= top_role_position(id)
  );

-- Known gap, deliberately not closed here: RLS cannot see the OLD row, so this
-- policy cannot say "and you may not change profiles.role". Enforcing that needs a
-- trigger, and profiles.role carries no permissions (profile_roles does) — it is a
-- label plus the client/staff test. Tracked as part of the Wave 4 work that turns
-- that test into an allow-list column.
