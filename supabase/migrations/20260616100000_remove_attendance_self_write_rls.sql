-- Remove the client-writable RLS path on `attendance`.
--
-- Why: the only sanctioned write path for self check-in/check-out is the
-- `attendance-checkin` / `attendance-checkout` Edge Functions, which run with the
-- service_role key (bypassing RLS) and enforce office-network IP/CIDR validation,
-- the work-hours window, the weekend gate, and device enrollment/flagging. None of
-- those controls exist at the DB level.
--
-- The `p_attendance_self_insert` and `p_attendance_self_update` policies let any
-- authenticated employee INSERT/UPDATE their own rows directly via the JS client,
-- bypassing every one of those controls (e.g. forging an on-time, office-validated
-- record from home on a weekend). Dropping them closes that parallel path.
--
-- This does NOT affect the legitimate flow: the Edge Functions use service_role and
-- are unaffected by RLS. Employees retain read access via `p_attendance_own`, and
-- admin/hr writes remain via `p_attendance_admin_write`.

DROP POLICY IF EXISTS p_attendance_self_insert ON attendance;
DROP POLICY IF EXISTS p_attendance_self_update ON attendance;
