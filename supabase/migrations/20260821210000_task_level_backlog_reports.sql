-- ════════════════════════════════════════════════════════════════════
-- Task-level backlog: the drill-down under the drill-down.
--
-- `report_project_detail` answers "who worked on this project" and
-- `report_employee_detail` answers "which projects did this person go to". Both
-- stop one level above the thing people actually track — the task. These two add
-- that level: one row per task, with both clocks against it.
--
-- ── The unattributed row is not a rounding error ────────────────────────────
-- Only about a third of standup entries name a task; the rest name a project and
-- nothing more. So per-task standup minutes cannot add up to the project's
-- standup total, and a table that quietly showed the third would understate the
-- work by two thirds while looking precise.
--
-- Both functions therefore emit a row with a NULL task_id carrying the minutes
-- that named a project but no task. It is the same device `report_employee_detail`
-- already uses for ad-hoc standup work with no project, and it means the task
-- rows plus the unattributed row reconcile exactly to the parent report.
--
-- ── Tasks with nothing logged ───────────────────────────────────────────────
-- `report_project_tasks` also returns still-open tasks that recorded nothing in
-- the window, flagged `had_activity = false`. "This task has been open three
-- weeks with no time against it" is the finding a delivery lead opens the report
-- for, and it is invisible in any table built only from time entries. The UI can
-- filter them out; the report will not decide that for it.
--
-- ── Deleted tasks are included, and flagged ─────────────────────────────────
-- Time entries survive their task being soft-deleted, and the parent reports
-- have always counted those minutes. Filtering them out here would have made the
-- breakdown disagree with the total sitting directly above it — one person's
-- month came to 2,875 minutes upstairs and 652 downstairs, all of the difference
-- on a single deleted task.
--
-- So a deleted task keeps its row, marked `task_deleted`. The breakdown adds up,
-- and "thirty-seven hours went into something that was then deleted" becomes
-- visible rather than being quietly subtracted.
--
-- Purely additive: two new functions, nothing existing is touched.
-- ════════════════════════════════════════════════════════════════════

