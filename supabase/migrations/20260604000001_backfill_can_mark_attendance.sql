-- Backfill `can_mark_attendance` for all internal staff roles.
--
-- This flag was originally seeded as an admin-only gate ("mark others'
-- attendance"), so only super_admin/admin/hr received it. It was later
-- repurposed to gate the self check-in card ("Mark Own Attendance"), which
-- every internal role needs. The seed was never backfilled, so employees and
-- project_managers had no row at all (defaulting to hidden) and team_lead /
-- finance were left explicitly false.
--
-- Grant it to all internal roles. ON CONFLICT keeps this idempotent and flips
-- the existing false rows (team_lead, finance) to true.
INSERT INTO role_feature_flags (role, feature_key, enabled) VALUES
  ('employee',        'can_mark_attendance', true),
  ('project_manager', 'can_mark_attendance', true),
  ('team_lead',       'can_mark_attendance', true),
  ('finance',         'can_mark_attendance', true)
ON CONFLICT (role, feature_key) DO UPDATE SET enabled = EXCLUDED.enabled;
