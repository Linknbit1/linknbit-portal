-- ════════════════════════════════════════════════════════════════════
-- can_create_projects + can_delete_projects → can_manage_projects.
--
-- The two keys have carried IDENTICAL values for every role since they were
-- seeded (super_admin/admin/project_manager/team_lead true, hr/employee/finance
-- false), so the merge is lossless: no role gains or loses anything. The value
-- is computed from the old pair rather than hardcoded, so it stays correct even
-- if the rows were edited between writing and running this.
--
-- A role gets can_manage_projects if it could create OR delete before.
-- ════════════════════════════════════════════════════════════════════

INSERT INTO role_feature_flags (role, feature_key, enabled)
SELECT role, 'can_manage_projects', bool_or(enabled)
  FROM role_feature_flags
 WHERE feature_key IN ('can_create_projects', 'can_delete_projects')
 GROUP BY role
ON CONFLICT (role, feature_key) DO UPDATE SET enabled = EXCLUDED.enabled;

-- Any role that somehow had neither row still needs an explicit deny — a
-- missing row reads as "deny" today, but the Settings toggles need something to
-- update.
INSERT INTO role_feature_flags (role, feature_key, enabled)
SELECT DISTINCT role, 'can_manage_projects', false
  FROM role_feature_flags
ON CONFLICT (role, feature_key) DO NOTHING;

-- ── Repoint the two enforcement sites ─────────────────────────────────────────
DROP POLICY IF EXISTS p_projects_insert ON projects;
CREATE POLICY p_projects_insert ON projects
  FOR INSERT WITH CHECK (has_feature('can_manage_projects'));

-- Same body as before; only the flag lookup changes (and it now uses
-- has_feature() rather than querying role_feature_flags by hand, so super_admin
-- short-circuits consistently with every other check in the schema).
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
  delete from project_members where project_id = p_project_id;
  -- Service rows carry the staffing now; stages cascade off them, but the
  -- explicit delete keeps the order (and the audit trail) unchanged.
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

-- ── Retire the old keys ───────────────────────────────────────────────────────
DELETE FROM role_feature_flags WHERE feature_key IN ('can_create_projects', 'can_delete_projects');
