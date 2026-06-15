-- The previous p_attendance_self_update with_check contained sub-SELECTs back into
-- the attendance table, causing infinite recursion (pg error 42P17) on every UPDATE,
-- including admin checkouts. Employees check out via the Edge Function (service role),
-- which bypasses RLS, so the immutability guards in with_check are redundant.
DROP POLICY IF EXISTS p_attendance_self_update ON attendance;

CREATE POLICY p_attendance_self_update ON attendance
  FOR UPDATE
  USING  (profile_id = auth.uid() AND source = 'self')
  WITH CHECK (profile_id = auth.uid() AND source = 'self');
