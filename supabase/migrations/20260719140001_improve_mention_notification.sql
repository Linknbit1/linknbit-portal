-- Make @mention notifications self-explanatory (name the project/task) and make
-- them clickable: route a comment mention to its TASK (not the raw comment id),
-- so notificationHref('task', <task id>) opens the task.
CREATE OR REPLACE FUNCTION fn_notify_mention() RETURNS trigger AS $$
DECLARE
  v_actor    text;
  v_body     text;
  v_res_type text := NEW.source_type;
  v_res_id   text := NEW.source_id::text;
  v_project  text;
  v_task     text;
  v_task_id  uuid;
BEGIN
  SELECT name INTO v_actor FROM profiles WHERE id = NEW.created_by;
  SELECT name INTO v_project FROM projects WHERE id = NEW.project_id;

  IF NEW.source_type = 'project' THEN
    v_body := COALESCE(v_actor, 'Someone') || ' mentioned you in the ' || COALESCE(v_project, 'project') || ' project docs';
  ELSIF NEW.source_type = 'task' THEN
    SELECT title INTO v_task FROM tasks WHERE id = NEW.source_id;
    v_body := COALESCE(v_actor, 'Someone') || ' mentioned you in task "' || COALESCE(v_task, 'a task') || '"';
  ELSE -- comment: point the notification at the task the comment belongs to
    SELECT t.id, t.title INTO v_task_id, v_task
    FROM comments c JOIN tasks t ON t.id = c.task_id
    WHERE c.id = NEW.source_id;
    v_res_type := 'task';
    v_res_id := v_task_id::text;
    v_body := COALESCE(v_actor, 'Someone') || ' mentioned you in a comment on "' || COALESCE(v_task, 'a task') || '"';
  END IF;

  PERFORM fn_notify(NEW.profile_id, 'mention', 'You were mentioned', v_body, v_res_type, v_res_id, NEW.created_by);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
