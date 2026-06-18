-- Device identity moves from a specs-derived fingerprint hash to a random per-device
-- token (stored client-side in a cookie). The token lives in the existing
-- device_fingerprint column; this adds a nullable hint column to keep the old
-- specs hash as a soft signal for admin governance / future auto-recovery.
ALTER TABLE enrolled_devices ADD COLUMN IF NOT EXISTS fingerprint_hint text;

COMMENT ON COLUMN enrolled_devices.device_fingerprint IS
  'Random per-device token (crypto.randomUUID) minted at registration and stored in a client cookie. The stable device identity.';
COMMENT ON COLUMN enrolled_devices.fingerprint_hint IS
  'Specs-derived browser fingerprint hash. Soft signal only — not the identity (it collides across identical devices and changes on updates).';
