-- Discard attendance feature flags.
--
-- Attendance access is now decided purely by role in the app: Super Admin /
-- Admin / HR get the full management view with every feature, and all other
-- roles get the employee self-service view. The per-role attendance feature
-- flags are no longer read anywhere, so remove them from role_feature_flags.
DELETE FROM role_feature_flags
WHERE feature_key IN (
  'can_mark_attendance',
  'can_manage_attendance',
  'can_manage_attendance_settings',
  'can_manage_wfh',
  'can_manage_exceptions',
  'can_manage_schedule',
  'can_manage_overtime',
  'can_view_attendance_reports',
  'can_view_all_attendance'
);
