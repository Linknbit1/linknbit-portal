-- ════════════════════════════════════════════════════════════════════
-- Documents on a BD task — the same attachments a delivery task already has.
--
-- Follows `lead_attachments` exactly rather than inventing a second mechanism:
-- one more nullable owner column on `attachments`, so BD tasks inherit the
-- private bucket, the signed URLs, the Google Docs preview in the FileViewer,
-- the confidential flag and its RLS filter — all of it already built and
-- already debugged.
--
-- ── Three owners now, still exactly one per row ──────────────────────────────
-- `attachments_one_owner` was an XOR of project_id and lead_id. XOR does not
-- extend to three columns (two-of-three set would pass), so it becomes a count.
--
-- Note `task_id` is NOT an owner: a delivery-task file carries BOTH project_id
-- and task_id, which is why it was never in the constraint. `bd_task_id` is
-- different — a BD task's project lives in `bd_projects`, a different table from
-- the `projects` that project_id points at, so it cannot ride along the same way.
--
-- ── Who may do what ─────────────────────────────────────────────────────────
-- Read follows BD's read-wide rule: anyone who can open the module. Write copies
-- what bd_task_checklist already does — a BD manager, or the task's own assignee
-- or creator. So the people who can edit a task are exactly the people who can
-- put a document on it.
--
-- ── The client policy is deliberately untouched ─────────────────────────────
-- p_attachments_client_select joins `projects` on attachments.project_id. A BD
-- task document has none, so the join matches nothing and no client portal user
-- can reach it even if somebody ticks client_visible by mistake. That is the
-- safe default and it needs no new condition to hold.
--
-- Additive: every existing row keeps its current owner and nothing changes shape.
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE attachments
  ADD COLUMN IF NOT EXISTS bd_task_id uuid REFERENCES bd_tasks(id) ON DELETE CASCADE;

ALTER TABLE attachments
  DROP CONSTRAINT IF EXISTS attachments_one_owner,
  ADD  CONSTRAINT attachments_one_owner
       CHECK (
         (project_id IS NOT NULL)::int
       + (lead_id    IS NOT NULL)::int
       + (bd_task_id IS NOT NULL)::int
       = 1
       );

CREATE INDEX IF NOT EXISTS idx_attachments_bd_task
  ON attachments (bd_task_id, created_at DESC);

-- ── Read ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS p_attachments_internal_select ON attachments;
CREATE POLICY p_attachments_internal_select ON attachments FOR SELECT
  USING (
    is_internal()
    AND (
      (project_id IS NOT NULL
        AND (has_feature('can_view_all_projects') OR is_project_member(project_id)))
      OR (lead_id    IS NOT NULL AND bd_can_view())
      OR (bd_task_id IS NOT NULL AND bd_can_view())
    )
    AND ((NOT is_confidential) OR can_view_confidential_scope(confidential_scope))
  );

-- ── Insert ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS p_attachments_insert ON attachments;
CREATE POLICY p_attachments_insert ON attachments FOR INSERT
  WITH CHECK (
    uploader_id = auth.uid()
    AND is_internal()
    AND (
      (project_id IS NOT NULL
        AND (has_feature('can_edit_delivery') OR is_project_member(project_id)))
      OR
      (lead_id IS NOT NULL AND (
        bd_can_manage()
        OR EXISTS (
          SELECT 1 FROM bd_leads l
           WHERE l.id = lead_id
             AND (l.owner_id = auth.uid() OR l.created_by = auth.uid())
        )
      ))
      OR
      -- Same test bd_task_checklist uses, so "can edit the task" and "can put a
      -- document on the task" cannot drift apart.
      (bd_task_id IS NOT NULL AND (
        bd_can_manage()
        OR EXISTS (
          SELECT 1 FROM bd_tasks t
           WHERE t.id = bd_task_id
             AND (t.assignee_id = auth.uid() OR t.created_by = auth.uid())
        )
      ))
    )
  );

-- ── Update / delete ─────────────────────────────────────────────────────────
-- "You uploaded it" already covers tidying up after yourself; the BD arms let a
-- manager clear up after somebody who has left without handing them
-- can_edit_delivery over the whole agency.
DROP POLICY IF EXISTS p_attachments_update ON attachments;
CREATE POLICY p_attachments_update ON attachments FOR UPDATE
  USING (
    uploader_id = auth.uid()
    OR has_feature('can_edit_delivery')
    OR (lead_id    IS NOT NULL AND bd_can_manage())
    OR (bd_task_id IS NOT NULL AND bd_can_manage())
  )
  WITH CHECK (
    uploader_id = auth.uid()
    OR has_feature('can_edit_delivery')
    OR (lead_id    IS NOT NULL AND bd_can_manage())
    OR (bd_task_id IS NOT NULL AND bd_can_manage())
  );

DROP POLICY IF EXISTS p_attachments_delete ON attachments;
CREATE POLICY p_attachments_delete ON attachments FOR DELETE
  USING (
    uploader_id = auth.uid()
    OR has_feature('can_edit_delivery')
    OR (lead_id    IS NOT NULL AND bd_can_manage())
    OR (bd_task_id IS NOT NULL AND bd_can_manage())
  );

COMMENT ON COLUMN attachments.bd_task_id IS
  'Set instead of project_id or lead_id when the document belongs to a BD task. Exactly one of the three is non-null.';
