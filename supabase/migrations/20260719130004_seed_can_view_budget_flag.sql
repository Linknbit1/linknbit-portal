-- Soft UI gate for the sensitive project budget field. Management + Finance may
-- see it; employees may not. Admins can fine-tune per role in Settings → Roles.
INSERT INTO role_feature_flags (role, feature_key, enabled) VALUES
  ('super_admin',     'can_view_budget', true),
  ('admin',           'can_view_budget', true),
  ('hr',              'can_view_budget', true),
  ('project_manager', 'can_view_budget', true),
  ('team_lead',       'can_view_budget', true),
  ('finance',         'can_view_budget', true),
  ('employee',        'can_view_budget', false)
ON CONFLICT (role, feature_key) DO NOTHING;
