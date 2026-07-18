-- ════════════════════════════════════════════════════════════════════
-- Stages — ordered delivery phases within a project. A stage may require
-- client approval before the project advances (feeds the Milestones view).
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE stages (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name             text        NOT NULL,
  order_index      int         NOT NULL DEFAULT 0,
  service_type     text        REFERENCES services(slug) ON UPDATE CASCADE ON DELETE RESTRICT,
  requires_approval boolean    NOT NULL DEFAULT false,
  client_visible   boolean     NOT NULL DEFAULT true,
  status           text        NOT NULL DEFAULT 'upcoming'
                                 CHECK (status IN ('upcoming', 'current', 'completed', 'blocked')),
  approval_status  text        CHECK (approval_status IN ('pending', 'approved', 'revision_requested', 'rejected')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_stages_project ON stages (project_id, order_index);

CREATE TRIGGER trg_stages_touch
  BEFORE UPDATE ON stages
  FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────
ALTER TABLE stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_stages_internal_select ON stages FOR SELECT
  USING (
    is_internal()
    AND (current_user_role() IN ('super_admin', 'admin', 'project_manager', 'finance') OR is_project_member(project_id))
  );

CREATE POLICY p_stages_client_select ON stages FOR SELECT
  USING (
    NOT is_internal()
    AND client_visible
    AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = stages.project_id
        AND p.client_visible
        AND p.client_id IN (SELECT client_id FROM client_members WHERE profile_id = auth.uid())
    )
  );

CREATE POLICY p_stages_write ON stages FOR ALL
  USING (
    is_internal()
    AND (current_user_role() IN ('super_admin', 'admin', 'project_manager') OR is_project_member(project_id))
  )
  WITH CHECK (
    is_internal()
    AND (current_user_role() IN ('super_admin', 'admin', 'project_manager') OR is_project_member(project_id))
  );
