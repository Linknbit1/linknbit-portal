-- admin_update_profile_role blocked ALL self-management (cannot_manage_self), which
-- also stopped admins/HR from changing their own attendance settings (exclude from
-- attendance, allowed check-in, job type, designation). Relax it: you may edit your
-- own settings, but you still cannot change your OWN role (prevents self-escalation
-- or accidentally locking yourself out). Authority over others is unchanged — an
-- employee still can't self-edit because can_manage_target('employee') is false.

CREATE OR REPLACE FUNCTION admin_update_profile_role(
  p_profile_id uuid,
  p_role text,
  p_designation_id uuid DEFAULT NULL,
  p_job_type text DEFAULT NULL,
  p_allowed_check_in text DEFAULT NULL,
  p_attendance_excluded boolean DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_target_role text;
BEGIN
  SELECT role INTO v_target_role FROM profiles WHERE id = p_profile_id;
  IF v_target_role IS NULL THEN RAISE EXCEPTION 'profile_not_found'; END IF;

  -- Self-edits are allowed for settings, but never for your own role.
  IF p_profile_id = auth.uid() AND p_role <> v_target_role THEN
    RAISE EXCEPTION 'cannot_change_own_role';
  END IF;

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
      job_type = COALESCE(p_job_type, job_type),
      allowed_check_in = CASE
        WHEN p_allowed_check_in IS NULL THEN allowed_check_in
        WHEN p_allowed_check_in = ''   THEN NULL
        ELSE p_allowed_check_in::time
      END,
      attendance_excluded = COALESCE(p_attendance_excluded, attendance_excluded)
  WHERE id = p_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
