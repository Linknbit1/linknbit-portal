-- task_assignees is the assignment, tasks.assignee_id is a leftover.
--
-- Both existed: one person in a column, many in a join table. 448 join rows
-- against 335 tasks with a primary, so 114 assignments belong to somebody who is
-- NOT the primary — a quarter of all assignment, invisible to any code reading
-- the column.
--
-- The RLS side was already right: is_task_assignee() reads only the join table
-- and task_visible() reads both. Which made one row an outright bug — a task
-- whose primary assignee had no join row at all ("Website Fixes", Abbas Khan).
-- is_task_assignee() was false for him, so the person the task was assigned to
-- could not edit it. Backfilled here.
--
-- The trigger keeps it that way: setting assignee_id always produces a join row.
-- It only ever ADDS. Changing the primary from A to B does not remove A, because
-- A may legitimately still be on the task — taking somebody off work is an
-- explicit act, not a side effect of naming somebody else.
--
-- This is the expand step. Dropping tasks.assignee_id is a later contract
-- migration, once no deployed bundle selects it — TASK_SELECT still embeds it.

INSERT INTO task_assignees (task_id, profile_id)
SELECT t.id, t.assignee_id
  FROM tasks t
 WHERE t.assignee_id IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM task_assignees ta
      WHERE ta.task_id = t.id AND ta.profile_id = t.assignee_id
   )
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.fn_sync_primary_assignee()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.assignee_id IS NOT NULL THEN
    INSERT INTO task_assignees (task_id, profile_id)
    VALUES (NEW.id, NEW.assignee_id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_tasks_sync_primary_assignee ON public.tasks;
CREATE TRIGGER trg_tasks_sync_primary_assignee
  AFTER INSERT OR UPDATE OF assignee_id ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION fn_sync_primary_assignee();
