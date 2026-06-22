-- Re-point the team-lead / PM read policies from the single profiles.team_id
-- onto the new many-to-many team_members, so they survive the team_id drop.
-- A SECURITY DEFINER helper does the junction lookup, keeping it out of RLS
-- (the policies run on attendance/request tables, not team_members itself),
-- which avoids the recursion class fixed in 20260522000001.

CREATE OR REPLACE FUNCTION shares_team_with(p_other uuid) RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM team_members me
    JOIN team_members them ON them.team_id = me.team_id
    WHERE me.profile_id = auth.uid()
      AND them.profile_id = p_other
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- attendance (was p_attendance_team — team_lead/PM/admin/super_admin)
DROP POLICY IF EXISTS p_attendance_team ON attendance;
CREATE POLICY p_attendance_team ON attendance
  FOR SELECT USING (
    current_user_role() = ANY (ARRAY['team_lead','project_manager','admin','super_admin'])
    AND shares_team_with(attendance.profile_id)
  );

-- attendance_exceptions
DROP POLICY IF EXISTS p_exc_team ON attendance_exceptions;
CREATE POLICY p_exc_team ON attendance_exceptions
  FOR SELECT USING (
    current_user_role() = ANY (ARRAY['team_lead','project_manager'])
    AND shares_team_with(attendance_exceptions.profile_id)
  );

-- wfh_requests
DROP POLICY IF EXISTS p_wfh_team ON wfh_requests;
CREATE POLICY p_wfh_team ON wfh_requests
  FOR SELECT USING (
    current_user_role() = ANY (ARRAY['team_lead','project_manager'])
    AND shares_team_with(wfh_requests.profile_id)
  );

-- overtime_requests
DROP POLICY IF EXISTS p_ot_team ON overtime_requests;
CREATE POLICY p_ot_team ON overtime_requests
  FOR SELECT USING (
    current_user_role() = ANY (ARRAY['team_lead','project_manager'])
    AND shares_team_with(overtime_requests.profile_id)
  );

-- leave_requests
DROP POLICY IF EXISTS p_leave_team ON leave_requests;
CREATE POLICY p_leave_team ON leave_requests
  FOR SELECT USING (
    current_user_role() = ANY (ARRAY['team_lead','project_manager'])
    AND shares_team_with(leave_requests.profile_id)
  );
