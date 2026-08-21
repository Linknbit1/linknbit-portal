-- ════════════════════════════════════════════════════════════════════
-- Both backlog drill-downs threw instead of returning: 42702, ambiguous column.
--
-- `RETURNS TABLE (profile_id uuid, ...)` declares `profile_id` as a plpgsql OUT
-- variable. Every reference in these two function bodies was alias-qualified —
-- te.profile_id, s.profile_id, pe.profile_id — except the two inside the CTE
-- that unions the key sets:
--
--     people AS (SELECT profile_id FROM timer UNION SELECT profile_id FROM sup)
--                       ^^^^^^^^^^                     ^^^^^^^^^^
--
-- Bare, so Postgres could not tell the CTE's own column from the OUT parameter
-- of the same name, and refused the whole statement. `report_employee_detail`
-- had the identical mistake with `project_id` in its `keys` CTE.
--
-- The functions have been broken since they were created, so nothing regressed —
-- the drill-down has simply never returned a row.
--
-- ── Why this was reported as "no data" rather than "error" ──────────────────
-- The screen renders its empty state ("Nobody recorded time on this project in
-- this range") whenever the row list is empty, and a failed query is also an
-- empty row list. The error was being displayed as a finding. That half is
-- fixed in the page, not here.
--
-- Only the two CTEs change. Everything else is reproduced verbatim.
-- ════════════════════════════════════════════════════════════════════

-- ── One project, by the people who worked on it ──────────────────────────────
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
  -- Aliased and qualified: bare `profile_id` here collides with the OUT parameter.
  people AS (
    SELECT ti.profile_id FROM timer ti
    UNION
    SELECT su.profile_id FROM sup su
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
  -- Same fix as above: bare `project_id` collides with the OUT parameter.
  keys AS (
    SELECT ti.project_id FROM timer ti
    UNION
    SELECT su.project_id FROM sup su
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
