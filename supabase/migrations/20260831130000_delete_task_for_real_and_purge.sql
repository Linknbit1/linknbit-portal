-- Deleting a task now removes it, and the rows left behind by the old soft
-- delete are cleared out.
--
-- 20260831120000 did this for projects. A task was the other half: it stayed as
-- a row with `deleted_at` set while its comments, files and subtasks were
-- already gone for good, so what remained was a husk nothing could reach — the
-- lists filter it out and there is no screen to find it on.
--
-- As with projects, the deletion is one statement and the schema does the rest.
-- Every child of `tasks` already carries ON DELETE CASCADE, including the two
-- this function never learned about — task_reviewers and task_watchers, added
-- after it was written and left pointing at tasks that were meant to be gone.
--
-- ── One consequence worth stating plainly ───────────────────────────────────
-- task_time_entries cascades. Deleting a task now erases the hours logged
-- against it, and they leave the timesheet with it. That is the price of the
-- row actually going; if logged time should outlive the work it was logged
-- against, it needs somewhere to live that is not a foreign key to `tasks`.

-- ── The rule, over permissions rather than role names ────────────────────────
-- The set is unchanged: super_admin, admin, project_manager and team_lead all
-- hold can_manage_projects, which is what the old list of four names meant.
CREATE OR REPLACE FUNCTION public.delete_task_cascade(p_task_id uuid)
RETURNS text[]
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_task        record;
  v_paths       text[];
  v_task_ids    uuid[];
  v_comment_ids uuid[];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT id, project_id, assignee_id
    INTO v_task
    FROM tasks
   WHERE id = p_task_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'task_not_found';
  END IF;

  IF NOT (
    is_internal()
    AND (
      has_feature('can_manage_projects')
      OR is_project_member(v_task.project_id)
      OR v_task.assignee_id = auth.uid()
      OR is_task_assignee(p_task_id)
    )
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- The task and anything filed under it: a subtask is a task row of its own,
  -- and it cascades away with its parent, files included.
  SELECT array_agg(id)
    INTO v_task_ids
    FROM tasks
   WHERE id = p_task_id OR parent_task_id = p_task_id;

  -- `storage_path IS NOT NULL` because an attachment can be a link with no file
  -- behind it, and one null makes the caller's storage request reject the batch.
  SELECT coalesce(array_agg(storage_path), '{}')
    INTO v_paths
    FROM attachments
   WHERE storage_path IS NOT NULL
     AND task_id = ANY(v_task_ids);

  -- Mentions are keyed to the project, not the task, so nothing cascades them.
  SELECT coalesce(array_agg(id), '{}')
    INTO v_comment_ids
    FROM comments
   WHERE task_id = ANY(v_task_ids);

  DELETE FROM mentions
   WHERE (source_type = 'comment' AND source_id = ANY(v_comment_ids))
      OR (source_type = 'task' AND source_id = ANY(v_task_ids));

  -- Notifications name their subject by id in a text column, with no key to
  -- cascade through. Left behind they are links to a 404.
  DELETE FROM notifications
   WHERE resource_type = 'task'
     AND resource_id = ANY(v_task_ids::text[]);

  DELETE FROM tasks WHERE id = p_task_id;

  RETURN v_paths;
END;
$$;

COMMENT ON FUNCTION public.delete_task_cascade(uuid) IS
  'Permanently deletes a task, its subtasks and everything hanging off them, returning the storage paths the caller must remove. Not recoverable.';

REVOKE ALL ON FUNCTION public.delete_task_cascade(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.delete_task_cascade(uuid) TO authenticated;

-- ── Clearing out what the old soft delete left ───────────────────────────────
-- These rows are unreachable: every list filters `deleted_at`, no screen reads
-- can_view_deleted_projects, and their comments and files were hard-deleted at
-- the time. What is left is the husk and, on the tasks, the hours logged
-- against them.
--
-- Their attachment rows are already gone, so there are no storage objects to
-- chase — a migration could not remove those anyway.
DELETE FROM mentions
 WHERE source_type = 'task'
   AND source_id IN (SELECT id FROM tasks WHERE deleted_at IS NOT NULL);

DELETE FROM notifications
 WHERE resource_type = 'task'
   AND resource_id IN (SELECT id::text FROM tasks WHERE deleted_at IS NOT NULL);

DELETE FROM notifications
 WHERE resource_type = 'project'
   AND resource_id IN (SELECT id::text FROM projects WHERE deleted_at IS NOT NULL);

DELETE FROM tasks WHERE deleted_at IS NOT NULL;
DELETE FROM projects WHERE deleted_at IS NOT NULL;

-- `deleted_at` / `deleted_by` are left on both tables on purpose. Deployed
-- clients still read them and still filter on them, and an always-null column
-- costs nothing; dropping them is a separate contract migration for after the
-- front end that no longer mentions them is live.
