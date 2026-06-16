-- Let HR approve/reactivate enrolled devices, EXCEPT their own (a self-approval would let
-- HR authorise their own check-in). Admins/super_admins keep full control. HR may still
-- deactivate (block) any device, including their own (is_active = false always allowed).
--
-- WITH CHECK runs on the resulting row: HR passes when the row belongs to someone else
-- (approve/reactivate others) OR the row ends up deactivated (block). Approving/reactivating
-- own device sets profile_id = auth.uid() AND is_active = true -> both clauses fail.

DROP POLICY IF EXISTS p_enrolled_devices_admin_write ON enrolled_devices;

CREATE POLICY p_enrolled_devices_admin_write ON enrolled_devices
  FOR UPDATE
  USING     (current_user_role() = ANY (ARRAY['admin', 'super_admin', 'hr']))
  WITH CHECK (
    current_user_role() = ANY (ARRAY['admin', 'super_admin'])
    OR (current_user_role() = 'hr' AND (profile_id <> auth.uid() OR is_active = false))
  );
