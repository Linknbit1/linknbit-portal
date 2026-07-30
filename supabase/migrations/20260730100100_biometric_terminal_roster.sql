-- Cache the terminal's enrolled-user list so admins can link enroll numbers to
-- members by the name shown on the device, instead of typing raw numbers.
--
-- Stored as jsonb on the terminal rather than in its own table: it is a snapshot
-- the Pi overwrites wholesale on each roster sync, has no independent identity,
-- and is only ever read as a whole for the linking picker.
-- Shape: [{ "zk_user_id": "12", "name": "Ahmad Karimi", "privilege": 0 }, ...]

ALTER TABLE biometric_terminals
  ADD COLUMN IF NOT EXISTS device_roster jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE biometric_terminals
  ADD COLUMN IF NOT EXISTS roster_synced_at timestamptz;

COMMENT ON COLUMN biometric_terminals.device_roster IS
  'Snapshot of the device''s enrolled users, overwritten on each Pi roster sync.';
