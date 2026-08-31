-- Who may decide on a request somebody else filed.
--
-- HR filed a leave request for an employee and then could not approve it. That
-- was the rule working, not failing: p_leave_update said that once `entered_by`
-- is set, only a super_admin or an admin may touch the row. The segregation is
-- right — whoever puts a request in should not also be the one who waves it
-- through — but it was written as a list of two role names, which makes it say
-- something narrower and more brittle than it means:
--
--   * a role built on the Roles screen can never be given the reach, however it
--     is configured
--   * the reason it blocked HR is that HR is not called 'admin', not that HR
--     filed it. With two HR people, neither could approve what the other
--     entered, and if HR were renamed the rule would silently change
--
-- So it is now the principle instead: you cannot decide on a request you filed,
-- and anyone else holding can_approve_requests can. In the company as it stands
-- that is the same outcome — one HR person, so an admin still signs off what
-- she enters — and it stays true when that is no longer the shape of the team.
--
-- The other two branches are unchanged: you may edit your own request while it
-- is pending, and nobody approves their own.

DROP POLICY IF EXISTS p_leave_update ON leave_requests;
CREATE POLICY p_leave_update ON leave_requests FOR UPDATE
  USING (
    (profile_id = auth.uid() AND status = 'pending' AND entered_by IS NULL)
    OR (
      has_feature('can_approve_requests')
      AND profile_id <> auth.uid()
      AND entered_by IS DISTINCT FROM auth.uid()
    )
  );

-- Exceptions and overtime gained `entered_by` in 20260831110000 and always land
-- pending, so the same rule applies to them from the start.
DROP POLICY IF EXISTS p_exc_admin_update ON attendance_exceptions;
CREATE POLICY p_exc_admin_update ON attendance_exceptions FOR UPDATE
  USING (
    has_feature('can_approve_requests')
    AND profile_id <> auth.uid()
    AND entered_by IS DISTINCT FROM auth.uid()
  );

DROP POLICY IF EXISTS p_ot_update ON overtime_requests;
CREATE POLICY p_ot_update ON overtime_requests FOR UPDATE
  USING (
    (profile_id = auth.uid() AND status = 'pending' AND entered_by IS NULL)
    OR (
      has_feature('can_approve_requests')
      AND profile_id <> auth.uid()
      AND entered_by IS DISTINCT FROM auth.uid()
    )
  );
