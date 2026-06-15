-- Attendance settings are managed by HR, but the write policy only allowed
-- admin / super_admin. HR updates therefore matched 0 rows and the
-- `.select().single()` in updateAttendanceSettings() threw PGRST116.
-- Grant the `hr` role write access alongside admin / super_admin.

alter policy p_attendance_settings_write on public.attendance_settings
  using (current_user_role() = any (array['admin', 'super_admin', 'hr']))
  with check (current_user_role() = any (array['admin', 'super_admin', 'hr']));
