-- Teams table — referenced by profiles.team_id
CREATE TABLE teams (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  service_type text NOT NULL CHECK (service_type IN ('design', 'development', 'marketing')),
  lead_id      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_teams_internal_select ON teams
  FOR SELECT USING (is_internal());

CREATE POLICY p_teams_admin_write ON teams
  FOR ALL
  USING     (current_user_role() = ANY (ARRAY['super_admin', 'admin', 'hr']))
  WITH CHECK (current_user_role() = ANY (ARRAY['super_admin', 'admin', 'hr']));

-- Wire the FK that profiles declared but couldn't create until teams existed
ALTER TABLE profiles
  ADD CONSTRAINT profiles_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL;
