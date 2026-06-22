-- Per-employee "allowed check-in" override. When set (e.g. 08:30), the employee
-- is not marked late as long as they check in at or before this time, and the
-- normal grace period does NOT apply. When NULL, the standard office rule
-- (work_start_time + grace_period_min) applies. Used by the self check-in edge
-- function and the admin mark/edit-attendance flow.

ALTER TABLE profiles ADD COLUMN allowed_check_in time;

-- Extend the people-management RPC so HR/Admin can set the override alongside
-- role/designation/job_type. Semantics for p_allowed_check_in:
--   NULL  -> leave unchanged
--   ''    -> clear (back to normal office rule)
--   HH:MM -> set
DROP FUNCTION IF EXISTS admin_update_profile_role(uuid, text, uuid, text);

CREATE OR REPLACE FUNCTION admin_update_profile_role(
  p_profile_id uuid,
  p_role text,
  p_designation_id uuid DEFAULT NULL,
  p_job_type text DEFAULT NULL,
  p_allowed_check_in text DEFAULT NULL
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
      job_type = COALESCE(p_job_type, job_type),
      allowed_check_in = CASE
        WHEN p_allowed_check_in IS NULL THEN allowed_check_in
        WHEN p_allowed_check_in = ''   THEN NULL
        ELSE p_allowed_check_in::time
      END
  WHERE id = p_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
