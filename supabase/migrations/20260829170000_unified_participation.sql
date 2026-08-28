-- One place that answers "is this person part of X".
--
-- Today the same question has three unrelated answers and two missing ones:
--
--   attendance    profiles.attendance_excluded, a boolean on the profile, set
--                 from the people editor
--   standup       standup_role_settings (a default per role) plus
--                 standup_participants (a per-person override) -- the only one
--                 of the three that is actually modelled
--   gamification  no per-person setting at all; you remove a permission, which
--                 also takes away everything else that permission carried
--   timesheet     nothing
--   task timer    nothing
--
-- The standup shape is the right one, so this generalises it rather than
-- inventing a fourth: a default per role, an optional override per person, and
-- one resolver every module asks. Adding a module later is a row, not a column
-- and a migration.
--
-- EXPAND phase, per the migration rules. The existing columns and tables stay
-- authoritative for the code that reads them today, and triggers keep them in
-- step with this. Nothing reads through fn_participates yet; a later migration
-- moves the readers over and a third drops the old shapes.

CREATE TABLE IF NOT EXISTS participation_modules (
  key         text PRIMARY KEY,
  label       text NOT NULL,
  description text,
  sort_order  int  NOT NULL DEFAULT 0
);

INSERT INTO participation_modules (key, label, description, sort_order) VALUES
  ('attendance',   'Attendance',   'Expected to check in, and counted on the daily roster.', 1),
  ('standup',      'Standup',      'Expected to submit a daily standup.',                    2),
  ('timesheet',    'Timesheet',    'Appears on the timesheet and owes hours for the day.',   3),
  ('task_timer',   'Task timer',   'Can run the timer, and their time counts in reports.',   4),
  ('gamification', 'Gamification', 'Earns points, appears on the leaderboard, can claim quests.', 5)
ON CONFLICT (key) DO NOTHING;

-- Defaults per role. Absent means "yes": a new role takes part in everything
-- until somebody says otherwise, which is the safer direction to be wrong in
-- for attendance and the timesheet.
CREATE TABLE IF NOT EXISTS participation_role_defaults (
  module_key  text        NOT NULL REFERENCES participation_modules(key) ON DELETE CASCADE,
  role        text        NOT NULL,
  is_required boolean     NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  PRIMARY KEY (module_key, role)
);

