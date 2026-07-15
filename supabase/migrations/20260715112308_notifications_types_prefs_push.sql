-- ════════════════════════════════════════════════════════════════════
-- NOTIFICATIONS — Part 1: typed notifications, per-user preferences,
-- per-device push subscriptions, and a single gate that enforces both.
--
-- Design notes:
--  • `type` is the preference key. Legacy callers (10+ existing RPCs/Edge
--    Functions) only set `resource_type`, so a BEFORE INSERT trigger derives
--    `type` from it. That keeps every existing notification working without
--    rewriting those functions.
--  • Preferences are OPT-OUT: a row exists only when a user has turned a type
--    OFF. No seeding needed, and new staff/new types default to on.
--  • The same gate silently drops a notification whose type the recipient
--    disabled, so the bell, realtime and push all agree — no orphan rows.
--  • Push subscriptions are PER DEVICE (endpoint is globally unique per browser
--    install), deliberately NOT tied to enrolled_devices: attendance-excluded
--    admins have no enrolled device but must still receive notifications.
-- ════════════════════════════════════════════════════════════════════

-- ── 1. Typed notifications ──────────────────────────────────────────────────────
ALTER TABLE notifications
  ADD COLUMN type text NOT NULL DEFAULT 'general';

COMMENT ON COLUMN notifications.type IS
  'Preference key. Derived from resource_type by fn_notifications_gate() when the caller does not set it.';

-- Backfill the 151 existing rows from their resource_type.
UPDATE notifications SET type = CASE resource_type
  WHEN 'enrolled_device'       THEN 'device_approval'
  WHEN 'shoutout'              THEN 'gamification_shoutout'
  WHEN 'quest_task'            THEN 'gamification_quest'
  WHEN 'badge'                 THEN 'gamification_badge'
  WHEN 'employee_of_the_month' THEN 'gamification_eotm'
  WHEN 'redemption'            THEN 'gamification_reward'
  WHEN 'reward_pool'           THEN 'gamification_reward'
  ELSE 'general'
END;

-- Drives the bell query (profile_id + newest first).
CREATE INDEX IF NOT EXISTS idx_notifications_profile_created
  ON notifications(profile_id, created_at DESC);

-- ── 2. Per-user, per-type preferences (opt-out) ─────────────────────────────────
CREATE TABLE notification_preferences (
  profile_id uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       text        NOT NULL,
  enabled    boolean     NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, type)
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_notif_prefs_own ON notification_preferences FOR ALL
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- ── 3. Per-device push subscriptions ────────────────────────────────────────────
CREATE TABLE push_subscriptions (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id         uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- Globally unique per browser install — this IS the device identity for push.
  endpoint           text        NOT NULL UNIQUE,
  p256dh             text        NOT NULL,
  auth               text        NOT NULL,
  device_label       text,
  -- Soft link to enrolled_devices.device_fingerprint so Settings can show one
  -- merged device list. Nullable on purpose: push must not require enrollment.
  device_fingerprint text,
  enabled            boolean     NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now(),
  last_seen_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_push_subs_profile ON push_subscriptions(profile_id) WHERE enabled;

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users manage only their own subscriptions. The sender runs as service role and
-- bypasses RLS.
CREATE POLICY p_push_subs_own ON push_subscriptions FOR ALL
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- ── 4. The gate: derive type, then honour the recipient's preference ────────────
CREATE OR REPLACE FUNCTION fn_notifications_gate()
RETURNS trigger AS $$
BEGIN
  -- Legacy callers set only resource_type; map it to a preference key.
  IF NEW.type IS NULL OR NEW.type = 'general' THEN
    NEW.type := CASE NEW.resource_type
      WHEN 'enrolled_device'       THEN 'device_approval'
      WHEN 'shoutout'              THEN 'gamification_shoutout'
      WHEN 'quest_task'            THEN 'gamification_quest'
      WHEN 'badge'                 THEN 'gamification_badge'
      WHEN 'employee_of_the_month' THEN 'gamification_eotm'
      WHEN 'redemption'            THEN 'gamification_reward'
      WHEN 'reward_pool'           THEN 'gamification_reward'
      ELSE 'general'
    END;
  END IF;

  -- Opt-out: a row exists only when the user switched this type OFF.
  IF EXISTS (
    SELECT 1 FROM notification_preferences
    WHERE profile_id = NEW.profile_id AND type = NEW.type AND NOT enabled
  ) THEN
    RETURN NULL; -- drop it: no bell row, no realtime event, no push
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_notifications_gate
  BEFORE INSERT ON notifications
  FOR EACH ROW EXECUTE FUNCTION fn_notifications_gate();

-- ── 5. Shared helper for the triggers in Part 2 ─────────────────────────────────
-- Single insertion point so every new notification is typed. Never notifies the
-- actor about their own action, and is a no-op for a NULL recipient.
CREATE OR REPLACE FUNCTION fn_notify(
  p_profile_id    uuid,
  p_type          text,
  p_title         text,
  p_body          text,
  p_resource_type text DEFAULT NULL,
  p_resource_id   text DEFAULT NULL,
  p_actor         uuid DEFAULT NULL
) RETURNS void AS $$
BEGIN
  IF p_profile_id IS NULL THEN RETURN; END IF;
  IF p_actor IS NOT NULL AND p_actor = p_profile_id THEN RETURN; END IF;

  INSERT INTO notifications (profile_id, type, title, body, resource_type, resource_id)
  VALUES (p_profile_id, p_type, p_title, p_body, p_resource_type, p_resource_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recipients for "an employee submitted something": governors + the requester's
-- team lead(s), deduped, never the requester themselves.
CREATE OR REPLACE FUNCTION fn_request_approvers(p_requester uuid)
RETURNS TABLE (profile_id uuid) AS $$
  SELECT id FROM profiles
   WHERE is_active
     AND role IN ('super_admin','admin','hr')
     AND id <> p_requester
  UNION   -- UNION (not ALL) dedupes an HR person who is also the team lead
  SELECT t.lead_id FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
   WHERE tm.profile_id = p_requester
     AND t.lead_id IS NOT NULL
     AND t.lead_id <> p_requester;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Everyone internal — for company-wide schedule announcements.
CREATE OR REPLACE FUNCTION fn_all_internal_staff()
RETURNS TABLE (profile_id uuid) AS $$
  SELECT id FROM profiles
   WHERE is_active AND role NOT IN ('client_owner','client_member');
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ── 6. Clear the backlog so the bell starts at zero ─────────────────────────────
-- 133 of the 151 rows are month-old device notices nobody could see while the
-- bell was dev-only. History stays readable; it just isn't flagged unread.
UPDATE notifications SET read = true WHERE NOT read;

-- ── 7. Realtime — powers the in-app toast when a window is focused ──────────────
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
