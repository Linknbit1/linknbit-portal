-- Multiple assignees per task. Migrates the existing single tasks.assignee_id
-- into the join table (assignee_id is kept as a denormalized "primary" for now).
CREATE TABLE task_assignees (
  task_id    uuid        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  profile_id uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, profile_id)
);

CREATE INDEX idx_task_assignees_profile ON task_assignees (profile_id);

INSERT INTO task_assignees (task_id, profile_id)
  SELECT id, assignee_id FROM tasks WHERE assignee_id IS NOT NULL
  ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION is_task_assignee(p_task_id uuid) RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM task_assignees WHERE task_id = p_task_id AND profile_id = auth.uid())
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_task_assignees_select ON task_assignees FOR SELECT
  USING (is_internal() AND can_access_task(task_id));

CREATE POLICY p_task_assignees_write ON task_assignees FOR ALL
  USING     (is_internal() AND can_access_task(task_id))
  WITH CHECK (is_internal() AND can_access_task(task_id));

-- Let any of a task's assignees update it (previously only the single assignee_id).
DROP POLICY IF EXISTS p_tasks_update ON tasks;
CREATE POLICY p_tasks_update ON tasks FOR UPDATE
  USING (
    is_internal()
    AND (
      current_user_role() IN ('super_admin', 'admin', 'project_manager')
      OR is_project_member(project_id)
      OR is_task_assignee(id)
    )
  )
  WITH CHECK (
    is_internal()
    AND (
      current_user_role() IN ('super_admin', 'admin', 'project_manager')
      OR is_project_member(project_id)
      OR is_task_assignee(id)
    )
  );
