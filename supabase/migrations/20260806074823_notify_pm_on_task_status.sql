-- Moving a card on the board should reach the project manager, not just the
-- people already subscribed to the task.
--
-- fn_task_subscribers() covers assignees ∪ creator ∪ opted-in watchers. A PM who
-- neither created the task nor watches it heard nothing when work moved between
-- columns, which is exactly the person who needs to know.
--
-- Scoped to the status branch on purpose: a PM does not need a ping for every
-- priority tweak or estimate edit on every task in their project.

CREATE OR REPLACE FUNCTION fn_task_status_recipients(p_task_id uuid, p_actor uuid)
RETURNS TABLE (profile_id uuid) AS $$
  SELECT s.profile_id FROM fn_task_subscribers(p_task_id, p_actor) s
  UNION
  SELECT p.manager_id
  FROM tasks t
  JOIN projects p ON p.id = t.project_id
  WHERE t.id = p_task_id
    AND p.manager_id IS NOT NULL
    AND p.manager_id IS DISTINCT FROM p_actor
    -- An explicit mute on the task still wins, same as for subscribers.
    AND NOT EXISTS (
      SELECT 1 FROM task_watchers m
      WHERE m.task_id = p_task_id AND m.profile_id = p.manager_id AND m.muted
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Unchanged apart from the status branch swapping to the wider recipient set.
CREATE OR REPLACE FUNCTION fn_notify_task_changed() RETURNS trigger AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_actor    text;
BEGIN
  IF NEW.deleted_at IS NOT NULL OR OLD.deleted_at IS NOT NULL THEN RETURN NULL; END IF;

  SELECT name INTO v_actor FROM profiles WHERE id = v_actor_id;
  v_actor := COALESCE(v_actor, 'Someone');

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM fn_notify(
      s.profile_id, 'task_activity',
      CASE WHEN NEW.status = 'blocked' THEN 'Task blocked' ELSE 'Task moved' END,
      v_actor || ' moved "' || NEW.title || '" to ' || fn_task_status_label(NEW.status),
      'task', NEW.id::text, v_actor_id
    )
    FROM fn_task_status_recipients(NEW.id, v_actor_id) s;
  END IF;

  IF NEW.priority IS DISTINCT FROM OLD.priority THEN
    PERFORM fn_notify(
      s.profile_id, 'task_activity', 'Priority changed',
      v_actor || ' set "' || NEW.title || '" to ' || initcap(NEW.priority) || ' priority',
      'task', NEW.id::text, v_actor_id
    )
    FROM fn_task_subscribers(NEW.id, v_actor_id) s;
  END IF;

  IF NEW.due_date IS DISTINCT FROM OLD.due_date THEN
    PERFORM fn_notify(
      s.profile_id, 'task_activity',
      CASE WHEN NEW.due_date IS NULL THEN 'Due date cleared' ELSE 'Due date changed' END,
      CASE WHEN NEW.due_date IS NULL
           THEN v_actor || ' cleared the due date on "' || NEW.title || '"'
           ELSE v_actor || ' set "' || NEW.title || '" due ' || fn_fmt_day(NEW.due_date::date)
      END,
      'task', NEW.id::text, v_actor_id
    )
    FROM fn_task_subscribers(NEW.id, v_actor_id) s;
  END IF;

  IF NEW.estimated_minutes IS DISTINCT FROM OLD.estimated_minutes THEN
    PERFORM fn_notify(
      s.profile_id, 'task_activity',
      CASE WHEN NEW.estimated_minutes IS NULL THEN 'Estimate cleared' ELSE 'Estimate changed' END,
      CASE WHEN NEW.estimated_minutes IS NULL
           THEN v_actor || ' cleared the estimate on "' || NEW.title || '"'
           ELSE v_actor || ' estimated "' || NEW.title || '" at ' || fn_fmt_minutes(NEW.estimated_minutes)
      END,
      'task', NEW.id::text, v_actor_id
    )
    FROM fn_task_subscribers(NEW.id, v_actor_id) s;
  END IF;

  IF NEW.description IS DISTINCT FROM OLD.description THEN
    PERFORM fn_notify(
      s.profile_id, 'task_activity',
      CASE WHEN NEW.description IS NULL THEN 'Description cleared' ELSE 'Description updated' END,
      v_actor || CASE WHEN NEW.description IS NULL
                      THEN ' cleared the description on "'
                      ELSE ' updated the description on "' END || NEW.title || '"',
      'task', NEW.id::text, v_actor_id
    )
    FROM fn_task_subscribers(NEW.id, v_actor_id) s;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_notify_task_changed ON tasks;
CREATE TRIGGER trg_notify_task_changed
  AFTER UPDATE OF status, priority, due_date, estimated_minutes, description ON tasks
  FOR EACH ROW EXECUTE FUNCTION fn_notify_task_changed();