-- ── One project, task by task ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION report_project_tasks(p_project uuid, p_from date, p_to date)
RETURNS TABLE (
  task_id           uuid,
  task_title        text,
  status            text,
  priority          text,
  service_slug      text,
  service_name      text,
  stage_name        text,
  due_date          timestamptz,
  estimated_minutes integer,
  assignees         text[],
  timer_minutes     integer,
  standup_minutes   integer,
  variance_minutes  integer,
  people            integer,
  last_activity     timestamptz,
  had_activity      boolean,
  task_deleted      boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tz text; v_from timestamptz; v_to timestamptz;
BEGIN
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
     WHERE se.project_id = p_project
       AND se.task_id IS NOT NULL
       AND s.standup_date BETWEEN p_from AND p_to
       AND fn_can_report_on(s.profile_id)
     GROUP BY se.task_id
  ),
  -- Standup time booked to the project with no task named. One row, not spread
  -- across the tasks — spreading it would be an invention.
  loose AS (
    SELECT COALESCE(SUM(se.minutes_spent), 0)::int AS mins
      FROM standup_entries se
      JOIN standups s ON s.id = se.standup_id
     WHERE se.project_id = p_project
       AND se.task_id IS NULL
       AND s.standup_date BETWEEN p_from AND p_to
       AND fn_can_report_on(s.profile_id)
  ),
  keys AS (
    SELECT ti.t_id FROM timer ti
    UNION
    SELECT su.t_id FROM sup su
    UNION
    -- Open work that recorded nothing in the window.
    SELECT tk.id FROM tasks tk
     WHERE tk.project_id = p_project
       AND tk.deleted_at IS NULL
       AND tk.status NOT IN ('completed', 'approved')
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

  -- The unattributed bucket, only when there is something in it.
  SELECT
    NULL::uuid, 'Standup time with no task named'::text, NULL::text, NULL::text,
    NULL::text, NULL::text, NULL::text, NULL::timestamptz, NULL::integer, ARRAY[]::text[],
    0, l.mins, l.mins, 0, NULL::timestamptz, true, false
  FROM loose l
  WHERE l.mins > 0

  ORDER BY 12 DESC, 11 DESC, 2;
END;
$$;

COMMENT ON FUNCTION report_project_tasks(uuid, date, date) IS
  'One row per task on a project, with timer and standup minutes in range. Includes open tasks with no activity (had_activity=false) and a NULL-task row for standup time that named no task.';

-- ── One person, task by task ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION report_employee_tasks(p_profile uuid, p_from date, p_to date)
RETURNS TABLE (
  project_id      uuid,
  project_name    text,
  task_id         uuid,
  task_title      text,
  status          text,
  priority        text,
  service_slug    text,
  service_name    text,
  due_date        timestamptz,
  timer_minutes   integer,
  standup_minutes integer,
  variance_minutes integer,
  last_activity   timestamptz,
  task_deleted    boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tz text; v_from timestamptz; v_to timestamptz;
BEGIN
  IF NOT fn_can_report_on(p_profile) THEN RETURN; END IF;

  SELECT timezone INTO v_tz FROM attendance_settings LIMIT 1;
  v_from := (p_from::text || ' 00:00')::timestamp AT TIME ZONE v_tz;
  v_to   := ((p_to + 1)::text || ' 00:00')::timestamp AT TIME ZONE v_tz;

  RETURN QUERY
  WITH timer AS (
    SELECT te.task_id AS t_id,
           SUM(fn_clamped_minutes(te.started_at, te.ended_at, v_from, v_to))::int AS mins,
           MAX(COALESCE(te.ended_at, now())) AS last_at
      FROM task_time_entries te
      JOIN tasks tk ON tk.id = te.task_id
     WHERE te.profile_id = p_profile
       AND te.started_at < v_to AND COALESCE(te.ended_at, now()) > v_from
     GROUP BY te.task_id
  ),
  sup AS (
    SELECT se.task_id AS t_id, SUM(se.minutes_spent)::int AS mins
      FROM standup_entries se
      JOIN standups s ON s.id = se.standup_id
     WHERE s.profile_id = p_profile
       AND se.task_id IS NOT NULL
       AND s.standup_date BETWEEN p_from AND p_to
     GROUP BY se.task_id
  ),
  -- Their standup time per project that named no task, so the rows still
  -- reconcile to the project totals on the parent report.
  loose AS (
    SELECT se.project_id AS p_id, SUM(se.minutes_spent)::int AS mins
      FROM standup_entries se
      JOIN standups s ON s.id = se.standup_id
     WHERE s.profile_id = p_profile
       AND se.task_id IS NULL
       AND s.standup_date BETWEEN p_from AND p_to
     GROUP BY se.project_id
  ),
  keys AS (
    SELECT ti.t_id FROM timer ti
    UNION
    SELECT su.t_id FROM sup su
  )
  SELECT
    tk.project_id, p.name,
    tk.id, tk.title, tk.status, tk.priority,
    sv.slug, sv.name, tk.due_date,
    COALESCE(ti.mins, 0), COALESCE(su.mins, 0),
    COALESCE(su.mins, 0) - COALESCE(ti.mins, 0),
    ti.last_at, tk.deleted_at IS NOT NULL
  FROM keys k
  JOIN tasks tk ON tk.id = k.t_id
  LEFT JOIN projects p ON p.id = tk.project_id
  LEFT JOIN project_services ps ON ps.id = tk.project_service_id
  LEFT JOIN services sv ON sv.id = ps.service_id
  LEFT JOIN timer ti ON ti.t_id = tk.id
  LEFT JOIN sup   su ON su.t_id = tk.id

  UNION ALL

  SELECT
    l.p_id, COALESCE(p.name, 'Other work'),
    NULL::uuid, 'Standup time with no task named'::text, NULL::text, NULL::text,
    NULL::text, NULL::text, NULL::timestamptz,
    0, l.mins, l.mins, NULL::timestamptz, false
  FROM loose l
  LEFT JOIN projects p ON p.id = l.p_id
  WHERE l.mins > 0

  ORDER BY 2, 10 DESC, 11 DESC, 4;
END;
$$;

COMMENT ON FUNCTION report_employee_tasks(uuid, date, date) IS
  'One row per task a person logged time against, with the project it sits under and a NULL-task row per project for standup time that named no task.';

REVOKE ALL ON FUNCTION report_project_tasks(uuid, date, date)  FROM public, anon;
REVOKE ALL ON FUNCTION report_employee_tasks(uuid, date, date) FROM public, anon;
GRANT EXECUTE ON FUNCTION report_project_tasks(uuid, date, date)  TO authenticated;
GRANT EXECUTE ON FUNCTION report_employee_tasks(uuid, date, date) TO authenticated;
