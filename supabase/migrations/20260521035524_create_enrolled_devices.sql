-- Enrolled devices — tracks which devices each employee has registered for check-in
CREATE TABLE enrolled_devices (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id         uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  device_fingerprint text        NOT NULL,
  device_name        text        NOT NULL,
  approved_by        uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at        timestamptz,
  is_active          boolean     NOT NULL DEFAULT true,
  first_seen_at      timestamptz NOT NULL DEFAULT now(),
  last_seen_at       timestamptz,
  UNIQUE (profile_id, device_fingerprint)
);

CREATE INDEX idx_enrolled_devices_fingerprint ON enrolled_devices (device_fingerprint);

ALTER TABLE enrolled_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_enrolled_devices_own ON enrolled_devices
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY p_enrolled_devices_admin_select ON enrolled_devices
  FOR SELECT USING (current_user_role() = ANY (ARRAY['admin', 'super_admin', 'hr']));

CREATE POLICY p_enrolled_devices_admin_write ON enrolled_devices
  FOR UPDATE
  USING     (current_user_role() = ANY (ARRAY['admin', 'super_admin', 'hr']))
  WITH CHECK (current_user_role() = ANY (ARRAY['admin', 'super_admin', 'hr']));
