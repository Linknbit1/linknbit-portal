-- Chat permission flags, seeded the same way as can_create_projects
-- (20260721120000_can_create_projects_flag.sql): administrable from
-- Settings → Permissions afterwards, not hardcoded role lists.
--
-- can_create_channels:      who may create a real (named) channel.
--                           DMs/group DMs need no flag — any internal user
--                           may start one with anyone.
-- can_manage_all_channels:  admin bypass — add/remove members, rename,
--                           archive ANY channel regardless of ownership.
-- can_delete_any_message:   moderation — remove someone else's message
--                           (soft-delete only, never edit its content).

INSERT INTO role_feature_flags (role, feature_key, enabled) VALUES
  ('super_admin',     'can_create_channels', true),
  ('admin',           'can_create_channels', true),
  ('hr',              'can_create_channels', false),
  ('project_manager', 'can_create_channels', true),
  ('team_lead',       'can_create_channels', true),
  ('employee',        'can_create_channels', false),
  ('finance',         'can_create_channels', false),

  ('super_admin',     'can_manage_all_channels', true),
  ('admin',           'can_manage_all_channels', true),
  ('hr',              'can_manage_all_channels', false),
  ('project_manager', 'can_manage_all_channels', false),
  ('team_lead',       'can_manage_all_channels', false),
  ('employee',        'can_manage_all_channels', false),
  ('finance',         'can_manage_all_channels', false),

  ('super_admin',     'can_delete_any_message', true),
  ('admin',           'can_delete_any_message', true),
  ('hr',              'can_delete_any_message', true),
  ('project_manager', 'can_delete_any_message', false),
  ('team_lead',       'can_delete_any_message', false),
  ('employee',        'can_delete_any_message', false),
  ('finance',         'can_delete_any_message', false)
ON CONFLICT (role, feature_key) DO UPDATE SET enabled = EXCLUDED.enabled;
