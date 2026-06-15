-- Allow Saturday to be configured as a regular workday
-- When false (default) Saturday is a weekend; when true check-in is permitted normally
ALTER TABLE attendance_settings
  ADD COLUMN saturday_working boolean NOT NULL DEFAULT false;
