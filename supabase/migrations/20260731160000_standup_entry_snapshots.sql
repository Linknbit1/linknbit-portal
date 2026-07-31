-- Standup entries should LINK to a project/task but survive their deletion —
-- the backlog needs a record of what was worked on even after the project or
-- task is gone. Two changes make that true:
--
--   1. Snapshot the project/task NAME onto each entry at write time, so the text
--      record persists independently of the FK.
--   2. Detach instead of destroy on delete: project_id becomes nullable and its
--      FK switches from ON DELETE CASCADE (which erased the whole entry) to
--      ON DELETE SET NULL. task_id was already ON DELETE SET NULL.
--
-- Result: a hard-deleted project nulls project_id but keeps the row + project_name;
-- a soft-deleted project (the normal path) keeps the FK intact, and the UI falls
-- back to project_name when the live project is hidden by RLS.

-- ── 1. Snapshot columns ─────────────────────────────────────────────────────────
ALTER TABLE standup_entries
  ADD COLUMN IF NOT EXISTS project_name text,
  ADD COLUMN IF NOT EXISTS task_name    text;

COMMENT ON COLUMN standup_entries.project_name IS
  'Project name captured at submission; the durable backlog record if the project is later deleted.';
COMMENT ON COLUMN standup_entries.task_name IS
  'Task title captured at submission; the durable backlog record if the task is later deleted.';

-- Backfill existing rows from the still-present projects/tasks (soft-deleted rows
-- still exist, so their names are captured too).
UPDATE standup_entries e
   SET project_name = p.name
  FROM projects p
 WHERE p.id = e.project_id AND e.project_name IS NULL;

UPDATE standup_entries e
   SET task_name = t.title
  FROM tasks t
 WHERE t.id = e.task_id AND e.task_name IS NULL;

-- ── 2. Capture the name on every insert ─────────────────────────────────────────
-- Entries are always freshly inserted (submit, and update_standup which replaces
-- them wholesale), so a BEFORE INSERT trigger keeps the snapshot authoritative
-- and current without touching either RPC. SECURITY DEFINER so it can read the
-- names regardless of the caller's RLS.
CREATE OR REPLACE FUNCTION public.fn_standup_entry_snapshot()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.project_id IS NOT NULL THEN
    SELECT name INTO NEW.project_name FROM projects WHERE id = NEW.project_id;
  END IF;
  IF NEW.task_id IS NOT NULL THEN
    SELECT title INTO NEW.task_name FROM tasks WHERE id = NEW.task_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_standup_entry_snapshot ON standup_entries;
CREATE TRIGGER trg_standup_entry_snapshot
  BEFORE INSERT ON standup_entries
  FOR EACH ROW EXECUTE FUNCTION public.fn_standup_entry_snapshot();

-- ── 3. Detach instead of destroy ────────────────────────────────────────────────
ALTER TABLE standup_entries ALTER COLUMN project_id DROP NOT NULL;

ALTER TABLE standup_entries DROP CONSTRAINT IF EXISTS standup_entries_project_id_fkey;
ALTER TABLE standup_entries ADD CONSTRAINT standup_entries_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
