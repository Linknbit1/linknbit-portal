-- ════════════════════════════════════════════════════════════════════
-- Subtasks (simple checklist) + Comments (discussion thread) on tasks.
-- can_access_task() centralises the "internal user may see this task's
-- project" predicate reused by subtasks / comments / attachments RLS.
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION can_access_task(p_task_id uuid) RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = p_task_id
      AND (
        current_user_role() IN ('super_admin', 'admin', 'project_manager', 'finance')
        OR is_project_member(t.project_id)
      )
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ── Subtasks ─────────────────────────────────────────────────────────
CREATE TABLE subtasks (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     uuid        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title       text        NOT NULL,
  completed   boolean     NOT NULL DEFAULT false,
  assignee_id uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  order_index int         NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_subtasks_task ON subtasks (task_id, order_index);

CREATE TRIGGER trg_subtasks_touch
  BEFORE UPDATE ON subtasks
  FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_subtasks_select ON subtasks FOR SELECT
  USING (is_internal() AND can_access_task(task_id));

CREATE POLICY p_subtasks_write ON subtasks FOR ALL
  USING     (is_internal() AND can_access_task(task_id))
  WITH CHECK (is_internal() AND can_access_task(task_id));

-- ── Comments ─────────────────────────────────────────────────────────
CREATE TABLE comments (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     uuid        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id   uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  content     text        NOT NULL,
  is_internal boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_comments_task ON comments (task_id, created_at);

CREATE TRIGGER trg_comments_touch
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_comments_internal_select ON comments FOR SELECT
  USING (is_internal() AND can_access_task(task_id));

-- Clients see non-internal comments on client-visible tasks of their client.
CREATE POLICY p_comments_client_select ON comments FOR SELECT
  USING (
    NOT is_internal()
    AND is_internal = false
    AND EXISTS (
      SELECT 1 FROM tasks t JOIN projects p ON p.id = t.project_id
      WHERE t.id = comments.task_id
        AND t.client_visible AND p.client_visible
        AND p.client_id IN (SELECT client_id FROM client_members WHERE profile_id = auth.uid())
    )
  );

CREATE POLICY p_comments_insert ON comments FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND is_internal() AND can_access_task(task_id)
  );

CREATE POLICY p_comments_update ON comments FOR UPDATE
  USING     (author_id = auth.uid() OR current_user_role() IN ('super_admin', 'admin'))
  WITH CHECK (author_id = auth.uid() OR current_user_role() IN ('super_admin', 'admin'));

CREATE POLICY p_comments_delete ON comments FOR DELETE
  USING (author_id = auth.uid() OR current_user_role() IN ('super_admin', 'admin'));
