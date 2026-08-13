-- Move a task to another project, taking its history with it.
--
-- Comments, subtasks, time entries, watchers and assignees all hang off task_id
-- alone, so they follow the row for free. Two things do not, and both are silent
-- corruption if a move is done with a plain UPDATE from the client:
--
--   • attachments carry their own project_id. Left behind, a moved task's files
--     stay filed under the old project — they vanish from the new project's
--     Files tab and stay visible to the old project's members.
--   • stage_id points at a stage belonging to the OLD service. Stages are
--     per-service, so carrying one over would put the task in a stage its
--     project does not have.
--
-- Hence one SECURITY DEFINER function: task, attachments and stage move together
-- or not at all.

CREATE OR REPLACE FUNCTION fn_move_task(
  p_task_id            uuid,
  p_project_service_id uuid,
  p_stage_id           uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_project_id uuid;
BEGIN
  IF NOT has_feature('can_manage_projects') THEN
    RAISE EXCEPTION 'forbidden_move_task';
  END IF;

  -- The destination decides the project; passing both invites them to disagree.
  SELECT ps.project_id INTO v_project_id
    FROM project_services ps
   WHERE ps.id = p_project_service_id;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'unknown_project_service';
  END IF;

  -- A stage must belong to the service being moved into, or it is dropped.
  IF p_stage_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM stages s
     WHERE s.id = p_stage_id AND s.project_service_id = p_project_service_id
  ) THEN
    p_stage_id := NULL;
  END IF;

  UPDATE tasks
     SET project_id         = v_project_id,
         project_service_id = p_project_service_id,
         stage_id           = p_stage_id,
         updated_at         = now()
   WHERE id = p_task_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'unknown_task';
  END IF;

  -- Bring the files along, or they stay filed under the old project.
  UPDATE attachments
     SET project_id = v_project_id
   WHERE task_id = p_task_id
     AND project_id IS DISTINCT FROM v_project_id;
END;
$$;

COMMENT ON FUNCTION fn_move_task(uuid, uuid, uuid) IS
  'Moves a task to another project/service, re-homing its attachments and dropping a stage that does not belong to the destination. Comments, subtasks, time entries, watchers and assignees follow task_id.';

REVOKE ALL ON FUNCTION fn_move_task(uuid, uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION fn_move_task(uuid, uuid, uuid) TO authenticated;
