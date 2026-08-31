-- What the soft delete left behind, once it stopped existing.
--
-- 20260831120000 and 20260831130000 made project and task deletion real and
-- cleared out the rows the old scheme had stranded. `deleted_at` is now always
-- null on both tables, which leaves three things saying otherwise:
--
--   * four RLS policies filtering a column that never has a value
--   * `can_view_deleted_projects`, a permission whose only effect was to widen
--     those filters — it now grants nothing, and a permission that grants
--     nothing is worse than absent: somebody will ask to be given it
--   * two exported functions that still write `deleted_at` (removed on the
--     front end in the same change; nothing called them)
--
-- The columns themselves stay. Deployed clients still select them, and an
-- always-null column costs nothing; dropping them is a contract migration for
-- after the front end that never mentions them is live.

-- ── Projects ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS p_projects_client_select ON projects;
CREATE POLICY p_projects_client_select ON projects FOR SELECT
  USING (
    (NOT is_internal())
    AND client_visible
    AND client_id IN (
      SELECT client_members.client_id FROM client_members
       WHERE client_members.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS p_projects_internal_select ON projects;
CREATE POLICY p_projects_internal_select ON projects FOR SELECT
  USING (
    is_internal()
    AND (
      has_feature('can_view_all_projects')
      OR is_project_member(id)
      OR is_project_manager(id)
      OR created_by = auth.uid()
    )
  );

-- ── Tasks ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS p_tasks_client_select ON tasks;
CREATE POLICY p_tasks_client_select ON tasks FOR SELECT
  USING (
    (NOT is_internal())
    AND client_visible
    AND EXISTS (
      SELECT 1 FROM projects p
       WHERE p.id = tasks.project_id
         AND p.client_visible
         AND p.client_id IN (
           SELECT client_members.client_id FROM client_members
            WHERE client_members.profile_id = auth.uid()
         )
    )
  );

DROP POLICY IF EXISTS p_tasks_internal_select ON tasks;
CREATE POLICY p_tasks_internal_select ON tasks FOR SELECT
  USING (
    is_internal()
    AND task_visible(id, project_id, project_service_id, assignee_id, created_by)
  );

-- ── The permission that no longer means anything ─────────────────────────────
-- role_permissions cascades on the key, so the grants go with it.
DELETE FROM permissions WHERE key = 'can_view_deleted_projects';
