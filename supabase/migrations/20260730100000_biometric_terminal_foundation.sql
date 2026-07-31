-- Biometric attendance foundation: ZKTeco K40 terminals relayed by a Raspberry Pi.
--
-- Design notes (why this shape):
--   • The Pi is an at-least-once relay. Every punch carries a Pi-computed
--     punch_uid = sha256(terminal_id|zk_user_id|punched_at); the UNIQUE index on
--     it is what makes retries, Pi reboots and device-log replays harmless.
--   • biometric_punches is append-only raw truth. Reconciliation derives the
--     attendance row from it, so a day can always be recomputed from scratch.
--     That matters because reconciliation must be idempotent (see excluded_minutes
--     recompute in the attendance-biometric-punch edge function).
--   • No trigger changes are needed for biometric attendance:
--     fn_set_attendance_status() guards on TG_OP='INSERT' AND source='self', so
--     source='biometric' rows bypass it (the edge function sets status itself and
--     must never RAISE — a punch is a fact that already happened); and
--     fn_attendance_xp() is already source-agnostic, so the on-time LP fires for
--     terminal check-ins without a second LP path.

-- ── 1. Widen the CHECK constraints ─────────────────────────────────────────────

ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_source_check;
ALTER TABLE attendance ADD CONSTRAINT attendance_source_check
  CHECK (source IN ('self', 'admin', 'system', 'biometric'));

-- 'device' distinguishes a terminal from 'system' (cron/trigger) in the audit trail.
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_actor_kind_check;
ALTER TABLE audit_log ADD CONSTRAINT audit_log_actor_kind_check
  CHECK (actor_kind IN ('user', 'self', 'system', 'device'));

-- ── 2. Enroll-number mapping ───────────────────────────────────────────────────

-- The K40 enroll number ("user id" on the device keypad). Text, not int: ZKTeco
-- pads and sometimes stores these as strings, and card-based enrolments are wider.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS zk_user_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_zk_user_id
  ON profiles (zk_user_id) WHERE zk_user_id IS NOT NULL;

COMMENT ON COLUMN profiles.zk_user_id IS
  'ZKTeco terminal enroll number. NULL = not enrolled on any terminal.';

-- ── 3. Settings ────────────────────────────────────────────────────────────────

-- Mid-day punch pairs shorter than this are treated as noise (double-taps, a
-- walk past the sensor) rather than an out-and-back, and are NOT deducted from
-- worked hours. Tune to your paid-break policy.
ALTER TABLE attendance_settings
  ADD COLUMN IF NOT EXISTS min_excluded_gap_min int NOT NULL DEFAULT 15;

-- Routes a job type's attendance through the terminal instead of the portal
-- button. Enforced in attendance-checkin only while the terminal heartbeat is
-- fresh, so a dead Pi automatically re-opens portal check-in.
ALTER TABLE job_type_policies
  ADD COLUMN IF NOT EXISTS attendance_via_terminal boolean NOT NULL DEFAULT false;

UPDATE job_type_policies SET attendance_via_terminal = true WHERE job_type = 'on_site';

-- ── 4. Terminals ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS biometric_terminals (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name               text        NOT NULL,
  location           text,
  device_ip          text,
  -- sha256 hex of the shared secret the Pi sends. The plaintext lives only in
  -- the Pi's env file; it is never stored here and never returned to the client.
  secret_hash        text        NOT NULL,
  serial_number      text,
  firmware           text,
  -- Health signals, refreshed by the Pi heartbeat.
  last_heartbeat_at  timestamptz,
  last_poll_at       timestamptz,
  device_log_count   int,
  clock_skew_sec     int,
  is_active          boolean     NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name)
);

COMMENT ON TABLE biometric_terminals IS
  'Physical ZKTeco terminals. One row per device; secret_hash authenticates its Pi relay.';

-- ── 5. Raw punches ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS biometric_punches (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Pi-computed idempotency key; the UNIQUE constraint is the dedupe mechanism.
  punch_uid     text        NOT NULL UNIQUE,
  terminal_id   uuid        NOT NULL REFERENCES biometric_terminals(id) ON DELETE CASCADE,
  zk_user_id    text        NOT NULL,
  -- NULL until an admin links the enroll number to a member.
  profile_id    uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  punched_at    timestamptz NOT NULL,
  -- The punch's date in attendance_settings.timezone, resolved server-side so
  -- reconciliation never re-derives it from a client-supplied zone.
  local_date    date        NOT NULL,
  resolution    text        NOT NULL DEFAULT 'pending'
                            CHECK (resolution IN (
                              'pending',
                              'check_in',
                              'check_out',
                              'ooo_out',
                              'ooo_in',
                              'unmatched_user',
                              'ignored_below_threshold',
                              'ignored_unpaired',
                              'ignored_holiday',
                              'ignored_weekend',
                              'ignored_leave',
                              'ignored_wfh'
                            )),
  raw           jsonb       NOT NULL DEFAULT '{}'::jsonb,
  processed_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_punches_profile_date  ON biometric_punches (profile_id, local_date);
CREATE INDEX IF NOT EXISTS idx_punches_terminal_date ON biometric_punches (terminal_id, local_date DESC);
CREATE INDEX IF NOT EXISTS idx_punches_unmatched     ON biometric_punches (local_date DESC)
  WHERE profile_id IS NULL;

COMMENT ON TABLE biometric_punches IS
  'Append-only raw terminal punches. Attendance is derived from these, never the reverse.';

-- ── 6. RLS ─────────────────────────────────────────────────────────────────────
-- Writes come only from the attendance-biometric-punch edge function on the
-- service-role key, which bypasses RLS; no write policy is granted to any role.

ALTER TABLE biometric_terminals ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_punches   ENABLE ROW LEVEL SECURITY;

-- secret_hash is column-level sensitive; the API layer selects an explicit
-- column list that omits it (see src/api/biometric.ts).
CREATE POLICY p_terminals_view ON biometric_terminals
  FOR SELECT USING (has_feature('can_view_all_attendance'));

CREATE POLICY p_terminals_manage ON biometric_terminals
  FOR ALL
  USING      (has_feature('can_manage_attendance'))
  WITH CHECK (has_feature('can_manage_attendance'));

CREATE POLICY p_punches_own ON biometric_punches
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY p_punches_view ON biometric_punches
  FOR SELECT USING (has_feature('can_view_all_attendance'));

CREATE POLICY p_punches_team ON biometric_punches
  FOR SELECT USING (
    has_feature('can_view_team_attendance') AND shares_team_with(profile_id)
  );

-- Linking an unmatched punch to a member is an attendance-management action.
CREATE POLICY p_punches_manage ON biometric_punches
  FOR UPDATE
  USING      (has_feature('can_manage_attendance'))
  WITH CHECK (has_feature('can_manage_attendance'));
