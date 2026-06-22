-- Replace the role RPC: it now sets role + designation_id (validated against the
-- designations list) + job_type, and no longer touches team_id/service_type. Team
-- membership moves to its own set_profile_teams RPC over the team_members junction.

-- Drop the prior overloads so PostgREST sees a single definition.
DROP FUNCTION IF EXISTS admin_update_profile_role(uuid, text, uuid, text);
DROP FUNCTION IF EXISTS admin_update_profile_role(uuid, text, uuid);

CREATE OR REPLACE FUNCTION admin_update_profile_role(
  p_profile_id uuid,
  p_role text,
  p_designation_id uuid DEFAULT NULL,
  p_job_type text DEFAULT NULL
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

  IF p_designation_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM designations WHERE id = p_designation_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'invalid_designation';
  END IF;

  IF p_job_type IS NOT NULL AND p_job_type NOT IN ('on_site','hybrid','remote') THEN
    RAISE EXCEPTION 'invalid_job_type';
  END IF;

  UPDATE profiles
  SET role = p_role,
      designation_id = p_designation_id,
      job_type = COALESCE(p_job_type, job_type)
  WHERE id = p_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Set the full team membership for a profile (replace semantics).
CREATE OR REPLACE FUNCTION set_profile_teams(
  p_profile_id uuid,
  p_team_ids uuid[]
) RETURNS void AS $$
DECLARE
  v_target_role text;
BEGIN
  SELECT role INTO v_target_role FROM profiles WHERE id = p_profile_id;
  IF v_target_role IS NULL THEN RAISE EXCEPTION 'profile_not_found'; END IF;
  IF NOT can_manage_target(v_target_role) THEN RAISE EXCEPTION 'forbidden_target'; END IF;

  DELETE FROM team_members
  WHERE profile_id = p_profile_id
    AND NOT (team_id = ANY (COALESCE(p_team_ids, ARRAY[]::uuid[])));

  INSERT INTO team_members (team_id, profile_id)
  SELECT t, p_profile_id FROM unnest(COALESCE(p_team_ids, ARRAY[]::uuid[])) AS t
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
