-- ════════════════════════════════════════════════════════════════════
-- Documents on a lead — the same attachments a project already has.
--
-- BD needed uploads, Drive links and a preview. All three exist for projects
-- (private `attachments` bucket, signed URLs, the FileViewer's Google Docs
-- embed), so a lead attaches to that table rather than getting a parallel one
-- that would need its own bucket, its own viewer and its own bugs.
--
-- `project_id` becomes nullable and `lead_id` joins it: a row belongs to exactly
-- one of the two, enforced below. Nothing existing changes shape — every current
-- row keeps its project_id — so this is additive for any deployed client.
--
-- ── Why the client policy is deliberately left alone ────────────────────────
-- p_attachments_client_select joins `projects` on attachments.project_id. A lead
-- document has none, so the join matches nothing and a client portal user cannot
-- see BD material even if somebody ticks client_visible on it by mistake. That
-- is the safe default and it needs no new condition to hold.
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE attachments
  ALTER COLUMN project_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES bd_leads(id) ON DELETE CASCADE;

-- Exactly one owner. Both, or neither, is a bug worth failing loudly on.
ALTER TABLE attachments
  DROP CONSTRAINT IF EXISTS attachments_one_owner,
  ADD  CONSTRAINT attachments_one_owner
       CHECK ((project_id IS NOT NULL) <> (lead_id IS NOT NULL));

CREATE INDEX IF NOT EXISTS idx_attachments_lead ON attachments (lead_id, created_at DESC);

-- ── Internal read: project rules unchanged, lead rows follow BD's own gate ───
DROP POLICY IF EXISTS p_attachments_internal_select ON attachments;
CREATE POLICY p_attachments_internal_select ON attachments FOR SELECT
  USING (
    is_internal()
    AND (
      (project_id IS NOT NULL
        AND (has_feature('can_view_all_projects') OR is_project_member(project_id)))
      OR
      -- BD is read-wide: anyone who can open the module sees the department's
      -- documents, the same way they already see every lead in the pipeline.
      (lead_id IS NOT NULL AND bd_can_view())
    )
    AND ((NOT is_confidential) OR can_view_confidential_scope(confidential_scope))
  );

-- ── Insert: write-narrow on the BD side — the lead's own people, or a manager ──
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
    )
  );

-- Update and delete already turn on "you uploaded it, or you run delivery".
-- Extend that with "or you run BD", so a manager can clear up after somebody who
-- has left without also handing them can_edit_delivery.
DROP POLICY IF EXISTS p_attachments_update ON attachments;
CREATE POLICY p_attachments_update ON attachments FOR UPDATE
  USING (
    uploader_id = auth.uid()
    OR has_feature('can_edit_delivery')
    OR (lead_id IS NOT NULL AND bd_can_manage())
  )
  WITH CHECK (
    uploader_id = auth.uid()
    OR has_feature('can_edit_delivery')
    OR (lead_id IS NOT NULL AND bd_can_manage())
  );

DROP POLICY IF EXISTS p_attachments_delete ON attachments;
CREATE POLICY p_attachments_delete ON attachments FOR DELETE
  USING (
    uploader_id = auth.uid()
    OR has_feature('can_edit_delivery')
    OR (lead_id IS NOT NULL AND bd_can_manage())
  );

COMMENT ON COLUMN attachments.lead_id IS
  'Set instead of project_id when the document belongs to a BD lead. Exactly one of the two is non-null.';
