-- Centralized destructive cleanup for project/task deletes.
--
-- Projects and tasks are soft-deleted for auditability, while their owned
-- operational children are removed after the UI confirmation step. These RPCs
-- avoid partial client-side cleanup when RLS blocks one of the child tables.

create or replace function delete_task_cascade(p_task_id uuid)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task record;
  v_deleted_at timestamptz := now();
  v_paths text[];
  v_comment_ids uuid[];
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select id, project_id, assignee_id
    into v_task
    from tasks
   where id = p_task_id
     and deleted_at is null;

  if not found then
    raise exception 'task_not_found';
  end if;

  if not (
    is_internal()
    and (
      current_user_role() in ('super_admin', 'admin', 'project_manager', 'team_lead')
      or is_project_member(v_task.project_id)
      or v_task.assignee_id = auth.uid()
    )
  ) then
    raise exception 'forbidden';
  end if;

  select coalesce(array_agg(storage_path), array[]::text[])
    into v_paths
    from attachments
   where task_id = p_task_id;

  select coalesce(array_agg(id), array[]::uuid[])
    into v_comment_ids
    from comments
   where task_id = p_task_id;

  if coalesce(array_length(v_comment_ids, 1), 0) > 0 then
    delete from mentions
     where source_type = 'comment'
       and source_id = any(v_comment_ids);
  end if;

  delete from mentions
   where project_id = v_task.project_id
     and source_type = 'task'
     and source_id = p_task_id;

  delete from comments where task_id = p_task_id;
  delete from subtasks where task_id = p_task_id;
  delete from task_assignees where task_id = p_task_id;
  delete from attachments where task_id = p_task_id;

  update tasks
     set deleted_at = v_deleted_at,
         deleted_by = auth.uid()
   where id = p_task_id;

  return v_paths;
end;
$$;

revoke all on function delete_task_cascade(uuid) from public;
revoke all on function delete_task_cascade(uuid) from anon;
grant execute on function delete_task_cascade(uuid) to authenticated;

create or replace function delete_project_cascade(p_project_id uuid)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted_at timestamptz := now();
  v_paths text[];
  v_task_ids uuid[];
  v_comment_ids uuid[];
  v_can_delete boolean;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select exists (
    select 1
      from projects
     where id = p_project_id
       and deleted_at is null
  ) into v_can_delete;

  if not v_can_delete then
    raise exception 'project_not_found';
  end if;

  select exists (
    select 1
      from role_feature_flags
     where role = current_user_role()
       and feature_key = 'can_delete_projects'
       and enabled = true
  ) into v_can_delete;

  if not (is_internal() and v_can_delete) then
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
  delete from stages where project_id = p_project_id;

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

revoke all on function delete_project_cascade(uuid) from public;
revoke all on function delete_project_cascade(uuid) from anon;
grant execute on function delete_project_cascade(uuid) to authenticated;
