-- The first cut required the caller to be a project member (mirroring
-- p_stages_write). That breaks the intended flow: a team lead has
-- can_manage_projects, so they can CREATE a project — but they are not staffed
-- on it the moment it exists, so they could not apply their own team's template
-- to it. Anyone allowed to create and delete whole projects is allowed to build
-- a pipeline inside one; the narrower template read check (their own team's)
-- still applies, so this cannot be used to touch an unrelated project's shape
-- without a template of one's own.
--
-- Note this is deliberately wider than p_stages_write, which still refuses a
-- non-member team lead creating stages by hand.
CREATE OR REPLACE FUNCTION apply_template_to_service(
  p_project_service_id uuid,
  p_template_id uuid
)
RETURNS TABLE (stages_created integer, tasks_created integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_project    uuid;
  v_service    uuid;
  v_team       uuid;
  v_tpl_service uuid;
  v_offset     integer;
  v_stage      record;
  v_new_stage  uuid;
  v_stages     integer := 0;
  v_tasks      integer := 0;
  v_added      integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;

  SELECT ps.project_id, ps.service_id INTO v_project, v_service
    FROM project_services ps WHERE ps.id = p_project_service_id;
  IF v_project IS NULL THEN
    RAISE EXCEPTION 'That service is not on this project' USING ERRCODE = 'P0030';
  END IF;

  SELECT t.team_id, t.service_id INTO v_team, v_tpl_service
    FROM project_templates t WHERE t.id = p_template_id;
  IF v_team IS NULL THEN
    RAISE EXCEPTION 'Template not found' USING ERRCODE = 'P0031';
  END IF;

  IF NOT can_manage_team_templates(v_team) THEN
    RAISE EXCEPTION 'Not allowed to use this team''s templates' USING ERRCODE = '42501';
  END IF;
  IF NOT (is_internal() AND (
            current_user_role() IN ('super_admin', 'admin', 'project_manager')
            OR has_feature('can_manage_projects')
            OR is_project_member(v_project))) THEN
    RAISE EXCEPTION 'Not allowed to add stages to this project' USING ERRCODE = '42501';
  END IF;

  IF v_tpl_service <> v_service THEN
    RAISE EXCEPTION 'This template builds a different service than the one selected'
      USING ERRCODE = 'P0032';
  END IF;

  SELECT COALESCE(max(order_index) + 1, 0) INTO v_offset
    FROM stages WHERE project_service_id = p_project_service_id;

  FOR v_stage IN
    SELECT * FROM template_stages WHERE template_id = p_template_id ORDER BY order_index, created_at
  LOOP
    INSERT INTO stages (project_id, project_service_id, name, order_index, requires_approval, client_visible, status)
    VALUES (v_project, p_project_service_id, v_stage.name, v_offset + v_stages,
            v_stage.requires_approval, v_stage.client_visible, 'upcoming')
    RETURNING id INTO v_new_stage;
    v_stages := v_stages + 1;

    INSERT INTO tasks (
      project_id, project_service_id, stage_id, title, description,
      priority, status, estimated_minutes, client_visible, board_order, created_by)
    SELECT v_project, p_project_service_id, v_new_stage, tt.title, tt.description,
           tt.priority, 'todo', tt.estimated_minutes, tt.client_visible, tt.order_index, auth.uid()
      FROM template_tasks tt
     WHERE tt.template_stage_id = v_stage.id
     ORDER BY tt.order_index, tt.created_at;
    GET DIAGNOSTICS v_added = ROW_COUNT;
    v_tasks := v_tasks + v_added;
  END LOOP;

  stages_created := v_stages;
  tasks_created  := v_tasks;
  RETURN NEXT;
END;
$$;
