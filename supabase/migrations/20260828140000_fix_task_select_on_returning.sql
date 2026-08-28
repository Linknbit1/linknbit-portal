-- Fix: creating or updating a task failed with "new row violates row-level
-- security policy for table tasks", even for an admin.
--
-- 20260828100000 routed the tasks SELECT policy through can_access_task(id),
-- which answers by looking the task up in `tasks`. That is fine for a task that
-- already exists, and wrong for the row being written right now:
--
--   * can_access_task is STABLE, so it reads the snapshot taken at the START of
--     the statement, and the row the same statement is inserting is not in it.
--   * PostgREST sends `Prefer: return=representation`, so every create and edit
--     is an INSERT/UPDATE ... RETURNING, and RETURNING is checked against the
--     SELECT policy.
--
-- So the write landed and the read-back was refused, which Postgres reports as a
-- row-level security violation with no hint that it was the RETURNING half.
--
-- The rule has not changed. What changes is that the policy now evaluates it
-- against the row's own columns instead of going back to the table to find them.
-- can_access_task keeps its signature and its meaning for everything hanging off
-- a task (comments, subtasks, assignees, watchers, time entries, the activity
-- RPCs), all of which ask about a task that already exists.

-- ── The rule, over columns rather than an id ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.task_visible(
  p_task_id     uuid,
  p_project_id  uuid,
  p_assignee_id uuid,
  p_created_by  uuid
) RETURNS boolean AS $$
  SELECT
    current_user_role() IN ('super_admin', 'admin', 'finance')
    OR p_assignee_id = auth.uid()
    OR p_created_by  = auth.uid()
    -- A task being inserted has no assignees yet, so this is simply false for it
    -- rather than unanswerable, which is the behaviour we want.
    OR EXISTS (
      SELECT 1 FROM task_assignees ta
      WHERE ta.task_id = p_task_id AND ta.profile_id = auth.uid()
    )
    OR (
      current_user_role() IN ('team_lead', 'project_manager')
      AND (
        (p_assignee_id IS NOT NULL AND shares_team_with(p_assignee_id))
        OR EXISTS (
          SELECT 1 FROM task_assignees ta
          WHERE ta.task_id = p_task_id AND shares_team_with(ta.profile_id)
        )
        OR (
          p_assignee_id IS NULL
          AND NOT EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = p_task_id)
          AND (is_project_member(p_project_id) OR is_project_creator(p_project_id))
        )
      )
    )
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.task_visible(uuid, uuid, uuid, uuid) IS
  'May the current user read a task with these columns? Takes the columns rather than an id so it can be asked about a row that is still being written.';

-- ── The id-shaped wrapper the dependent policies use ─────────────────────────
CREATE OR REPLACE FUNCTION can_access_task(p_task_id uuid) RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = p_task_id
      AND task_visible(t.id, t.project_id, t.assignee_id, t.created_by)
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ── The policy asks about the row in front of it ─────────────────────────────
DROP POLICY IF EXISTS p_tasks_internal_select ON tasks;
CREATE POLICY p_tasks_internal_select ON tasks FOR SELECT
  USING (
    is_internal()
    AND (deleted_at IS NULL OR current_user_role() IN ('super_admin', 'admin'))
    AND task_visible(id, project_id, assignee_id, created_by)
  );

-- ── Authorship, so the creator carve-out is worth something ──────────────────
-- can_access_task has let a task's creator read it since 20260828100000, but the
-- app never sent created_by, so the column was null on every task written
-- through the portal and the carve-out protected nobody. Stamping it in a
-- trigger also means it cannot be spoofed by the client.
CREATE OR REPLACE FUNCTION fn_stamp_task_created_by()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tasks_stamp_created_by ON tasks;
CREATE TRIGGER trg_tasks_stamp_created_by
  BEFORE INSERT ON tasks
  FOR EACH ROW EXECUTE FUNCTION fn_stamp_task_created_by();

REVOKE ALL ON FUNCTION public.task_visible(uuid, uuid, uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.task_visible(uuid, uuid, uuid, uuid) TO authenticated;
