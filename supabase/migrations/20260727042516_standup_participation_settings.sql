-- ════════════════════════════════════════════════════════════════════
-- Standup participation — part 1 of 2: who is expected to submit.
--
-- Until now this was hardcoded in two places (fn_standup_window and
-- standup_roster): role = 'employee' AND NOT attendance_excluded. Admins had
-- no way to excuse one person or pull a team lead in.
--
-- The model is two layers, resolved by fn_standup_participant():
--   1. standup_role_settings — the default for each role.
--   2. standup_participants  — a per-person override (a row = an explicit
--      answer; no row = inherit the role default).
-- An override always wins, so "this one designer is exempt" and "this one
-- team lead must submit" are both one click.
--
-- This file changes NO behaviour: it seeds the role defaults to reproduce
-- today's rule and adds the helpers. Part 2 rewires the window/roster/submit
-- functions onto them.
-- ════════════════════════════════════════════════════════════════════

-- ── Role defaults ─────────────────────────────────────────────────────────────
CREATE TABLE standup_role_settings (
  role        text        PRIMARY KEY,
  is_required boolean     NOT NULL DEFAULT false,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid        REFERENCES profiles(id) ON DELETE SET NULL
);

COMMENT ON TABLE standup_role_settings IS
  'Per-role default for "must submit a daily standup". Overridden per person by standup_participants.';

-- Reproduces today's hardcoded rule: employees submit, nobody else does.
INSERT INTO standup_role_settings (role, is_required) VALUES
  ('super_admin', false), ('admin', false), ('hr', false), ('project_manager', false),
  ('team_lead', false), ('employee', true), ('finance', false)
ON CONFLICT (role) DO NOTHING;

-- ── Per-person overrides ──────────────────────────────────────────────────────
CREATE TABLE standup_participants (
  profile_id  uuid        PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  is_required boolean     NOT NULL,
  note        text,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid        REFERENCES profiles(id) ON DELETE SET NULL
);

COMMENT ON TABLE standup_participants IS
  'Explicit per-person answer to "must submit a standup". A row overrides the role default; no row = inherit.';

-- Preserve today's second clause (attendance_excluded people never had to
-- submit) as explicit exclusions, so the settings screen shows the real state
-- instead of silently disagreeing with it.
INSERT INTO standup_participants (profile_id, is_required, note)
SELECT p.id, false, 'Excluded from attendance tracking'
  FROM profiles p
  JOIN standup_role_settings rs ON rs.role = p.role
 WHERE p.is_active AND p.attendance_excluded AND rs.is_required
ON CONFLICT (profile_id) DO NOTHING;

-- ── Resolution helpers ────────────────────────────────────────────────────────
-- Is this person on the standup list at all? (override → role default → false)
CREATE OR REPLACE FUNCTION fn_standup_participant(p_profile uuid)
RETURNS boolean AS $$
  SELECT COALESCE((SELECT p.is_active FROM profiles p WHERE p.id = p_profile), false)
     AND COALESCE(
           (SELECT sp.is_required FROM standup_participants sp WHERE sp.profile_id = p_profile),
           (SELECT rs.is_required
              FROM profiles p
              JOIN standup_role_settings rs ON rs.role = p.role
             WHERE p.id = p_profile),
           false)
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Must this person submit for this particular date? Adds the day-level facts:
-- it has to be a working day and they must not be on leave.
CREATE OR REPLACE FUNCTION fn_standup_required(p_profile uuid, p_date date)
RETURNS boolean AS $$
  SELECT fn_standup_participant(p_profile)
     AND fn_is_working_day(p_date)
     AND NOT EXISTS (
           SELECT 1 FROM attendance a
            WHERE a.profile_id = p_profile AND a.date = p_date AND a.status = 'leave')
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ── Feature flag ──────────────────────────────────────────────────────────────
-- Who administers the standup list. Seeded for admin only (super_admin passes
-- via the has_feature short-circuit); flip HR on from Settings → Permissions if
-- they should own it too.
INSERT INTO role_feature_flags (role, feature_key, enabled) VALUES
  ('super_admin',     'can_manage_standups', true),
  ('admin',           'can_manage_standups', true),
  ('hr',              'can_manage_standups', false),
  ('project_manager', 'can_manage_standups', false),
  ('team_lead',       'can_manage_standups', false),
  ('employee',        'can_manage_standups', false),
  ('finance',         'can_manage_standups', false)
ON CONFLICT (role, feature_key) DO UPDATE SET enabled = EXCLUDED.enabled;

-- ── RLS ───────────────────────────────────────────────────────────────────────
-- Readable by all internal staff (the window/roster helpers are SECURITY
-- DEFINER, but the settings screen reads the tables directly); writable only
-- through the RPCs below, which stamp updated_by.
ALTER TABLE standup_role_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE standup_participants  ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_standup_role_settings_select ON standup_role_settings
  FOR SELECT USING (is_internal());
CREATE POLICY p_standup_role_settings_write ON standup_role_settings
  FOR ALL USING (has_feature('can_manage_standups'))
  WITH CHECK (has_feature('can_manage_standups'));

CREATE POLICY p_standup_participants_select ON standup_participants
  FOR SELECT USING (is_internal());
CREATE POLICY p_standup_participants_write ON standup_participants
  FOR ALL USING (has_feature('can_manage_standups'))
  WITH CHECK (has_feature('can_manage_standups'));

-- ── Admin RPCs ────────────────────────────────────────────────────────────────
-- Flip a whole role on/off.
CREATE OR REPLACE FUNCTION set_standup_role_requirement(p_role text, p_required boolean)
RETURNS void AS $$
BEGIN
  IF NOT has_feature('can_manage_standups') THEN
    RAISE EXCEPTION 'Not allowed to manage standup settings' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM standup_role_settings WHERE role = p_role) THEN
    RAISE EXCEPTION 'Unknown role %', p_role USING ERRCODE = 'P0010';
  END IF;

  UPDATE standup_role_settings
     SET is_required = p_required, updated_at = now(), updated_by = auth.uid()
   WHERE role = p_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Set one person's answer. p_mode: 'inherit' (drop the override) | 'required' | 'excluded'.
CREATE OR REPLACE FUNCTION set_standup_participation(p_profile uuid, p_mode text, p_note text DEFAULT NULL)
RETURNS void AS $$
BEGIN
  IF NOT has_feature('can_manage_standups') THEN
    RAISE EXCEPTION 'Not allowed to manage standup settings' USING ERRCODE = '42501';
  END IF;
  IF p_mode NOT IN ('inherit', 'required', 'excluded') THEN
    RAISE EXCEPTION 'Unknown participation mode %', p_mode USING ERRCODE = 'P0011';
  END IF;

  IF p_mode = 'inherit' THEN
    DELETE FROM standup_participants WHERE profile_id = p_profile;
    RETURN;
  END IF;

  INSERT INTO standup_participants (profile_id, is_required, note, updated_by)
  VALUES (p_profile, p_mode = 'required', NULLIF(btrim(p_note), ''), auth.uid())
  ON CONFLICT (profile_id) DO UPDATE
    SET is_required = EXCLUDED.is_required,
        note        = EXCLUDED.note,
        updated_at  = now(),
        updated_by  = EXCLUDED.updated_by;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
