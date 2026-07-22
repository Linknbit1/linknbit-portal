-- Confidential and client-visibility are now fully independent axes.
--
--   * is_confidential  → gates INTERNAL staff (only can_view_confidential see it).
--   * client_visible   → gates CLIENTS.
--
-- Previously the client-select policy also required NOT is_confidential, coupling the
-- two. Per product decision they are orthogonal: a file's client visibility does not
-- depend on the confidential flag. The internal-select policy still enforces the
-- confidential gate for staff.

DROP POLICY IF EXISTS p_attachments_client_select ON attachments;
CREATE POLICY p_attachments_client_select ON attachments FOR SELECT
  USING (
    (NOT is_internal())
    AND client_visible
    AND EXISTS (
      SELECT 1 FROM projects p
       WHERE p.id = attachments.project_id
         AND p.client_visible
         AND p.client_id IN (
           SELECT client_members.client_id FROM client_members
            WHERE client_members.profile_id = auth.uid()
         )
    )
  );
