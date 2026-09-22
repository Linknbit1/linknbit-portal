-- Approved and Completed were the same state wearing two names.
--
-- Both carried is_signoff = true and is_done = true, so project progress counted
-- them identically and the sign-off guard treated them identically. The only
-- difference was which column of the board a card sat in — 95 tasks in one, 125
-- in the other, and nobody could say what moving between them meant. Two states
-- that behave the same are one state with a presentation bug.
--
-- The 95 become completed. bd_tasks had one, which goes with them.
--
-- The sign-off guard is suppressed for the rewrite and put straight back. It
-- exists to stop a PERSON signing work off without can_approve_tasks; this is a
-- schema migration collapsing two identical states, and it runs with no
-- auth.uid() at all, so the guard would refuse every row. Audit capture is
-- suppressed for the same reason: nobody signed anything off today.
--
-- The two functions that hard-coded ('completed','approved') now read
-- task_statuses.is_done instead. That is the actual fix — the reason this merge
-- touched SQL at all is that the "done" set was written out by hand in two
-- places. Adding or removing a status is now a row, not a deploy.
--
-- Verified after: 0 approved rows in either table, 220 completed, six statuses
-- numbered 1-6 with no gap, and project progress unchanged on every project
-- (0 mismatches against a freshly computed figure).

ALTER TABLE tasks DISABLE TRIGGER trg_guard_task_approval;
SELECT set_config('app.audit_suppress', 'on', true);

UPDATE tasks    SET status = 'completed' WHERE status = 'approved';
UPDATE bd_tasks SET status = 'completed' WHERE status = 'approved';

ALTER TABLE tasks ENABLE TRIGGER trg_guard_task_approval;

DELETE FROM status_labels WHERE scope = 'task' AND key = 'approved';
DELETE FROM task_statuses WHERE key = 'approved';

UPDATE task_statuses SET sort_order = sort_order - 1 WHERE sort_order > 5;

CREATE OR REPLACE FUNCTION public.fn_recalc_project_progress(p_project uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pct int;
BEGIN
  IF p_project IS NULL THEN RETURN; END IF;

  SELECT COALESCE(
    round(100.0 * count(*) FILTER (
      WHERE EXISTS (SELECT 1 FROM task_statuses ts WHERE ts.key = tasks.status AND ts.is_done)
    ) / NULLIF(count(*), 0)),
    0
  )::int
  INTO v_pct
  FROM tasks
  WHERE project_id = p_project
    AND deleted_at IS NULL
    AND parent_task_id IS NULL;

  UPDATE projects
  SET progress = v_pct
  WHERE id = p_project
    AND progress IS DISTINCT FROM v_pct;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_task_status_label(p_status text)
RETURNS text
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT ts.label FROM task_statuses ts WHERE ts.key = p_status),
    initcap(replace(COALESCE(p_status, ''), '_', ' '))
  );
$function$;

-- report_project_tasks listed the open work as "NOT IN ('completed','approved')".
-- Same change: ask the flag rather than name the keys.

CREATE OR REPLACE FUNCTION public.report_project_tasks(p_project uuid, p_from date, p_to date)
 RETURNS TABLE(task_id uuid, task_title text, status text, priority text, service_slug text, service_name text, stage_name text, due_date timestamp with time zone, estimated_minutes integer, assignees text[], timer_minutes integer, standup_minutes integer, variance_minutes integer, people integer, last_activity timestamp with time zone, had_activity boolean, task_deleted boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_tz text; v_from timestamptz; v_to timestamptz;
BEGIN
  IF NOT fn_can_report_on_project(p_project) THEN
    RAISE EXCEPTION 'Not allowed to report on this project';
  END IF;
  SELECT timezone INTO v_tz FROM attendance_settings LIMIT 1;
  v_from := (p_from::text || ' 00:00')::timestamp AT TIME ZONE v_tz;
  v_to   := ((p_to + 1)::text || ' 00:00')::timestamp AT TIME ZONE v_tz;

  RETURN QUERY
  WITH timer AS (
    SELECT te.task_id AS t_id,
           SUM(fn_clamped_minutes(te.started_at, te.ended_at, v_from, v_to))::int AS mins,
           COUNT(DISTINCT te.profile_id)::int AS people,
           MAX(COALESCE(te.ended_at, now()))  AS last_at
      FROM task_time_entries te
      JOIN tasks tk ON tk.id = te.task_id
     WHERE tk.project_id = p_project
       AND te.started_at < v_to AND COALESCE(te.ended_at, now()) > v_from
       AND fn_can_report_on(te.profile_id)
     GROUP BY te.task_id
  ),
  sup AS (
    SELECT se.task_id AS t_id, SUM(se.minutes_spent)::int AS mins
      FROM standup_entries se
      JOIN standups s ON s.id = se.standup_id
     WHERE se.project_id = p_project AND se.task_id IS NOT NULL
       AND s.standup_date BETWEEN p_from AND p_to
       AND fn_can_report_on(s.profile_id)
     GROUP BY se.task_id
  ),
  loose AS (
    SELECT COALESCE(SUM(se.minutes_spent), 0)::int AS mins
      FROM standup_entries se
      JOIN standups s ON s.id = se.standup_id
     WHERE se.project_id = p_project AND se.task_id IS NULL
       AND s.standup_date BETWEEN p_from AND p_to
       AND fn_can_report_on(s.profile_id)
  ),
  keys AS (
    SELECT ti.t_id FROM timer ti
    UNION
    SELECT su.t_id FROM sup su
    UNION
    SELECT tk.id FROM tasks tk
     WHERE tk.project_id = p_project
       AND tk.deleted_at IS NULL
       AND NOT EXISTS (SELECT 1 FROM task_statuses ts WHERE ts.key = tk.status AND ts.is_done)
       AND tk.created_at < v_to
  )
  SELECT
    tk.id, tk.title, tk.status, tk.priority,
    sv.slug, sv.name, st.name,
    tk.due_date, tk.estimated_minutes,
    COALESCE((
      SELECT array_agg(pr.name ORDER BY pr.name)
        FROM task_assignees ta JOIN profiles pr ON pr.id = ta.profile_id
       WHERE ta.task_id = tk.id
    ), CASE WHEN tk.assignee_id IS NULL THEN ARRAY[]::text[]
            ELSE ARRAY[(SELECT pr.name FROM profiles pr WHERE pr.id = tk.assignee_id)] END),
    COALESCE(ti.mins, 0), COALESCE(su.mins, 0),
    COALESCE(su.mins, 0) - COALESCE(ti.mins, 0),
    COALESCE(ti.people, 0),
    ti.last_at,
    (ti.t_id IS NOT NULL OR su.t_id IS NOT NULL),
    tk.deleted_at IS NOT NULL
  FROM keys k
  JOIN tasks tk ON tk.id = k.t_id
  LEFT JOIN project_services ps ON ps.id = tk.project_service_id
  LEFT JOIN services sv ON sv.id = ps.service_id
  LEFT JOIN stages st ON st.id = tk.stage_id
  LEFT JOIN timer ti ON ti.t_id = tk.id
  LEFT JOIN sup   su ON su.t_id = tk.id

  UNION ALL

  SELECT
    NULL::uuid, 'Standup time with no task named'::text, NULL::text, NULL::text,
    NULL::text, NULL::text, NULL::text, NULL::timestamptz, NULL::integer, ARRAY[]::text[],
    0, l.mins, l.mins, 0, NULL::timestamptz, true, false
  FROM loose l
  WHERE l.mins > 0

  ORDER BY 12 DESC, 11 DESC, 2;
END;
$function$;
