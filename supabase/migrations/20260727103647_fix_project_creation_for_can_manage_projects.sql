-- ════════════════════════════════════════════════════════════════════
-- Fix: a team lead could not create a project, despite holding
-- can_manage_projects.
--
-- Two separate causes, both left over from when that flag replaced the
-- create/delete pair — only p_projects_insert and delete_project_cascade were
-- converted, so every OTHER project policy still hardcoded
-- ('super_admin','admin','project_manager'):
--
--  1. THE REPORTED ERROR. `INSERT … RETURNING id` (what supabase-js issues for
--     .insert().select().single()) also needs SELECT on the new row. A brand-new
--     project has no members, and team_lead is not in the select policy's role
--     list, so the RETURNING was refused and surfaced as
--     "new row violates row-level security policy" — misleading, since the
--     INSERT itself was fine. A project manager IS in that list, which is why
--     only leads saw it.
--
--  2. THE REST OF THE FLOW. Even past that, a lead could not attach a service,
--     staff it, add a stage, or rename the project.
--
-- These are corrected in the two different ways they deserve:
--
--  • SELECT gets only "you can see what you created" (created_by = auth.uid()).
--    Deliberately NOT the flag: company-wide project visibility is granted
--    explicitly to admin/pm/finance and widening it is a product decision, not
--    a bug fix.
--  • The structural writes read has_feature('can_manage_projects'). This is not
--    an escalation: that flag ALREADY lets a team lead delete any project
--    outright via delete_project_cascade, so refusing them a rename was the
--    anomaly.
-- ════════════════════════════════════════════════════════════════════

-- ── Ownership is now always recorded ─────────────────────────────────────────
-- Only 3 of 22 rows had created_by, because no client ever set it. The default
-- makes the creator-visibility rule below actually mean something. Existing
-- NULL rows stay NULL — nobody gains or loses access from a backfill.
ALTER TABLE projects ALTER COLUMN created_by SET DEFAULT auth.uid();

-- ── 1. The creator can always read their own project ─────────────────────────
DROP POLICY IF EXISTS p_projects_internal_select ON projects;
CREATE POLICY p_projects_internal_select ON projects FOR SELECT
  USING (
    is_internal()
    AND (deleted_at IS NULL OR current_user_role() IN ('super_admin', 'admin'))
    AND (
      current_user_role() IN ('super_admin', 'admin', 'project_manager', 'finance')
      OR is_project_member(id)
      -- Without this, INSERT … RETURNING fails for anyone who is not yet a
      -- member of the project they are creating.
      OR created_by = auth.uid()
    )
  );

-- ── 2. Structural writes follow the capability, not a role list ──────────────
DROP POLICY IF EXISTS p_projects_update ON projects;
CREATE POLICY p_projects_update ON projects FOR UPDATE
  USING     (has_feature('can_manage_projects'))
  WITH CHECK (has_feature('can_manage_projects'));

DROP POLICY IF EXISTS p_project_services_write ON project_services;
CREATE POLICY p_project_services_write ON project_services FOR ALL
  USING     (has_feature('can_manage_projects'))
  WITH CHECK (has_feature('can_manage_projects'));

DROP POLICY IF EXISTS p_service_members_write ON service_members;
CREATE POLICY p_service_members_write ON service_members FOR ALL
  USING     (has_feature('can_manage_projects'))
  WITH CHECK (has_feature('can_manage_projects'));

-- Stages and tasks keep their member path; the flag is added alongside it so a
-- lead can build the project they just created before anyone is staffed on it.
-- This also removes the inconsistency where apply_template_to_service() would
-- create stages that the same person could not then edit by hand.
DROP POLICY IF EXISTS p_stages_write ON stages;
CREATE POLICY p_stages_write ON stages FOR ALL
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

DROP POLICY IF EXISTS p_tasks_insert ON tasks;
CREATE POLICY p_tasks_insert ON tasks FOR INSERT
  WITH CHECK (
    is_internal() AND (
      current_user_role() IN ('super_admin', 'admin', 'project_manager')
      OR has_feature('can_manage_projects')
      OR is_project_member(project_id)
    )
  );

DROP POLICY IF EXISTS p_tasks_update ON tasks;
CREATE POLICY p_tasks_update ON tasks FOR UPDATE
  USING (
    is_internal() AND (
      current_user_role() IN ('super_admin', 'admin', 'project_manager')
      OR has_feature('can_manage_projects')
      OR is_project_member(project_id)
      OR is_task_assignee(id)
    )
  )
  WITH CHECK (
    is_internal() AND (
      current_user_role() IN ('super_admin', 'admin', 'project_manager')
      OR has_feature('can_manage_projects')
      OR is_project_member(project_id)
      OR is_task_assignee(id)
    )
  );

-- ── 3. Same rule inside the service-removal RPC ──────────────────────────────
-- Otherwise a lead could add a service to their project but never remove it.
CREATE OR REPLACE FUNCTION remove_project_service(p_project_service_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_stages int; v_tasks int; v_project uuid; v_count int;
BEGIN
  IF NOT has_feature('can_manage_projects') THEN
    RAISE EXCEPTION 'Not allowed to change a project''s services' USING ERRCODE = '42501';
  END IF;

  SELECT project_id INTO v_project FROM project_services WHERE id = p_project_service_id;
  IF v_project IS NULL THEN
    RAISE EXCEPTION 'Service not found on this project' USING ERRCODE = 'P0021';
  END IF;

  SELECT count(*) INTO v_stages FROM stages WHERE project_service_id = p_project_service_id;
  SELECT count(*) INTO v_tasks  FROM tasks
   WHERE project_service_id = p_project_service_id AND deleted_at IS NULL;

  IF v_stages > 0 OR v_tasks > 0 THEN
    RAISE EXCEPTION 'This service still has % stage(s) and % task(s) — move or delete them first', v_stages, v_tasks
      USING ERRCODE = 'P0022';
  END IF;

  SELECT count(*) INTO v_count FROM project_services WHERE project_id = v_project;
  IF v_count <= 1 THEN
    RAISE EXCEPTION 'A project must keep at least one service' USING ERRCODE = 'P0023';
  END IF;

  DELETE FROM project_services WHERE id = p_project_service_id;
END;
$$;
