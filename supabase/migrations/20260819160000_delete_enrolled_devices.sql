-- Enrolled devices could be approved and deactivated but never removed, so the
-- list only ever grew: replaced phones, test handsets and duplicate enrolments
-- stayed on it forever, and a shared-fingerprint warning could never be cleared
-- by getting rid of the stale half.
--
-- Gated on can_delete_attendance_records rather than can_manage_attendance,
-- which is the difference between HR and an admin here: HR approves and blocks
-- devices, an admin removes them. That is the same permission already governing
-- the destruction of attendance data, and it is held by exactly Admin and
-- Super Admin.
--
-- Deactivating remains the everyday action. Deleting is for a device that
-- should never have been on the list: nothing references enrolled_devices, so
-- the row is all that goes, and the owner simply re-enrols if they need to.
CREATE POLICY p_enrolled_devices_admin_delete ON enrolled_devices FOR DELETE
  USING (has_feature('can_delete_attendance_records'));
