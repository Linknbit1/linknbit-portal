-- "Create project" becomes a real capability.
--
-- p_projects_insert hardcoded ('super_admin','admin','project_manager'), while the UI
-- offered the button more widely — a team lead clicking "Create your first project"
-- got a 403 from RLS. Now both sides read the same flag, so the set of roles that may
-- create projects is administrable from Settings → Permissions.
--
-- Seeded to preserve today's behaviour exactly: super_admin/admin/project_manager only.
-- Grant it to team_lead from the Permissions matrix if you want them creating projects.

INSERT INTO role_feature_flags (role, feature_key, enabled) VALUES
  ('super_admin',     'can_create_projects', true),
  ('admin',           'can_create_projects', true),
  ('project_manager', 'can_create_projects', true),
  ('hr',              'can_create_projects', false),
  ('team_lead',       'can_create_projects', false),
  ('employee',        'can_create_projects', false),
  ('finance',         'can_create_projects', false)
ON CONFLICT (role, feature_key) DO UPDATE SET enabled = EXCLUDED.enabled;

DROP POLICY IF EXISTS p_projects_insert ON projects;
CREATE POLICY p_projects_insert ON projects
  FOR INSERT WITH CHECK (has_feature('can_create_projects'));
