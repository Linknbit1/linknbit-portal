-- A project could be edited by somebody not allowed to open it.
--
-- projects SELECT required can_view_all_projects OR is_project_member OR
-- is_project_manager OR created_by. projects UPDATE required only
-- has_feature('can_manage_projects'). Team Lead holds can_manage_projects and not
-- can_view_all_projects, so a lead could change the budget, deadline or client of
-- any project in the company — the write would succeed and the row would then be
-- invisible to them.

DROP POLICY IF EXISTS p_projects_update ON public.projects;

CREATE POLICY p_projects_update ON public.projects
  FOR UPDATE
  USING (
    has_feature('can_manage_projects')
    AND (
      has_feature('can_view_all_projects')
      OR is_project_member(id)
      OR is_project_manager(id)
      OR created_by = (select auth.uid())
    )
  )
  WITH CHECK (
    has_feature('can_manage_projects')
    AND (
      has_feature('can_view_all_projects')
      OR is_project_member(id)
      OR is_project_manager(id)
      OR created_by = (select auth.uid())
    )
  );
