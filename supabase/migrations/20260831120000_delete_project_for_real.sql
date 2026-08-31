-- Deleting a project now removes it, rather than hiding it.
--
-- delete_project_cascade hard-deleted everything hanging off a project —
-- comments, attachments, stages, staffing — and then only stamped `deleted_at`
-- on the project and its tasks. So the expensive half was already irreversible
-- while the row itself lingered, invisible: `can_view_deleted_projects` gates
-- it in RLS and nothing in the app reads that permission, so there was no
-- screen to find it on and no way to restore it. A soft delete nobody can undo
-- is a hard delete that leaves litter.
--
-- Now the row goes. Every child table already carries ON DELETE CASCADE, so the
-- statement is one DELETE and the schema does the work — which also means a
-- table added later is cleaned up without anyone remembering to edit this
-- function. That is what went wrong with task_reviewers and task_watchers:
-- added after this function was written, never added to it, left pointing at
-- tasks that were meant to be gone.
--
-- Deliberately kept:
--   audit_log        no foreign keys at all — a record of what happened,
--                    including this deletion
--   xp_transactions  points already awarded stay awarded; task_id is nullable
--                    and unconstrained, so it simply goes stale
--   standup_entries  history of what somebody said they did that day, with the
--                    project reference dropped (ON DELETE SET NULL)
--   bd_handoffs      same: the handoff happened, whatever became of the project

CREATE OR REPLACE FUNCTION public.delete_project_cascade(p_project_id uuid)
RETURNS text[]
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_paths    text[];
  v_task_ids uuid[];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM projects WHERE id = p_project_id) THEN
    RAISE EXCEPTION 'project_not_found';
  END IF;

  IF NOT (is_internal() AND has_feature('can_manage_projects')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT coalesce(array_agg(id), '{}')
    INTO v_task_ids
    FROM tasks
   WHERE project_id = p_project_id;

  -- The files to remove from the bucket, gathered before anything is deleted.
  --
  -- `storage_path IS NOT NULL` matters: an attachment can be a link (a Google
  -- Doc) with no file behind it, and a null in this array made the caller's
  -- storage request reject the whole batch — so deleting a project that had one
  -- reported a failure after the deletion had already committed.
  SELECT coalesce(array_agg(storage_path), '{}')
    INTO v_paths
    FROM attachments
   WHERE storage_path IS NOT NULL
     AND (project_id = p_project_id OR task_id = ANY(v_task_ids));

  -- Notifications point at a resource by id in a text column, with no foreign
  -- key to cascade through. Left behind they are links to a 404.
  DELETE FROM notifications
   WHERE (resource_type = 'project' AND resource_id = p_project_id::text)
      OR (resource_type = 'task' AND resource_id = ANY(v_task_ids::text[]));

  -- Tasks first, so the progress trigger they fire updates a project that still
  -- exists. Cascading from the project instead would have it recalculate a row
  -- being deleted in the same statement.
  DELETE FROM tasks WHERE project_id = p_project_id;

  DELETE FROM projects WHERE id = p_project_id;

  RETURN v_paths;
END;
$$;

COMMENT ON FUNCTION public.delete_project_cascade(uuid) IS
  'Permanently deletes a project and everything hanging off it, returning the storage paths the caller must remove. Not recoverable.';

REVOKE ALL ON FUNCTION public.delete_project_cascade(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.delete_project_cascade(uuid) TO authenticated;
