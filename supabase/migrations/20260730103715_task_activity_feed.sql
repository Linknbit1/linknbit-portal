-- Per-task activity feed ("X changed status from A to B"), sourced from the
-- audit trail the tasks trigger already writes.
--
-- audit_log itself is admin-only (p_audit_admin_select requires
-- can_view_audit_log), so reading it directly would leave everyone else with an
-- empty feed on a task they can otherwise fully see. This function is
-- SECURITY DEFINER and gates on can_access_task instead — the same rule that
-- decides whether you may open the task at all.
--
-- old_values/new_values in the audit row are whole-row snapshots. Only the
-- fields the feed actually renders are returned, so the RPC can't become an
-- accidental channel for columns the UI never shows.

CREATE OR REPLACE FUNCTION fn_task_activity(p_task_id uuid, p_limit int DEFAULT 50)
RETURNS TABLE (
  id             uuid,
  created_at     timestamptz,
  actor_id       uuid,
  actor_name     text,
  action         text,
  changed_fields text[],
  old_values     jsonb,
  new_values     jsonb
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  -- Everything the activity feed knows how to describe.
  v_fields text[] := ARRAY[
    'title', 'status', 'priority', 'due_date', 'start_date',
    'stage_id', 'assignee_id', 'client_visible', 'estimated_minutes'
  ];
BEGIN
  IF NOT can_access_task(p_task_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.created_at,
    a.actor_id,
    a.actor_name,
    a.action,
    -- Drop bookkeeping columns so "updated_at changed" never shows up as news.
    ARRAY(SELECT unnest(a.changed_fields) INTERSECT SELECT unnest(v_fields)) AS changed_fields,
    (SELECT jsonb_object_agg(k, a.old_values -> k)
       FROM unnest(v_fields) AS k
      WHERE a.old_values ? k) AS old_values,
    (SELECT jsonb_object_agg(k, a.new_values -> k)
       FROM unnest(v_fields) AS k
      WHERE a.new_values ? k) AS new_values
  FROM audit_log a
  WHERE a.table_name = 'tasks'
    AND a.record_id = p_task_id
    -- An update that touched nothing renderable is noise; creation always shows.
    AND (
      a.operation = 'INSERT'
      OR EXISTS (SELECT 1 FROM unnest(a.changed_fields) f WHERE f = ANY(v_fields))
    )
  ORDER BY a.created_at DESC
  LIMIT greatest(p_limit, 1);
END;
$$;

REVOKE ALL ON FUNCTION fn_task_activity(uuid, int) FROM public, anon;
GRANT EXECUTE ON FUNCTION fn_task_activity(uuid, int) TO authenticated;
