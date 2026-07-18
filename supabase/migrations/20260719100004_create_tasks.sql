-- ════════════════════════════════════════════════════════════════════
-- Tasks — the operational unit of work. Belongs to a project (and
-- optionally a stage). Single assignee. board_order persists Kanban order.
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE tasks (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stage_id          uuid        REFERENCES stages(id) ON DELETE SET NULL,
  parent_task_id    uuid        REFERENCES tasks(id) ON DELETE CASCADE,
  title             text        NOT NULL,
  description       text,
  status            text        NOT NULL DEFAULT 'todo'
                                  CHECK (status IN ('backlog', 'todo', 'in_progress', 'review', 'approved', 'completed', 'blocked')),
  priority          text        NOT NULL DEFAULT 'medium'
                                  CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  assignee_id       uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  service_type      text        REFERENCES services(slug) ON UPDATE CASCADE ON DELETE RESTRICT,
  due_date          timestamptz,
  start_date        timestamptz,
  estimated_minutes int,
  client_visible    boolean     NOT NULL DEFAULT false,
  board_order       int         NOT NULL DEFAULT 0,
  created_by        uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz,
  deleted_by        uuid        REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_tasks_project  ON tasks (project_id);
CREATE INDEX idx_tasks_stage    ON tasks (stage_id);
CREATE INDEX idx_tasks_assignee ON tasks (assignee_id);
CREATE INDEX idx_tasks_status   ON tasks (status);

CREATE TRIGGER trg_tasks_touch
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_tasks_internal_select ON tasks FOR SELECT
  USING (
    is_internal()
    AND (deleted_at IS NULL OR current_user_role() IN ('super_admin', 'admin'))
    AND (current_user_role() IN ('super_admin', 'admin', 'project_manager', 'finance') OR is_project_member(project_id))
  );

CREATE POLICY p_tasks_client_select ON tasks FOR SELECT
  USING (
    NOT is_internal()
    AND client_visible
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = tasks.project_id
        AND p.client_visible
        AND p.client_id IN (SELECT client_id FROM client_members WHERE profile_id = auth.uid())
    )
  );

CREATE POLICY p_tasks_insert ON tasks FOR INSERT
  WITH CHECK (
    is_internal()
    AND (current_user_role() IN ('super_admin', 'admin', 'project_manager') OR is_project_member(project_id))
  );

CREATE POLICY p_tasks_update ON tasks FOR UPDATE
  USING (
    is_internal()
    AND (
      current_user_role() IN ('super_admin', 'admin', 'project_manager')
      OR is_project_member(project_id)
      OR assignee_id = auth.uid()
    )
  )
  WITH CHECK (
    is_internal()
    AND (
      current_user_role() IN ('super_admin', 'admin', 'project_manager')
      OR is_project_member(project_id)
      OR assignee_id = auth.uid()
    )
  );
