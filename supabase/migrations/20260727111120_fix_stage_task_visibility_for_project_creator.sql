-- ════════════════════════════════════════════════════════════════════
-- Fix: applying a template created stages AND tasks, but the creator saw
-- only the stages.
--
-- Two defects, both introduced by the previous migration, and they explain
-- each other:
--
--  1. TASKS INVISIBLE. A project's creator is not a member of it, and
--     p_tasks_internal_select only ever allowed
--     ('super_admin','admin','project_manager','finance') OR is_project_member.
--     A team lead creating a project could therefore never see its tasks —
--     the rows existed (the RPC reported creating them, and they were in the
--     table), they were simply filtered out on read.
--
--  2. STAGES OVER-VISIBLE. p_stages_write was written as FOR ALL. In Postgres a
--     FOR ALL policy's USING clause is applied to SELECT as well, so gating it
--     on has_feature('can_manage_projects') silently granted team leads read
--     access to the stages of EVERY project — measured: 7 stages of projects
--     they had neither created nor been staffed on. That accidental grant is
--     also why stages appeared while tasks did not, which is what made the
--     symptom look like "tasks were not created".
--
-- The rule both layers should follow is the one already used for projects
-- themselves: you can see what you created, plus what you are staffed on.
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION is_project_creator(p_project_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects p
     WHERE p.id = p_project_id AND p.created_by = auth.uid()
  )
$$;

COMMENT ON FUNCTION is_project_creator(uuid) IS
  'True when the caller created this project. Lets a creator see and build their own project before anyone is staffed on it.';

-- ── 1. Stop the write policy from granting reads ─────────────────────────────
-- Split into per-command policies so SELECT is decided only by the select
-- policies below. Same permissions to write as before, minus the read leak.
DROP POLICY IF EXISTS p_stages_write ON stages;

CREATE POLICY p_stages_insert ON stages FOR INSERT
  WITH CHECK (
    is_internal() AND (
      current_user_role() IN ('super_admin', 'admin', 'project_manager')
      OR has_feature('can_manage_projects')
      OR is_project_member(project_id)
    )
  );

CREATE POLICY p_stages_update ON stages FOR UPDATE
  USING (
    is_internal() AND (
      current_user_role() IN ('super_admin', 'admin', 'project_manager')
      OR has_feature('can_manage_projects')
      OR is_project_member(project_id)
    )
  )
  WITH CHECK (
    is_internal() AND (
      current_user_role() IN ('super_admin', 'admin', 'project_manager')
      OR has_feature('can_manage_projects')
      OR is_project_member(project_id)
    )
  );

CREATE POLICY p_stages_delete ON stages FOR DELETE
  USING (
    is_internal() AND (
      current_user_role() IN ('super_admin', 'admin', 'project_manager')
      OR has_feature('can_manage_projects')
      OR is_project_member(project_id)
    )
  );

-- ── 2. A creator can read their own project's pipeline ───────────────────────
DROP POLICY IF EXISTS p_stages_internal_select ON stages;
CREATE POLICY p_stages_internal_select ON stages FOR SELECT
  USING (
    is_internal() AND (
      current_user_role() IN ('super_admin', 'admin', 'project_manager', 'finance')
      OR is_project_member(project_id)
      OR is_project_creator(project_id)
    )
  );

DROP POLICY IF EXISTS p_tasks_internal_select ON tasks;
CREATE POLICY p_tasks_internal_select ON tasks FOR SELECT
  USING (
    is_internal()
    AND (deleted_at IS NULL OR current_user_role() IN ('super_admin', 'admin'))
    AND (
      current_user_role() IN ('super_admin', 'admin', 'project_manager', 'finance')
      OR is_project_member(project_id)
      OR is_project_creator(project_id)
    )
  );
