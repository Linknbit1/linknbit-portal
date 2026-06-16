-- Device approval (activating a device) is now an admin/super_admin-only action.
-- HR may still SELECT every device and DEACTIVATE (block) one, but may not approve
-- or reactivate — that would let a device check in, which only admins may authorise.
--
-- The new model is register-first: employees self-register a device (is_active = true,
-- approved_by = null → "pending") and cannot check in until an admin approves it
-- (sets approved_by). The WITH CHECK below lets HR write only rows that end up
-- deactivated, so HR can block but never approve.

DROP POLICY IF EXISTS p_enrolled_devices_admin_write ON enrolled_devices;

CREATE POLICY p_enrolled_devices_admin_write ON enrolled_devices
  FOR UPDATE
  USING     (current_user_role() = ANY (ARRAY['admin', 'super_admin', 'hr']))
  WITH CHECK (
    current_user_role() = ANY (ARRAY['admin', 'super_admin'])
    OR (current_user_role() = 'hr' AND is_active = false)
  );
