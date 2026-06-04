-- The live attendance_source_check had been narrowed to ('self','admin'), but
-- the WFH/leave sync triggers and the daily absence job all insert rows with
-- source = 'system'. Restore 'system' as a valid source.
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_source_check;
ALTER TABLE attendance ADD CONSTRAINT attendance_source_check
  CHECK (source IN ('self', 'admin', 'system'));
