-- ════════════════════════════════════════════════════════════════════
-- Reporting catches up with the make-up ledger, and gains its drill-downs.
--
-- The employee backlog now carries three more columns — what an approved
-- exception cost in unpaid time, how much of it has been worked back, and what
-- is still outstanding. Payroll reads the balance; a manager reads the same
-- number to know whether the hours actually came back.
--
-- The two detail functions answer "and who/what was that", which the summary
-- tables cannot: one project broken down by person, one person broken down by
-- project. Both keep the same three time columns in the same order as every
-- other table, and both still refuse to add the two clocks together.
--
-- NOTE the DROP: report_employee_backlog gains columns, and Postgres will not
-- change a function's OUT parameters in place.
-- ════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS report_employee_backlog(date, date);

CREATE OR REPLACE FUNCTION report_employee_backlog(p_from date, p_to date)
RETURNS TABLE (
  profile_id uuid, profile_name text, avatar_url text, role text,
  timer_minutes integer, standup_minutes integer, variance_minutes integer,
  standups_submitted integer, standups_late integer,
  required_minutes integer, projects integer,
  unpaid_minutes integer, made_up_minutes integer, makeup_balance_minutes integer
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tz text; v_from timestamptz; v_to timestamptz;
BEGIN
  SELECT timezone INTO v_tz FROM attendance_settings LIMIT 1;
  v_from := (p_from::text || ' 00:00')::timestamp AT TIME ZONE v_tz;
  v_to   := ((p_to + 1)::text || ' 00:00')::timestamp AT TIME ZONE v_tz;

  RETURN QUERY
  WITH timer AS (
    SELECT te.profile_id,
           SUM(fn_clamped_minutes(te.started_at, te.ended_at, v_from, v_to))::int AS mins
      FROM task_time_entries te
     WHERE te.started_at < v_to AND COALESCE(te.ended_at, now()) > v_from
     GROUP BY te.profile_id
  ),
  sup AS (
    SELECT s.profile_id,
           SUM(se.minutes_spent)::int AS mins,
           COUNT(DISTINCT s.id)::int  AS submitted,
           COUNT(DISTINCT s.id) FILTER (WHERE s.is_late)::int AS late,
           COUNT(DISTINCT se.project_id)::int AS projects
      FROM standups s
      JOIN standup_entries se ON se.standup_id = s.id
     WHERE s.standup_date BETWEEN p_from AND p_to
     GROUP BY s.profile_id
  ),
  owed AS (
    SELECT pr.id AS profile_id,
           COALESCE(SUM(fn_standup_required_minutes(pr.id, d.day::date)), 0)::int AS mins
      FROM profiles pr
      CROSS JOIN generate_series(p_from, p_to, interval '1 day') AS d(day)
     WHERE pr.is_active
     GROUP BY pr.id
  )
  SELECT pr.id, pr.name, pr.avatar_url, pr.role,
         COALESCE(ti.mins, 0), COALESCE(su.mins, 0),
         COALESCE(su.mins, 0) - COALESCE(ti.mins, 0),
         COALESCE(su.submitted, 0), COALESCE(su.late, 0),
         COALESCE(ow.mins, 0), COALESCE(su.projects, 0),
         mk.owed_minutes, mk.made_up_minutes, mk.balance_minutes
    FROM profiles pr
    LEFT JOIN timer ti ON ti.profile_id = pr.id
    LEFT JOIN sup   su ON su.profile_id = pr.id
    LEFT JOIN owed  ow ON ow.profile_id = pr.id
    CROSS JOIN LATERAL fn_makeup_balance(pr.id, p_from, p_to) mk
   WHERE pr.is_active
     AND pr.role NOT IN ('client_owner', 'client_member')
     AND fn_can_report_on(pr.id)
   ORDER BY COALESCE(su.mins, 0) + COALESCE(ti.mins, 0) DESC, pr.name;
END;
$$;

-- ── One project, by person ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION report_project_detail(p_project uuid, p_from date, p_to date)
RETURNS TABLE (
  profile_id uuid, profile_name text, avatar_url text,
  timer_minutes integer, standup_minutes integer, variance_minutes integer,
  tasks integer
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tz text; v_from timestamptz; v_to timestamptz;
BEGIN
  SELECT timezone INTO v_tz FROM attendance_settings LIMIT 1;
  v_from := (p_from::text || ' 00:00')::timestamp AT TIME ZONE v_tz;
  v_to   := ((p_to + 1)::text || ' 00:00')::timestamp AT TIME ZONE v_tz;

  RETURN QUERY
  WITH timer AS (
    SELECT te.profile_id,
           SUM(fn_clamped_minutes(te.started_at, te.ended_at, v_from, v_to))::int AS mins,
           COUNT(DISTINCT te.task_id)::int AS tasks
      FROM task_time_entries te
      JOIN tasks t ON t.id = te.task_id
     WHERE t.project_id = p_project
       AND te.started_at < v_to AND COALESCE(te.ended_at, now()) > v_from
       AND fn_can_report_on(te.profile_id)
     GROUP BY te.profile_id
  ),
  sup AS (
    SELECT s.profile_id, SUM(se.minutes_spent)::int AS mins
      FROM standup_entries se
      JOIN standups s ON s.id = se.standup_id
     WHERE se.project_id = p_project
       AND s.standup_date BETWEEN p_from AND p_to
       AND fn_can_report_on(s.profile_id)
     GROUP BY s.profile_id
  ),
  -- Somebody may appear in one source and not the other — that gap is the whole
  -- point of the variance column, so neither side may drop a person.
  people AS (
    SELECT profile_id FROM timer
    UNION
    SELECT profile_id FROM sup
  )
  SELECT pr.id, pr.name, pr.avatar_url,
         COALESCE(ti.mins, 0), COALESCE(su.mins, 0),
         COALESCE(su.mins, 0) - COALESCE(ti.mins, 0),
         COALESCE(ti.tasks, 0)
    FROM people pe
    JOIN profiles pr ON pr.id = pe.profile_id
    LEFT JOIN timer ti ON ti.profile_id = pe.profile_id
    LEFT JOIN sup   su ON su.profile_id = pe.profile_id
   ORDER BY COALESCE(ti.mins, 0) + COALESCE(su.mins, 0) DESC, pr.name;
END;
$$;

-- ── One person, by project ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION report_employee_detail(p_profile uuid, p_from date, p_to date)
RETURNS TABLE (
  project_id uuid, project_name text, client_name text,
  timer_minutes integer, standup_minutes integer, variance_minutes integer,
  tasks integer
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tz text; v_from timestamptz; v_to timestamptz;
BEGIN
  -- Checked once here rather than per row: this function answers about exactly
  -- one person, so a refusal is the whole answer.
  IF NOT fn_can_report_on(p_profile) THEN RETURN; END IF;

  SELECT timezone INTO v_tz FROM attendance_settings LIMIT 1;
  v_from := (p_from::text || ' 00:00')::timestamp AT TIME ZONE v_tz;
  v_to   := ((p_to + 1)::text || ' 00:00')::timestamp AT TIME ZONE v_tz;

  RETURN QUERY
  WITH timer AS (
    SELECT t.project_id,
           SUM(fn_clamped_minutes(te.started_at, te.ended_at, v_from, v_to))::int AS mins,
           COUNT(DISTINCT te.task_id)::int AS tasks
      FROM task_time_entries te
      JOIN tasks t ON t.id = te.task_id
     WHERE te.profile_id = p_profile
       AND te.started_at < v_to AND COALESCE(te.ended_at, now()) > v_from
     GROUP BY t.project_id
  ),
  sup AS (
    SELECT se.project_id, SUM(se.minutes_spent)::int AS mins
      FROM standup_entries se
      JOIN standups s ON s.id = se.standup_id
     WHERE s.profile_id = p_profile
       AND s.standup_date BETWEEN p_from AND p_to
     GROUP BY se.project_id
  ),
  keys AS (
    SELECT project_id FROM timer
    UNION
    SELECT project_id FROM sup
  )
  -- A null project id is ad-hoc standup work — it has no project by design, and
  -- IS NOT DISTINCT FROM is what keeps that row joined rather than dropped.
  SELECT k.project_id,
         COALESCE(p.name, 'Other work'),
         c.name,
         COALESCE(ti.mins, 0), COALESCE(su.mins, 0),
         COALESCE(su.mins, 0) - COALESCE(ti.mins, 0),
         COALESCE(ti.tasks, 0)
    FROM keys k
    LEFT JOIN projects p ON p.id = k.project_id
    LEFT JOIN clients  c ON c.id = p.client_id
    LEFT JOIN timer ti ON ti.project_id IS NOT DISTINCT FROM k.project_id
    LEFT JOIN sup   su ON su.project_id IS NOT DISTINCT FROM k.project_id
   ORDER BY COALESCE(ti.mins, 0) + COALESCE(su.mins, 0) DESC;
END;
$$;

REVOKE ALL ON FUNCTION report_project_detail(uuid, date, date) FROM public;
REVOKE ALL ON FUNCTION report_project_detail(uuid, date, date) FROM anon;
REVOKE ALL ON FUNCTION report_employee_detail(uuid, date, date) FROM public;
REVOKE ALL ON FUNCTION report_employee_detail(uuid, date, date) FROM anon;
GRANT EXECUTE ON FUNCTION report_project_detail(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION report_employee_detail(uuid, date, date) TO authenticated;
