-- BD daily updates, made into an actual module.
--
-- What was wrong:
--   • Nobody was *required* to file one. The page listed everyone bd_people()
--     returned — i.e. everyone holding can_view_bd, which includes admins
--     through the 'administrator' wildcard — and named them in "still waiting
--     on". An admin who is not a business developer was chased for a check-in
--     they were never expected to write.
--   • There was no history. The page offered Today and Yesterday and nothing
--     else, so an author could not read back their own past updates.
--   • Amendments were unbounded. bd_daily_updates upserts on
--     (rep_id, update_date) and the UPDATE policy allowed any row you own, for
--     any date, forever.
--   • A lead had no view of the team's updates distinct from everyone's.
--
-- Obligation is modelled separately from capability, on purpose. See
-- fn_bd_update_required below.

-- ── Capabilities ─────────────────────────────────────────────────────────────
-- 27/28 keeps them next to can_view_bd (25) and can_manage_bd (26).
INSERT INTO permissions (key, label, category, sort_order, description) VALUES
  ('can_submit_bd_updates', 'Submit BD daily updates', 'Business Development', 27,
   'Expected to file a daily business-development check-in, and able to write one.'),
  ('can_view_bd_team_updates', 'View the team''s BD daily updates', 'Business Development', 28,
   'Read every BD daily update, not only your own, and see who has not filed one.')
ON CONFLICT (key) DO NOTHING;

-- A rep files their own; a BD manager files and reads the department's.
INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, 'can_submit_bd_updates' FROM roles r WHERE r.slug IN ('bd_rep', 'bd_manager')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, 'can_view_bd_team_updates' FROM roles r WHERE r.slug = 'bd_manager'
ON CONFLICT DO NOTHING;

-- Portal admins oversee the department without being part of it: they read the
-- updates and are deliberately NOT granted can_submit_bd_updates, which is the
-- whole point of splitting the two keys.
INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, 'can_view_bd_team_updates' FROM roles r WHERE r.slug = 'admin'
ON CONFLICT DO NOTHING;

-- ── Per-person override ──────────────────────────────────────────────────────
-- Same shape as standup_participants: a role default, overridable for one
-- person, so exempting somebody for a month is not a role edit.
CREATE TABLE IF NOT EXISTS bd_update_participants (
  profile_id  uuid        PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  is_required boolean     NOT NULL,
  note        text,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid        REFERENCES profiles(id) ON DELETE SET NULL
);

COMMENT ON TABLE bd_update_participants IS
  'Per-person override for "must file a BD daily update". Absent row = follow the can_submit_bd_updates grant.';

ALTER TABLE bd_update_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_bd_update_participants_select ON bd_update_participants
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY p_bd_update_participants_write ON bd_update_participants
  FOR ALL USING (has_feature('can_manage_bd')) WITH CHECK (has_feature('can_manage_bd'));

