-- Time entries become first-class events: audited for management, and visible in
-- the per-task activity feed alongside status/priority/estimate changes.
--
-- Severity model — the distinction that matters is *observed vs claimed*:
--   • a timer start/stop is witnessed by the system      → info
--   • an entry typed in by hand is self-reported          → danger
--   • editing or deleting an existing entry rewrites history → warning
-- 'danger' is the same lever the attendance module pulls for back-dated
-- check-ins, and it carries the same consequence: fn_notify() alerts every
-- active admin the moment it happens.
--
-- A dedicated capture function rather than a branch inside fn_audit_capture():
-- the manual-vs-timer distinction depends on *how* the row was written (INSERT
-- with ended_at already set), which the generic function has no vocabulary for.

CREATE OR REPLACE FUNCTION fn_audit_time_entry()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_op           text := TG_OP;
  v_old          jsonb;
  v_new          jsonb;
  v_row          jsonb;
  v_changed      text[];
  v_actor        uuid := auth.uid();
  v_actor_kind   text := 'user';
  v_actor_name   text;
  v_actor_role   text;
  v_subject      uuid;
  v_subject_name text;
  v_action       text;
  v_severity     text := 'info';
  v_summary      text;
  v_flagged      boolean := false;
  v_flag_reason  text;
  v_minutes      int;
  v_task_id      uuid;
  v_task_title   text;
BEGIN
  v_old := CASE WHEN v_op <> 'INSERT' THEN to_jsonb(OLD) ELSE NULL END;
  v_new := CASE WHEN v_op <> 'DELETE' THEN to_jsonb(NEW) ELSE NULL END;
  v_row := COALESCE(v_new, v_old);

  IF v_op = 'UPDATE' THEN
    SELECT array_agg(e.key ORDER BY e.key) INTO v_changed
    FROM jsonb_each(v_new) e
    WHERE e.value IS DISTINCT FROM (v_old -> e.key);
    IF v_changed IS NULL OR v_changed = ARRAY['updated_at'] THEN RETURN NULL; END IF;
  END IF;

  v_task_id := NULLIF(v_row->>'task_id','')::uuid;
  v_subject := NULLIF(v_row->>'profile_id','')::uuid;
  -- A definer/edge write has no auth.uid(); the entry's owner is the actor then.
  IF v_actor IS NULL THEN
    v_actor := v_subject;
    v_actor_kind := 'self';
  END IF;

  IF NULLIF(v_row->>'ended_at','') IS NOT NULL THEN
    v_minutes := (EXTRACT(EPOCH FROM (
      (v_row->>'ended_at')::timestamptz - (v_row->>'started_at')::timestamptz
    )) / 60)::int;
  END IF;

  SELECT title INTO v_task_title FROM tasks WHERE id = v_task_id;

  IF v_op = 'INSERT' AND NULLIF(v_row->>'ended_at','') IS NOT NULL THEN
    v_action   := 'time.logged_manually';
    v_severity := 'danger';
    v_flag_reason := format(
      '%s entered by hand on "%s" — self-reported rather than timed.',
      fn_fmt_minutes(v_minutes), COALESCE(v_task_title, 'a task'));
  ELSIF v_op = 'INSERT' THEN
    v_action := 'time.timer_started';
  ELSIF v_op = 'UPDATE'
        AND NULLIF(v_old->>'ended_at','') IS NULL
        AND NULLIF(v_new->>'ended_at','') IS NOT NULL THEN
    v_action := 'time.timer_stopped';
  ELSIF v_op = 'UPDATE' THEN
    v_action := 'time.edited'; v_severity := 'warning';
  ELSE
    v_action := 'time.deleted'; v_severity := 'warning';
  END IF;

  IF v_actor IS NOT NULL THEN
    SELECT name, role INTO v_actor_name, v_actor_role FROM profiles WHERE id = v_actor;
    v_actor_name := COALESCE(v_actor_name, 'Unknown');
    v_actor_role := COALESCE(v_actor_role, 'unknown');
  ELSE
    v_actor_kind := 'system';
    v_actor_name := 'System';
    v_actor_role := 'system';
  END IF;
  IF v_subject IS NOT NULL THEN
    SELECT name INTO v_subject_name FROM profiles WHERE id = v_subject;
  END IF;

  v_summary := format('%s (%s): %s — %s on "%s"',
    v_actor_name, v_actor_role,
    replace(replace(v_action, '.', ' '), '_', ' '),
    COALESCE(fn_fmt_minutes(v_minutes), 'timer running'),
    COALESCE(v_task_title, 'a task'));

  INSERT INTO audit_log(
    module, table_name, record_id, operation, action, severity,
    actor_id, actor_name, actor_role, actor_kind,
    subject_id, subject_name, summary,
    old_values, new_values, changed_fields, flagged, flag_reason, context)
  VALUES (
    'projects', 'task_time_entries', NULLIF(v_row->>'id','')::uuid, v_op, v_action, v_severity,
    v_actor, v_actor_name, v_actor_role, v_actor_kind,
    v_subject, v_subject_name, v_summary,
    v_old, v_new, v_changed, v_flagged, v_flag_reason,
    jsonb_build_object('task_id', v_task_id, 'minutes', v_minutes));

  -- Same alert path the attendance heuristics use.
  IF v_severity = 'danger' THEN
    PERFORM fn_notify(
      p.id, 'audit_alert',
      'Manual time entry logged',
      COALESCE(v_flag_reason, v_summary),
      'audit_alert', v_task_id::text, v_actor)
    FROM profiles p
    WHERE p.is_active AND p.role IN ('super_admin', 'admin');
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_audit_task_time_entries
  AFTER INSERT OR UPDATE OR DELETE ON task_time_entries
  FOR EACH ROW EXECUTE FUNCTION fn_audit_time_entry();

-- ── Activity feed now covers time as well as task fields ───────────────────────
-- Same signature as before, so this is a replace rather than a drop. Time rows
-- are matched through context->>'task_id' (their record_id is the entry, not the
-- task) and carry their own field whitelist.
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
    'stage_id', 'assignee_id', 'client_visible', 'estimated_minutes'
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
