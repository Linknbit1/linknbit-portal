-- Some staff (e.g. CEO, COO) are exempt from attendance entirely: they don't check
-- in, and must not appear in attendance lists or reports. A per-employee flag drives
-- this — the daily absence job skips them (so they never get an 'absent' row), the
-- check-in edge function rejects them, and the admin mark/grant pickers hide them.

ALTER TABLE profiles ADD COLUMN attendance_excluded boolean NOT NULL DEFAULT false;

-- Daily absence job: never auto-mark exempt employees absent.
CREATE OR REPLACE FUNCTION fn_mark_absent_for_date(d date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT fn_is_working_day(d) THEN RETURN; END IF;

  INSERT INTO attendance (profile_id, date, status, source)
  SELECT p.id, d, 'absent', 'system'
  FROM profiles p
  WHERE p.is_active = true
    AND p.attendance_excluded = false
    AND p.role IN ('super_admin', 'admin', 'hr', 'project_manager', 'team_lead', 'employee', 'finance')
    AND NOT EXISTS (SELECT 1 FROM attendance a WHERE a.profile_id = p.id AND a.date = d)
  ON CONFLICT (profile_id, date) DO NOTHING;
END;
$$;

-- People-management RPC gains the exclusion flag (NULL = leave unchanged).
DROP FUNCTION IF EXISTS admin_update_profile_role(uuid, text, uuid, text, text);

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
      END,
      attendance_excluded = COALESCE(p_attendance_excluded, attendance_excluded)
  WHERE id = p_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
