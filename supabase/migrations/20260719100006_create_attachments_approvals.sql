-- ════════════════════════════════════════════════════════════════════
-- Attachments (metadata for files in the private `attachments` storage
-- bucket) + Approvals (stage/task/file sign-off records feeding the
-- Milestones / Approvals views). project_id is always set so RLS can gate
-- on project membership directly; task_id is set for task-level files.
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE attachments (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id        uuid        REFERENCES tasks(id) ON DELETE CASCADE,
  uploader_id    uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  file_name      text        NOT NULL,
  file_size      bigint,
  mime_type      text,
  storage_path   text        NOT NULL,
  client_visible boolean     NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_attachments_project ON attachments (project_id);
CREATE INDEX idx_attachments_task    ON attachments (task_id);

ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_attachments_internal_select ON attachments FOR SELECT
  USING (
    is_internal()
    AND (current_user_role() IN ('super_admin', 'admin', 'project_manager', 'finance') OR is_project_member(project_id))
  );

CREATE POLICY p_attachments_client_select ON attachments FOR SELECT
  USING (
    NOT is_internal()
    AND client_visible
    AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = attachments.project_id
        AND p.client_visible
        AND p.client_id IN (SELECT client_id FROM client_members WHERE profile_id = auth.uid())
    )
  );

CREATE POLICY p_attachments_insert ON attachments FOR INSERT
  WITH CHECK (
    uploader_id = auth.uid()
    AND is_internal()
    AND (current_user_role() IN ('super_admin', 'admin', 'project_manager') OR is_project_member(project_id))
  );

CREATE POLICY p_attachments_update ON attachments FOR UPDATE
  USING     (uploader_id = auth.uid() OR current_user_role() IN ('super_admin', 'admin', 'project_manager'))
  WITH CHECK (uploader_id = auth.uid() OR current_user_role() IN ('super_admin', 'admin', 'project_manager'));

CREATE POLICY p_attachments_delete ON attachments FOR DELETE
  USING (uploader_id = auth.uid() OR current_user_role() IN ('super_admin', 'admin', 'project_manager'));

-- ── Approvals ────────────────────────────────────────────────────────
CREATE TABLE approvals (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  type           text        NOT NULL CHECK (type IN ('stage', 'task', 'file')),
  project_id     uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  target_id      uuid        NOT NULL,
  status         text        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'approved', 'revision_requested', 'rejected')),
  message        text,
  client_message text,
  submitted_by   uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_by    uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  reviewed_at    timestamptz
);

CREATE INDEX idx_approvals_project ON approvals (project_id);
CREATE INDEX idx_approvals_target  ON approvals (target_id);

ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_approvals_internal_select ON approvals FOR SELECT
  USING (
    is_internal()
    AND (current_user_role() IN ('super_admin', 'admin', 'project_manager', 'finance') OR is_project_member(project_id))
  );

CREATE POLICY p_approvals_client_select ON approvals FOR SELECT
  USING (
    NOT is_internal()
    AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = approvals.project_id
        AND p.client_visible
        AND p.client_id IN (SELECT client_id FROM client_members WHERE profile_id = auth.uid())
    )
  );

CREATE POLICY p_approvals_insert ON approvals FOR INSERT
  WITH CHECK (
    is_internal()
    AND (current_user_role() IN ('super_admin', 'admin', 'project_manager') OR is_project_member(project_id))
  );

CREATE POLICY p_approvals_update ON approvals FOR UPDATE
  USING     (current_user_role() IN ('super_admin', 'admin', 'project_manager') OR is_project_member(project_id))
  WITH CHECK (current_user_role() IN ('super_admin', 'admin', 'project_manager') OR is_project_member(project_id));
