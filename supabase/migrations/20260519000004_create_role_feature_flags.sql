-- UI/action-level gates per role, admin-configurable.
-- NOT a security boundary — RLS handles data security.
-- Gates UI visibility and soft action checks (show/hide buttons, pages).
-- Fetched once on app load; admins toggle from Settings → Roles.
CREATE TABLE role_feature_flags (
  role         text        NOT NULL,
  feature_key  text        NOT NULL,
  enabled      boolean     NOT NULL DEFAULT false,
  updated_by   uuid        REFERENCES profiles(id),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role, feature_key)
);

ALTER TABLE role_feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_rff_internal_select ON role_feature_flags FOR SELECT
  USING (is_internal());

CREATE POLICY p_rff_admin_write ON role_feature_flags FOR ALL
  USING  (current_user_role() IN ('super_admin', 'admin'))
  WITH CHECK (current_user_role() IN ('super_admin', 'admin'));

-- ── Seed defaults ──────────────────────────────────────────────────────────────

INSERT INTO role_feature_flags (role, feature_key, enabled) VALUES
  -- Reports page
  ('super_admin',     'can_view_reports',        true),
  ('admin',           'can_view_reports',        true),
  ('project_manager', 'can_view_reports',        true),
  ('team_lead',       'can_view_reports',        false),
  ('employee',        'can_view_reports',        false),
  ('hr',              'can_view_reports',        true),
  ('finance',         'can_view_reports',        true),

  -- Task approval
  ('super_admin',     'can_approve_tasks',       true),
  ('admin',           'can_approve_tasks',       true),
  ('project_manager', 'can_approve_tasks',       true),
  ('team_lead',       'can_approve_tasks',       false),
  ('employee',        'can_approve_tasks',       false),
  ('hr',              'can_approve_tasks',       false),
  ('finance',         'can_approve_tasks',       false),

  -- Project deletion (soft-delete)
  ('super_admin',     'can_delete_projects',     true),
  ('admin',           'can_delete_projects',     true),
  ('project_manager', 'can_delete_projects',     false),
  ('hr',              'can_delete_projects',     false),
  ('finance',         'can_delete_projects',     false),

  -- Client management
  ('super_admin',     'can_manage_clients',      true),
  ('admin',           'can_manage_clients',      true),
  ('project_manager', 'can_manage_clients',      false),
  ('finance',         'can_manage_clients',      false),
  ('hr',              'can_manage_clients',      false),

  -- Finance read-only gates
  ('finance',         'can_view_clients',        true),
  ('finance',         'can_view_projects',       true),

  -- Reward shop management
  ('super_admin',     'can_manage_rewards',      true),
  ('admin',           'can_manage_rewards',      true),
  ('hr',              'can_manage_rewards',      false),
  ('finance',         'can_manage_rewards',      false),

  -- Attendance admin (mark others' attendance)
  ('super_admin',     'can_mark_attendance',     true),
  ('admin',           'can_mark_attendance',     true),
  ('hr',              'can_mark_attendance',     true),
  ('team_lead',       'can_mark_attendance',     false),
  ('finance',         'can_mark_attendance',     false),

  -- Attendance reports (view all employees' records)
  ('super_admin',     'can_view_all_attendance', true),
  ('admin',           'can_view_all_attendance', true),
  ('hr',              'can_view_all_attendance', true),
  ('project_manager', 'can_view_all_attendance', false),
  ('team_lead',       'can_view_all_attendance', false),
  ('finance',         'can_view_all_attendance', false),

  -- People management (invite/deactivate employees)
  ('super_admin',     'can_manage_people',       true),
  ('admin',           'can_manage_people',       true),
  ('hr',              'can_manage_people',       true),
  ('project_manager', 'can_manage_people',       false),
  ('finance',         'can_manage_people',       false),

  -- XP granting
  ('super_admin',     'can_grant_xp',            true),
  ('admin',           'can_grant_xp',            true),
  ('project_manager', 'can_grant_xp',            false),
  ('hr',              'can_grant_xp',            false),
  ('finance',         'can_grant_xp',            false),

  -- ClickUp / integration settings
  ('super_admin',     'can_manage_integrations', true),
  ('admin',           'can_manage_integrations', true),
  ('hr',              'can_manage_integrations', false),
  ('finance',         'can_manage_integrations', false);
