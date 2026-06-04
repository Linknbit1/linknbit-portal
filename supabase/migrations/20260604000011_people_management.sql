-- ════════════════════════════════════════════════════════════════════
-- PHASE 4 — Teams & People Management
-- Adds a unique team name and the privileged people-management RPCs.
-- Authority model (enforced in the RPCs, which RLS can't do per-column):
--   • super_admin — anything (incl. granting admin/super_admin, editing super_admins)
--   • admin       — manage everyone except super_admins; grant any role except super_admin
--   • hr          — change role/team/service only (not personal details), on
--                   non-admin/non-super_admin users; cannot grant admin/super_admin
--   • personal details (name/avatar) — super_admin/admin only (or self via existing RLS)
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE teams ADD CONSTRAINT teams_name_unique UNIQUE (name);

-- ── Authority helpers ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION can_manage_target(p_target_role text) RETURNS boolean AS $$
  SELECT CASE current_user_role()
    WHEN 'super_admin' THEN true
    WHEN 'admin'       THEN p_target_role <> 'super_admin'
    WHEN 'hr'          THEN p_target_role NOT IN ('super_admin','admin')
    ELSE false END
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION can_grant_role(p_role text) RETURNS boolean AS $$
  SELECT CASE current_user_role()
    WHEN 'super_admin' THEN true
    WHEN 'admin'       THEN p_role <> 'super_admin'
    WHEN 'hr'          THEN p_role NOT IN ('super_admin','admin')
    ELSE false END
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ── Role / team / service (HR + Admin + Super) ──────────────────────────────────
CREATE OR REPLACE FUNCTION admin_update_profile_role(
  p_profile_id uuid, p_role text, p_team_id uuid DEFAULT NULL, p_service_type text DEFAULT NULL
) RETURNS void AS $$
DECLARE v_target_role text;
BEGIN
  IF p_profile_id = auth.uid() THEN RAISE EXCEPTION 'cannot_manage_self'; END IF;
  SELECT role INTO v_target_role FROM profiles WHERE id = p_profile_id;
  IF v_target_role IS NULL THEN RAISE EXCEPTION 'profile_not_found'; END IF;
  IF NOT can_manage_target(v_target_role) THEN RAISE EXCEPTION 'forbidden_target'; END IF;
  IF p_role NOT IN ('super_admin','admin','project_manager','team_lead','employee','hr','finance') THEN
    RAISE EXCEPTION 'invalid_role';
  END IF;
  IF NOT can_grant_role(p_role) THEN RAISE EXCEPTION 'forbidden_role'; END IF;
  IF p_service_type IS NOT NULL AND p_service_type NOT IN ('design','development','marketing') THEN
    RAISE EXCEPTION 'invalid_service';
  END IF;
  UPDATE profiles
  SET role = p_role, team_id = p_team_id, service_type = p_service_type
  WHERE id = p_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── Personal details (Super + Admin only) ───────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_update_profile_details(
  p_profile_id uuid, p_name text, p_avatar_url text DEFAULT NULL
) RETURNS void AS $$
DECLARE v_target_role text;
BEGIN
  IF current_user_role() NOT IN ('super_admin','admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT role INTO v_target_role FROM profiles WHERE id = p_profile_id;
  IF v_target_role IS NULL THEN RAISE EXCEPTION 'profile_not_found'; END IF;
  IF current_user_role() = 'admin' AND v_target_role = 'super_admin' THEN RAISE EXCEPTION 'forbidden_target'; END IF;
  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN RAISE EXCEPTION 'name_required'; END IF;
  UPDATE profiles SET name = p_name, avatar_url = p_avatar_url WHERE id = p_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── Activate / deactivate ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_set_profile_active(
  p_profile_id uuid, p_active boolean
) RETURNS void AS $$
DECLARE v_target_role text;
BEGIN
  IF p_profile_id = auth.uid() THEN RAISE EXCEPTION 'cannot_manage_self'; END IF;
  SELECT role INTO v_target_role FROM profiles WHERE id = p_profile_id;
  IF v_target_role IS NULL THEN RAISE EXCEPTION 'profile_not_found'; END IF;
  IF NOT can_manage_target(v_target_role) THEN RAISE EXCEPTION 'forbidden_target'; END IF;
  UPDATE profiles SET is_active = p_active WHERE id = p_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── Tighten the direct admin UPDATE policy so admins can't touch super_admin rows
--    or grant super_admin via the client (RPCs above are the sanctioned path).
DROP POLICY IF EXISTS p_profiles_admin_update ON profiles;
CREATE POLICY p_profiles_admin_update ON profiles FOR UPDATE
  USING (
    current_user_role() = 'super_admin'
    OR (current_user_role() = 'admin' AND role <> 'super_admin')
  )
  WITH CHECK (
    current_user_role() = 'super_admin'
    OR (current_user_role() = 'admin' AND role <> 'super_admin')
  );