-- ── Who owes an update ───────────────────────────────────────────────────────
-- Note what this does NOT use: has_feature(), which resolves the
-- 'administrator' wildcard and so answers true for every super admin. That is
-- correct for a capability ("may I write one?") and wrong for an obligation
-- ("am I chased for one?") — inheriting the wildcard would recreate exactly the
-- bug this migration exists to fix, one rank higher. So the role default is read
-- as a literal grant of can_submit_bd_updates, and nothing else counts.
CREATE OR REPLACE FUNCTION fn_bd_update_required(p_profile uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT COALESCE((SELECT p.is_active FROM profiles p WHERE p.id = p_profile), false)
     AND COALESCE(
           (SELECT bp.is_required FROM bd_update_participants bp WHERE bp.profile_id = p_profile),
           EXISTS (
             SELECT 1
               FROM profile_roles pr
               JOIN role_permissions rp ON rp.role_id = pr.role_id
              WHERE pr.profile_id = p_profile
                AND rp.permission_key = 'can_submit_bd_updates'
           ),
           false)
$fn$;

COMMENT ON FUNCTION fn_bd_update_required(uuid) IS
  'Is this person expected to file a BD daily update? Override first, then a literal can_submit_bd_updates grant. Deliberately ignores the administrator wildcard.';

CREATE OR REPLACE FUNCTION am_i_bd_update_participant()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT fn_bd_update_required(auth.uid())
$fn$;

-- ── The submission window ────────────────────────────────────────────────────
-- "Editable within that day until 11:59pm" is enforced here rather than in the
-- form, because the form is the one place a rule like this cannot live: the
-- client clock is the thing being checked. The company timezone is the one the
-- rest of attendance already runs on.
CREATE OR REPLACE FUNCTION fn_bd_update_today()
RETURNS date LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT (now() AT TIME ZONE COALESCE((SELECT timezone FROM attendance_settings LIMIT 1), 'Asia/Karachi'))::date
$fn$;

CREATE OR REPLACE FUNCTION fn_bd_update_window_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_today date := fn_bd_update_today();
BEGIN
  -- A BD manager corrects the record after the fact; that is the escape hatch,
  -- and it is a permission rather than a role so a lead can be given it.
  IF has_feature('can_manage_bd') THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.update_date > v_today THEN
      RAISE EXCEPTION 'bd_update_future_date';
    END IF;
    IF NEW.update_date < v_today THEN
      RAISE EXCEPTION 'bd_update_window_closed';
    END IF;
  ELSE
    -- Backdating an existing row out of (or into) the open window would let the
    -- date column be used to reopen a closed one.
    IF NEW.update_date <> OLD.update_date THEN
      RAISE EXCEPTION 'bd_update_date_immutable';
    END IF;
    IF OLD.update_date <> v_today THEN
      RAISE EXCEPTION 'bd_update_window_closed';
    END IF;
  END IF;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_bd_update_window ON bd_daily_updates;
CREATE TRIGGER trg_bd_update_window
  BEFORE INSERT OR UPDATE ON bd_daily_updates
  FOR EACH ROW EXECUTE FUNCTION fn_bd_update_window_guard();

-- Deleting a closed day is the same act as editing it.
CREATE OR REPLACE FUNCTION fn_bd_update_delete_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF has_feature('can_manage_bd') THEN RETURN OLD; END IF;
  IF OLD.update_date <> fn_bd_update_today() THEN
    RAISE EXCEPTION 'bd_update_window_closed';
  END IF;
  RETURN OLD;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_bd_update_delete_window ON bd_daily_updates;
CREATE TRIGGER trg_bd_update_delete_window
  BEFORE DELETE ON bd_daily_updates
  FOR EACH ROW EXECUTE FUNCTION fn_bd_update_delete_guard();

-- An empty check-in is not a check-in. The old table let summary default to ''
-- and the only thing stopping a blank submission was a client-side check.
ALTER TABLE bd_daily_updates DROP CONSTRAINT IF EXISTS bd_daily_updates_summary_check;
ALTER TABLE bd_daily_updates ADD CONSTRAINT bd_daily_updates_summary_check
  CHECK (submitted_at IS NULL OR length(btrim(summary)) >= 10);

-- ── Reading ──────────────────────────────────────────────────────────────────
-- Narrowed from "anyone in BD reads everyone's" to "your own, plus the team's
-- if you hold the key". Only ever returns fewer rows than before, so a browser
-- on the previous bundle degrades to its own history rather than breaking.
DROP POLICY IF EXISTS p_bd_daily_updates_select ON bd_daily_updates;
CREATE POLICY p_bd_daily_updates_select ON bd_daily_updates
  FOR SELECT USING (
    rep_id = auth.uid()
    OR has_feature('can_view_bd_team_updates')
  );

-- Writing stays capability-based: has_feature() here, so a super admin filing
-- their own check-in is allowed even though nobody chases them for one.
DROP POLICY IF EXISTS p_bd_daily_updates_insert ON bd_daily_updates;
CREATE POLICY p_bd_daily_updates_insert ON bd_daily_updates
  FOR INSERT WITH CHECK (
    rep_id = auth.uid() OR has_feature('can_manage_bd')
  );

-- ── One day's roster ─────────────────────────────────────────────────────────
-- Replaces the page's client-side loop over bd_people(). Two things it knows
-- that the loop could not: who is actually required, and whether the date was a
-- working day *for that person* — a rep on their own day off is not missing.
CREATE OR REPLACE FUNCTION bd_update_roster(p_date date)
RETURNS TABLE(profile_id uuid, profile_name text, avatar_url text,
              is_required boolean, is_working_day boolean,
              update_id uuid, submitted_at timestamptz, summary text,
              platforms text[], proposals_sent integer, calls_made integer,
              meetings_held integer, leads_added integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT p.id, p.name, p.avatar_url,
         true,
         fn_is_working_day_for(p.id, p_date),
         u.id, u.submitted_at, u.summary,
         u.platforms, u.proposals_sent, u.calls_made, u.meetings_held, u.leads_added
    FROM profiles p
    LEFT JOIN bd_daily_updates u
      ON u.rep_id = p.id AND u.update_date = p_date
   WHERE p.is_active
     AND fn_bd_update_required(p.id)
     -- Own row always; the rest needs the team key. Mirrors the SELECT policy,
     -- which this SECURITY DEFINER function bypasses.
     AND (p.id = auth.uid() OR has_feature('can_view_bd_team_updates'))
   ORDER BY (u.submitted_at IS NULL) DESC, p.name;
$fn$;

-- ── One person's history ─────────────────────────────────────────────────────
-- Returns a row per date in the range, not a row per update, so the gaps are
-- visible: a day somebody was required and filed nothing is the interesting
-- row, and a list of only what exists cannot show it.
CREATE OR REPLACE FUNCTION bd_update_history(p_profile uuid, p_from date, p_to date)
RETURNS TABLE(update_date date, is_working_day boolean, is_required boolean,
              update_id uuid, submitted_at timestamptz, summary text,
              platforms text[], proposals_sent integer, calls_made integer,
              meetings_held integer, leads_added integer, can_edit boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT g.d::date,
         fn_is_working_day_for(p_profile, g.d::date),
         fn_bd_update_required(p_profile),
         u.id, u.submitted_at, u.summary,
         u.platforms, u.proposals_sent, u.calls_made, u.meetings_held, u.leads_added,
         (g.d::date = fn_bd_update_today() AND p_profile = auth.uid())
           OR has_feature('can_manage_bd')
    FROM generate_series(p_from, LEAST(p_to, fn_bd_update_today()), interval '1 day') g(d)
    LEFT JOIN bd_daily_updates u
      ON u.rep_id = p_profile AND u.update_date = g.d::date
   WHERE p_profile = auth.uid() OR has_feature('can_view_bd_team_updates')
   ORDER BY g.d DESC;
$fn$;

-- ── Settings screen ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION bd_update_participants_list()
RETURNS TABLE(profile_id uuid, profile_name text, avatar_url text, role text,
              has_grant boolean, override text, is_required boolean, note text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT p.id, p.name, p.avatar_url, p.role,
         EXISTS (
           SELECT 1 FROM profile_roles pr
             JOIN role_permissions rp ON rp.role_id = pr.role_id
            WHERE pr.profile_id = p.id AND rp.permission_key = 'can_submit_bd_updates'
         ),
         CASE
           WHEN bp.profile_id IS NULL THEN 'inherit'
           WHEN bp.is_required        THEN 'required'
           ELSE 'excluded'
         END,
         fn_bd_update_required(p.id),
         bp.note
    FROM profiles p
    LEFT JOIN bd_update_participants bp ON bp.profile_id = p.id
   WHERE p.is_active
     AND is_internal_profile(p.id)
     AND has_feature('can_manage_bd')
   ORDER BY fn_bd_update_required(p.id) DESC, p.name;
$fn$;

-- 'inherit' deletes the override rather than storing a third state, so the row
-- exists only while it is actually saying something the role default does not.
CREATE OR REPLACE FUNCTION set_bd_update_participant(p_profile uuid, p_mode text, p_note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NOT has_feature('can_manage_bd') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_mode NOT IN ('inherit', 'required', 'excluded') THEN RAISE EXCEPTION 'invalid_mode'; END IF;
  IF NOT is_internal_profile(p_profile) THEN RAISE EXCEPTION 'invalid_profile'; END IF;

  IF p_mode = 'inherit' THEN
    DELETE FROM bd_update_participants WHERE profile_id = p_profile;
    RETURN;
  END IF;

  INSERT INTO bd_update_participants (profile_id, is_required, note, updated_by)
  VALUES (p_profile, p_mode = 'required', p_note, auth.uid())
  ON CONFLICT (profile_id) DO UPDATE
    SET is_required = EXCLUDED.is_required,
        note        = EXCLUDED.note,
        updated_by  = EXCLUDED.updated_by,
        updated_at  = now();
END;
$fn$;

-- ── Grants ───────────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION fn_bd_update_window_guard() FROM PUBLIC;
REVOKE ALL ON FUNCTION fn_bd_update_delete_guard() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION am_i_bd_update_participant()                        TO authenticated;
GRANT EXECUTE ON FUNCTION bd_update_roster(date)                              TO authenticated;
GRANT EXECUTE ON FUNCTION bd_update_history(uuid, date, date)                 TO authenticated;
GRANT EXECUTE ON FUNCTION bd_update_participants_list()                       TO authenticated;
GRANT EXECUTE ON FUNCTION set_bd_update_participant(uuid, text, text)         TO authenticated;

CREATE INDEX IF NOT EXISTS idx_bd_daily_updates_rep_date
  ON bd_daily_updates (rep_id, update_date DESC);
