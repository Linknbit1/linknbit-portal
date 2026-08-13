-- How a time entry got here: a running timer, or someone typing it in after the
-- fact. The backlog has to say which — "3h logged by hand yesterday" and "3h
-- the system watched tick by" are not the same claim, and only one of them is
-- evidence.
--
-- It could not be inferred at read time: a manual entry and a stopped timer are
-- the same shape once written (started_at + ended_at both set). The insert is
-- the only moment that knows.

ALTER TABLE task_time_entries
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'timer'
  CHECK (source IN ('timer', 'manual'));

COMMENT ON COLUMN task_time_entries.source IS
  'timer = started and stopped by the app clock; manual = entered by hand via Log time.';

-- Backfill from the audit trail, which has recorded exactly this distinction
-- since 2026-08-04 (fn_audit_time_entry flags an INSERT that already had an
-- ended_at as time.logged_manually). Entries older than that trigger stay
-- 'timer' — nothing recorded how they were created, and guessing would put a
-- claim in the log that no evidence supports.
UPDATE task_time_entries t
   SET source = 'manual'
  FROM audit_log a
 WHERE a.table_name = 'task_time_entries'
   AND a.action     = 'time.logged_manually'
   AND a.record_id  = t.id
   AND t.source     = 'timer';
