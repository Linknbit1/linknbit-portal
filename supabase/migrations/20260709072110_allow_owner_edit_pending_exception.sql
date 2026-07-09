-- ════════════════════════════════════════════════════════════════════
-- Let employees edit their own attendance exception while it is still pending.
-- overtime_requests / wfh_requests / leave_requests already carry an equivalent
-- owner-pending UPDATE policy; attendance_exceptions only had an admin/HR one.
-- The WITH CHECK keeps the row owned by the same user and stuck in 'pending',
-- so an employee can't self-approve or reassign it.
-- ════════════════════════════════════════════════════════════════════

CREATE POLICY p_exc_own_update ON attendance_exceptions FOR UPDATE
  USING (profile_id = auth.uid() AND status = 'pending')
  WITH CHECK (profile_id = auth.uid() AND status = 'pending');