-- One person, one module, one deliberate exception. The note is why: an
-- exclusion nobody can explain six months later is the reason these get
-- reverted by mistake.
CREATE TABLE IF NOT EXISTS participation_overrides (
  module_key  text        NOT NULL REFERENCES participation_modules(key) ON DELETE CASCADE,
  profile_id  uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_required boolean     NOT NULL,
  note        text,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  PRIMARY KEY (module_key, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_participation_overrides_profile
  ON participation_overrides (profile_id);

-- ── The one resolver ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_participates(p_profile uuid, p_module text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT po.is_required FROM participation_overrides po
      WHERE po.profile_id = p_profile AND po.module_key = p_module),
    (SELECT prd.is_required FROM participation_role_defaults prd
      JOIN profiles pr ON pr.id = p_profile
     WHERE prd.role = pr.role AND prd.module_key = p_module),
    true
  );
$$;

COMMENT ON FUNCTION public.fn_participates(uuid, text) IS
  'Does this person take part in this module? Person override beats role default beats yes.';

-- ── Bring the three existing mechanisms in ───────────────────────────────────
INSERT INTO participation_overrides (module_key, profile_id, is_required, note)
SELECT 'attendance', p.id, false, 'Migrated from profiles.attendance_excluded'
  FROM profiles p WHERE p.attendance_excluded
ON CONFLICT DO NOTHING;

INSERT INTO participation_role_defaults (module_key, role, is_required, updated_by)
SELECT 'standup', srs.role, srs.is_required, srs.updated_by
  FROM standup_role_settings srs
ON CONFLICT DO NOTHING;

INSERT INTO participation_overrides (module_key, profile_id, is_required, note, updated_by)
SELECT 'standup', sp.profile_id, sp.is_required, sp.note, sp.updated_by
  FROM standup_participants sp
ON CONFLICT DO NOTHING;

-- ── Keep the old shapes in step ──────────────────────────────────────────────
-- Everything that asks today still asks the old way, so a change made on the new
-- screen has to land there too. Written one direction only: the new tables are
-- where changes are made, the old ones follow.
CREATE OR REPLACE FUNCTION fn_participation_sync_legacy()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_module  text := COALESCE(NEW.module_key, OLD.module_key);
  v_profile uuid := COALESCE(NEW.profile_id, OLD.profile_id);
  v_required boolean;
BEGIN
  v_required := fn_participates(v_profile, v_module);

  IF v_module = 'attendance' THEN
    UPDATE profiles SET attendance_excluded = NOT v_required
     WHERE id = v_profile AND attendance_excluded IS DISTINCT FROM (NOT v_required);

  ELSIF v_module = 'standup' THEN
    IF TG_OP = 'DELETE' THEN
      DELETE FROM standup_participants WHERE profile_id = v_profile;
    ELSE
      INSERT INTO standup_participants (profile_id, is_required, note, updated_by)
      VALUES (v_profile, NEW.is_required, NEW.note, NEW.updated_by)
      ON CONFLICT (profile_id) DO UPDATE
        SET is_required = EXCLUDED.is_required,
            note        = EXCLUDED.note,
            updated_by  = EXCLUDED.updated_by,
            updated_at  = now();
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_participation_sync ON participation_overrides;
CREATE TRIGGER trg_participation_sync
  AFTER INSERT OR UPDATE OR DELETE ON participation_overrides
  FOR EACH ROW EXECUTE FUNCTION fn_participation_sync_legacy();

CREATE OR REPLACE FUNCTION fn_participation_sync_role_legacy()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(NEW.module_key, OLD.module_key) = 'standup' THEN
    IF TG_OP = 'DELETE' THEN
      DELETE FROM standup_role_settings WHERE role = OLD.role;
    ELSE
      INSERT INTO standup_role_settings (role, is_required, updated_by)
      VALUES (NEW.role, NEW.is_required, NEW.updated_by)
      ON CONFLICT (role) DO UPDATE
        SET is_required = EXCLUDED.is_required,
            updated_by  = EXCLUDED.updated_by,
            updated_at  = now();
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_participation_role_sync ON participation_role_defaults;
CREATE TRIGGER trg_participation_role_sync
  AFTER INSERT OR UPDATE OR DELETE ON participation_role_defaults
  FOR EACH ROW EXECUTE FUNCTION fn_participation_sync_role_legacy();

-- ── Access ───────────────────────────────────────────────────────────────────
ALTER TABLE participation_modules       ENABLE ROW LEVEL SECURITY;
ALTER TABLE participation_role_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE participation_overrides     ENABLE ROW LEVEL SECURITY;

-- Readable by everyone internal: "am I expected to submit a standup" is a
-- question the portal already answers on the person's own screens.
DROP POLICY IF EXISTS p_participation_modules_select ON participation_modules;
CREATE POLICY p_participation_modules_select ON participation_modules FOR SELECT USING (is_internal());

DROP POLICY IF EXISTS p_participation_defaults_select ON participation_role_defaults;
CREATE POLICY p_participation_defaults_select ON participation_role_defaults FOR SELECT USING (is_internal());

DROP POLICY IF EXISTS p_participation_overrides_select ON participation_overrides;
CREATE POLICY p_participation_overrides_select ON participation_overrides FOR SELECT USING (is_internal());

-- Written by whoever manages people. One key rather than five, which is the
-- point of putting them on one screen.
DROP POLICY IF EXISTS p_participation_defaults_write ON participation_role_defaults;
CREATE POLICY p_participation_defaults_write ON participation_role_defaults FOR ALL
  USING     (is_internal() AND has_feature('can_manage_people'))
  WITH CHECK (is_internal() AND has_feature('can_manage_people'));

DROP POLICY IF EXISTS p_participation_overrides_write ON participation_overrides;
CREATE POLICY p_participation_overrides_write ON participation_overrides FOR ALL
  USING     (is_internal() AND has_feature('can_manage_people'))
  WITH CHECK (is_internal() AND has_feature('can_manage_people'));

REVOKE ALL ON FUNCTION fn_participation_sync_legacy()      FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION fn_participation_sync_role_legacy() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_participates(uuid, text)  FROM public, anon;
GRANT EXECUTE ON FUNCTION public.fn_participates(uuid, text) TO authenticated;

-- ── Correction, applied as 20260829171000_participation_wire_gamification ────
-- Gamification DOES have a per-person switch after all: profiles.is_restricted,
-- set through set_participation_restriction() and gated on
-- can_govern_gamification. It was missed because it is named for restriction
-- rather than participation and lives nowhere near the other two, which is
-- rather the point of putting them on one screen. Without the sync below, the
-- gamification column of the grid wrote a row that governed nothing.
