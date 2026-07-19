-- Project watchers ("Notify" bell). A watcher gets an in-app + push notification
-- when a task is added to, or a comment is posted in, the project. Uses the
-- fan-out idiom PERFORM fn_notify(...) FROM project_watchers.
CREATE TABLE project_watchers (
  project_id uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  profile_id uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, profile_id)
);

ALTER TABLE project_watchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_project_watchers_select ON project_watchers FOR SELECT
  USING (is_internal());

CREATE POLICY p_project_watchers_insert ON project_watchers FOR INSERT
  WITH CHECK (profile_id = auth.uid() OR current_user_role() IN ('super_admin', 'admin', 'project_manager'));

CREATE POLICY p_project_watchers_delete ON project_watchers FOR DELETE
  USING (profile_id = auth.uid() OR current_user_role() IN ('super_admin', 'admin', 'project_manager'));

-- Task added → notify watchers (fn_notify skips the actor/creator automatically).
CREATE OR REPLACE FUNCTION fn_notify_project_task_added() RETURNS trigger AS $$
DECLARE v_project text;
BEGIN
  SELECT name INTO v_project FROM projects WHERE id = NEW.project_id;
  PERFORM fn_notify(
    w.profile_id,
    'project_task_added',
    'New task',
    NEW.title || ' was added to ' || COALESCE(v_project, 'a project'),
    'task',
    NEW.id::text,
    NEW.created_by
  )
  FROM project_watchers w WHERE w.project_id = NEW.project_id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_notify_project_task_added AFTER INSERT ON tasks
  FOR EACH ROW EXECUTE FUNCTION fn_notify_project_task_added();

-- Comment added → notify watchers of the comment's task's project.
CREATE OR REPLACE FUNCTION fn_notify_project_comment_added() RETURNS trigger AS $$
DECLARE v_project_id uuid; v_project text; v_task text; v_actor text;
BEGIN
  SELECT t.project_id, t.title INTO v_project_id, v_task FROM tasks t WHERE t.id = NEW.task_id;
  IF v_project_id IS NULL THEN RETURN NULL; END IF;
  SELECT name INTO v_project FROM projects  WHERE id = v_project_id;
  SELECT name INTO v_actor   FROM profiles  WHERE id = NEW.author_id;
  PERFORM fn_notify(
    w.profile_id,
    'project_comment_added',
    'New comment',
    COALESCE(v_actor, 'Someone') || ' commented on ' || COALESCE(v_task, 'a task'),
    'task',
    NEW.task_id::text,
    NEW.author_id
  )
  FROM project_watchers w WHERE w.project_id = v_project_id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_notify_project_comment_added AFTER INSERT ON comments
  FOR EACH ROW EXECUTE FUNCTION fn_notify_project_comment_added();
