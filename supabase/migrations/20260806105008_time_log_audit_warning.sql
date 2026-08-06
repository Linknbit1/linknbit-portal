-- A hand-entered time log is a warning, not a danger.
--
-- 'danger' was too strong: it is the same level the attendance module uses for a
-- back-dated check-in, and it fired fn_notify() at every active admin on a routine
-- action. Manual logging is worth recording and worth reviewing — it is not an
-- incident. Dropping to 'warning' also removes the alert, since that block only
-- ran for 'danger'.
--
-- Timer start/stop rows keep being written: fn_task_activity() reads them to build
-- the "started a timer" / "tracked 45m" lines in each task's Activity feed. They
-- are hidden from the Audit Log page on the read side instead, so the feed keeps
-- working while the log stays quiet.

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
    -- Typed in by hand rather than timed: self-reported, so worth a second look.
    v_action   := 'time.logged_manually';
    v_severity := 'warning';
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
    v_old, v_new, v_changed, false, v_flag_reason,
    jsonb_build_object('task_id', v_task_id, 'minutes', v_minutes));

  -- No admin alert: a manual log is routine bookkeeping, reviewed in the log
  -- rather than pushed to everyone the moment it happens.
  RETURN NULL;
END;
$$;

-- Bring the rows already written into line with the new level.
UPDATE audit_log
SET severity = 'warning'
WHERE table_name = 'task_time_entries'
  AND action = 'time.logged_manually'
  AND severity = 'danger';
