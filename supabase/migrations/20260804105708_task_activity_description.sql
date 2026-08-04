-- Description edits belong in the task's activity feed.
--
-- Only `description` is whitelisted, never `doc`: fn_audit_capture() strips the
-- rich-doc payload from its snapshots on purpose (large and noisy), so `doc`
-- would carry no values here anyway. `description` is the plain-text mirror the
-- app now writes alongside it, which is exactly what a feed line needs.
--
-- Same signature as before, so this replaces rather than drops.

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
  v_fields text[] := ARRAY[
    'title', 'status', 'priority', 'due_date', 'start_date',
    'stage_id', 'assignee_id', 'client_visible', 'estimated_minutes', 'description'
  ];
  -- Enough to render "logged 45m", never the whole entry row.
  v_time_fields text[] := ARRAY['started_at', 'ended_at', 'note', 'billable'];
BEGIN
  IF NOT can_access_task(p_task_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT * FROM (
    SELECT
      a.id, a.created_at, a.actor_id, a.actor_name, a.action,
      ARRAY(SELECT unnest(a.changed_fields) INTERSECT SELECT unnest(v_fields)) AS changed_fields,
      (SELECT jsonb_object_agg(k, a.old_values -> k)
         FROM unnest(v_fields) AS k WHERE a.old_values ? k) AS old_values,
      (SELECT jsonb_object_agg(k, a.new_values -> k)
         FROM unnest(v_fields) AS k WHERE a.new_values ? k) AS new_values
    FROM audit_log a
    WHERE a.table_name = 'tasks'
      AND a.record_id = p_task_id
      AND (
        a.operation = 'INSERT'
        OR EXISTS (SELECT 1 FROM unnest(a.changed_fields) f WHERE f = ANY(v_fields))
      )

    UNION ALL

    SELECT
      a.id, a.created_at, a.actor_id, a.actor_name, a.action,
      COALESCE(
        ARRAY(SELECT unnest(a.changed_fields) INTERSECT SELECT unnest(v_time_fields)),
        ARRAY[]::text[]
      ) AS changed_fields,
      (SELECT jsonb_object_agg(k, a.old_values -> k)
         FROM unnest(v_time_fields) AS k WHERE a.old_values ? k) AS old_values,
      (SELECT jsonb_object_agg(k, a.new_values -> k)
         FROM unnest(v_time_fields) AS k WHERE a.new_values ? k) AS new_values
    FROM audit_log a
    WHERE a.table_name = 'task_time_entries'
      AND (a.context ->> 'task_id')::uuid = p_task_id
  ) feed
  ORDER BY feed.created_at DESC
  LIMIT greatest(p_limit, 1);
END;
$$;

REVOKE ALL ON FUNCTION fn_task_activity(uuid, int) FROM public, anon;
GRANT EXECUTE ON FUNCTION fn_task_activity(uuid, int) TO authenticated;
