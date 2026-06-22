-- ════════════════════════════════════════════════════════════════════
-- Many-to-many team membership. Replaces the single profiles.team_id FK
-- (dropped in a later migration) so an employee can belong to several teams.
-- Existing single-team assignments are backfilled here before team_id goes.
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE team_members (
  team_id    uuid        NOT NULL REFERENCES teams(id)    ON DELETE CASCADE,
  profile_id uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, profile_id)
);

CREATE INDEX idx_team_members_profile ON team_members(profile_id);

-- Backfill existing single-team memberships before profiles.team_id is dropped.
INSERT INTO team_members (team_id, profile_id)
  SELECT team_id, id FROM profiles WHERE team_id IS NOT NULL
  ON CONFLICT DO NOTHING;

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Read: any internal user (rosters appear across Teams/People pages).
CREATE POLICY p_team_members_select ON team_members FOR SELECT USING (is_internal());

-- Write: same authority that manages teams today (super_admin/admin/hr).
-- References only current_user_role() (SECURITY DEFINER over profiles by
-- auth.uid()), never team_members itself, so no RLS recursion.
CREATE POLICY p_team_members_write ON team_members FOR ALL
  USING     (current_user_role() IN ('super_admin','admin','hr'))
  WITH CHECK (current_user_role() IN ('super_admin','admin','hr'));
