-- ════════════════════════════════════════════════════════════════════
-- Four-layer projects, part 2: retire what the service layer replaced.
--
-- Deferred until now on purpose: part 1 kept these columns so the backfill
-- could be re-derived from them if anything looked wrong. It didn't — every
-- project, stage and task landed on a service and none disagreed with its old
-- service_type — and the app now reads the new tables, so they can go.
--
--   projects.service_type  → project_services (a project can run several)
--   stages.service_type    → stages.project_service_id
--   tasks.service_type     → tasks.project_service_id
--   project_members        → service_members (people belong to a service)
--
-- fn_audit_capture keeps its 'project_members' arm: it is a table-name string
-- match that simply stops matching once the table is gone, and the arm still
-- serves task_assignees.
-- ════════════════════════════════════════════════════════════════════

-- Last look: refuse to drop the source data if anything is still unbound.
DO $$
DECLARE v_stages int; v_tasks int; v_projects int;
BEGIN
  SELECT count(*) INTO v_stages   FROM stages   WHERE project_service_id IS NULL;
  SELECT count(*) INTO v_tasks    FROM tasks    WHERE project_service_id IS NULL;
  SELECT count(*) INTO v_projects FROM projects p
   WHERE NOT EXISTS (SELECT 1 FROM project_services ps WHERE ps.project_id = p.id);
  IF v_stages > 0 OR v_tasks > 0 OR v_projects > 0 THEN
    RAISE EXCEPTION 'Aborting: % stage(s), % task(s), % project(s) are not on a service yet',
      v_stages, v_tasks, v_projects;
  END IF;
END $$;

-- Nobody may lose access: every old membership must exist as a service membership.
DO $$
DECLARE v_missing int;
BEGIN
  SELECT count(*) INTO v_missing
    FROM project_members pm
   WHERE NOT EXISTS (
     SELECT 1 FROM service_members sm
       JOIN project_services ps ON ps.id = sm.project_service_id
      WHERE ps.project_id = pm.project_id AND sm.profile_id = pm.profile_id);
  IF v_missing > 0 THEN
    RAISE EXCEPTION 'Aborting: % project membership(s) have no service equivalent', v_missing;
  END IF;
END $$;

-- delete_project_cascade must stop touching the table before it disappears.
CREATE OR REPLACE FUNCTION delete_project_cascade(p_project_id uuid)
RETURNS text[]
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare
  v_deleted_at timestamptz := now();
  v_paths text[];
  v_task_ids uuid[];
  v_comment_ids uuid[];
  v_exists boolean;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select exists (
    select 1 from projects where id = p_project_id and deleted_at is null
  ) into v_exists;

  if not v_exists then
    raise exception 'project_not_found';
  end if;

  if not (is_internal() and has_feature('can_manage_projects')) then
    raise exception 'forbidden';
  end if;

  select coalesce(array_agg(id), array[]::uuid[])
    into v_task_ids
    from tasks
   where project_id = p_project_id
     and deleted_at is null;

  select coalesce(array_agg(storage_path), array[]::text[])
    into v_paths
    from attachments
   where project_id = p_project_id;

  if coalesce(array_length(v_task_ids, 1), 0) > 0 then
    select coalesce(array_agg(id), array[]::uuid[])
      into v_comment_ids
      from comments
     where task_id = any(v_task_ids);

    if coalesce(array_length(v_comment_ids, 1), 0) > 0 then
      delete from mentions
       where source_type = 'comment'
         and source_id = any(v_comment_ids);
    end if;

    delete from comments where task_id = any(v_task_ids);
    delete from subtasks where task_id = any(v_task_ids);
    delete from task_assignees where task_id = any(v_task_ids);
  end if;

  delete from attachments where project_id = p_project_id;
  delete from approvals where project_id = p_project_id;
  delete from mentions where project_id = p_project_id;
  delete from project_watchers where project_id = p_project_id;
  delete from service_members
   where project_service_id in (select id from project_services where project_id = p_project_id);
  delete from stages where project_id = p_project_id;
  delete from project_services where project_id = p_project_id;

  if coalesce(array_length(v_task_ids, 1), 0) > 0 then
    update tasks
       set deleted_at = v_deleted_at,
           deleted_by = auth.uid()
     where id = any(v_task_ids);
  end if;

  update projects
     set deleted_at = v_deleted_at,
         deleted_by = auth.uid()
   where id = p_project_id;

  return v_paths;
end;
$$;

DROP TABLE project_members;

ALTER TABLE projects DROP COLUMN service_type;
ALTER TABLE stages   DROP COLUMN service_type;
ALTER TABLE tasks    DROP COLUMN service_type;
