-- Withdrawing a request you filed yourself, before anyone has acted on it.
--
-- DELETE on all four request tables was `can_delete_attendance_records` — admin
-- and super admin only. So the person who filed a request had no way to take it
-- back: the only route was to ask an approver to reject it, which leaves a
-- rejection on the record for what was really a change of mind.
--
-- The four new policies are deliberately narrow, and each clause earns its place:
--
--   profile_id = auth.uid()   it is yours
--   status = 'pending'        nobody has acted on it, and an approved request has
--                             already written attendance rows that a delete would
--                             orphan — those go through the admin delete, which
--                             unwinds them
--   entered_by is null        you filed it. A request HR entered for you is their
--                             record of something, not yours to erase; ask them.
--
-- WFH has no `entered_by`; `granted_directly = false` is the same statement about
-- the same thing — a row the employee raised rather than one granted to them.
--
-- Additive: new policies only. Nothing existing is narrowed, so no deployed
-- client can be reading something that stops working.

CREATE POLICY p_leave_own_cancel ON leave_requests
  FOR DELETE
  USING (profile_id = auth.uid() AND status = 'pending' AND entered_by IS NULL);

CREATE POLICY p_ot_own_cancel ON overtime_requests
  FOR DELETE
  USING (profile_id = auth.uid() AND status = 'pending' AND entered_by IS NULL);

CREATE POLICY p_exc_own_cancel ON attendance_exceptions
  FOR DELETE
  USING (profile_id = auth.uid() AND status = 'pending' AND entered_by IS NULL);

CREATE POLICY p_wfh_own_cancel ON wfh_requests
  FOR DELETE
  USING (profile_id = auth.uid() AND status = 'pending' AND NOT granted_directly);
