-- Let employee service assignment use the dynamic services table instead of
-- the original hardcoded Design/Development/Marketing list.
CREATE OR REPLACE FUNCTION admin_update_profile_role(
  p_profile_id uuid,
  p_role text,
  p_team_id uuid DEFAULT NULL,
  p_service_type text DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_target_role text;
BEGIN
  IF p_profile_id = auth.uid() THEN RAISE EXCEPTION 'cannot_manage_self'; END IF;

  SELECT role INTO v_target_role FROM profiles WHERE id = p_profile_id;
  IF v_target_role IS NULL THEN RAISE EXCEPTION 'profile_not_found'; END IF;
  IF NOT can_manage_target(v_target_role) THEN RAISE EXCEPTION 'forbidden_target'; END IF;

  IF p_role NOT IN ('super_admin','admin','project_manager','team_lead','employee','hr','finance') THEN
    RAISE EXCEPTION 'invalid_role';
  END IF;
  IF NOT can_grant_role(p_role) THEN RAISE EXCEPTION 'forbidden_role'; END IF;

  IF p_service_type IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM services
    WHERE slug = p_service_type
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'invalid_service';
  END IF;

  UPDATE profiles
  SET role = p_role,
      team_id = p_team_id,
      service_type = p_service_type
  WHERE id = p_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
