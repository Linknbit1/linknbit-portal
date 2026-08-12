-- Projects start as To Do, not In Progress.
--
-- The board had no column for "created, nobody has started it". Every new
-- project landed in In Progress, which made the one status that should mean
-- "work is happening" mean "a row exists" — and left the board unable to show
-- what is queued.
--
-- Existing rows are left alone: an in_progress project today may well be in
-- progress, and this migration has no way to tell which. Only the default for
-- new ones changes.

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE projects ADD CONSTRAINT projects_status_check
  CHECK (status IN ('todo', 'in_progress', 'blocked', 'awaiting_client', 'completed', 'on_hold', 'ongoing'));

ALTER TABLE projects ALTER COLUMN status SET DEFAULT 'todo';

COMMENT ON COLUMN projects.status IS
  'todo (default, nothing started) → in_progress / ongoing → awaiting_client / blocked / on_hold → completed.';
