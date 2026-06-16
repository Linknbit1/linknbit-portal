-- Link Points (LP) for arriving early / on time.
-- This is already wired: trg_attendance_xp -> fn_attendance_xp() awards
-- attendance_settings.xp_on_time_checkin LP on every 'present' self check-in
-- (status is 'present' only when checked in by work_start + grace, i.e. early/on-time).
-- Per product decision, the award is 3 LP. This only changes the configured amount;
-- the existing trigger and the xp_transactions -> fn_apply_xp_transaction wallet credit
-- are unchanged. Late check-ins (status 'late') and WFH/leave rows earn nothing.
ALTER TABLE attendance_settings
  ALTER COLUMN xp_on_time_checkin SET DEFAULT 3;

UPDATE attendance_settings
  SET xp_on_time_checkin = 3;
