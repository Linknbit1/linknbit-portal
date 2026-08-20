-- ════════════════════════════════════════════════════════════════════
-- Backlog reporting: the two clocks, side by side.
--
-- The timer answers "how long did this project cost us". The standup answers
-- "what did this person account for". They are independent measurements of the
-- same day and they do not agree — across the person-days where both exist they
-- differ by an average of four hours and twelve minutes.
--
-- So nothing here adds them together. Every report returns both figures and the
-- variance between them, because the variance is the finding: a task where the
-- standup claims six hours and the timer recorded one is either untracked work
-- or an inflated update, and summing the two would hide exactly that.
--
-- ── Range clamping ───────────────────────────────────────────────────────────
-- A timer started at 23:40 and stopped at 00:20 belongs to two days. Every
-- duration below is clipped to the requested window before it is summed, so a
-- day's report never borrows minutes from its neighbour.
--
-- ── Money ────────────────────────────────────────────────────────────────────
-- Only what exists is reported. `projects.budget` is returned when set; there is
-- no per-person cost rate anywhere in the schema, so no cost, margin or profit
-- is computed. Hours are the deliverable; money joins later if the rates ever
-- land.
-- ════════════════════════════════════════════════════════════════════

-- Whose numbers may this caller see? Mirrors the standup and attendance rules:
-- management sees everyone, leads and PMs see their own team, everyone else
-- sees only themselves.
CREATE OR REPLACE FUNCTION fn_can_report_on(p_profile uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_profile = auth.uid()
      OR current_user_role() IN ('super_admin', 'admin', 'hr')
      OR (current_user_role() IN ('team_lead', 'project_manager') AND shares_team_with(p_profile));
$$;

-- Minutes of a timer entry that fall inside [p_from, p_to).
CREATE OR REPLACE FUNCTION fn_clamped_minutes(
  p_started timestamptz, p_ended timestamptz, p_from timestamptz, p_to timestamptz
) RETURNS integer
LANGUAGE sql IMMUTABLE AS $$
  SELECT GREATEST(0, (EXTRACT(EPOCH FROM (
    LEAST(COALESCE(p_ended, now()), p_to) - GREATEST(p_started, p_from)
  )) / 60)::int);
$$;

-- ── Who is working on what, right now ────────────────────────────────────────
CREATE OR REPLACE FUNCTION active_timers()
RETURNS TABLE (
  profile_id uuid, profile_name text, avatar_url text,
  task_id uuid, task_title text,
  project_id uuid, project_name text,
  started_at timestamptz, running_minutes integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT pr.id, pr.name, pr.avatar_url,
         t.id, t.title,
         t.project_id, p.name,
         te.started_at,
         (EXTRACT(EPOCH FROM (now() - te.started_at)) / 60)::int
    FROM task_time_entries te
    JOIN profiles pr ON pr.id = te.profile_id
    JOIN tasks    t  ON t.id  = te.task_id
    LEFT JOIN projects p ON p.id = t.project_id
   WHERE te.ended_at IS NULL
     AND pr.is_active
     AND fn_can_report_on(te.profile_id)
   ORDER BY te.started_at;
$$;

COMMENT ON FUNCTION active_timers() IS
  'Timers running this instant, scoped to who the caller may see.';

-- ── One person''s day, as real timer segments ────────────────────────────────
-- No gap filling: a bar of what was actually tracked, holes included. The holes
-- are the point — the timer covers under four hours of an eight-hour day on
-- average, and hiding that would make the chart a lie.
CREATE OR REPLACE FUNCTION timesheet_segments(p_date date, p_profile uuid DEFAULT NULL)
RETURNS TABLE (
  profile_id uuid, profile_name text, avatar_url text,
  task_id uuid, task_title text,
  project_id uuid, project_name text,
  started_at timestamptz, ended_at timestamptz,
  minutes integer, is_running boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tz text; v_from timestamptz; v_to timestamptz;
BEGIN
  SELECT timezone INTO v_tz FROM attendance_settings LIMIT 1;
  v_from := (p_date::text || ' 00:00')::timestamp AT TIME ZONE v_tz;
  v_to   := v_from + interval '1 day';

  RETURN QUERY
  SELECT pr.id, pr.name, pr.avatar_url,
         t.id, t.title,
         t.project_id, p.name,
         GREATEST(te.started_at, v_from),
         LEAST(COALESCE(te.ended_at, now()), v_to),
         fn_clamped_minutes(te.started_at, te.ended_at, v_from, v_to),
         te.ended_at IS NULL
    FROM task_time_entries te
    JOIN profiles pr ON pr.id = te.profile_id
    JOIN tasks    t  ON t.id  = te.task_id
    LEFT JOIN projects p ON p.id = t.project_id
   WHERE te.started_at < v_to
     AND COALESCE(te.ended_at, now()) > v_from
     AND (p_profile IS NULL OR te.profile_id = p_profile)
     AND fn_can_report_on(te.profile_id)
   ORDER BY pr.name, GREATEST(te.started_at, v_from);
END;
$$;

-- ── Project backlog ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION report_project_backlog(p_from date, p_to date)
RETURNS TABLE (
  project_id uuid, project_name text, client_name text, status text,
  budget numeric,
  timer_minutes integer, standup_minutes integer, variance_minutes integer,
  people integer, tasks integer
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tz text; v_from timestamptz; v_to timestamptz;
BEGIN
  SELECT timezone INTO v_tz FROM attendance_settings LIMIT 1;
  v_from := (p_from::text || ' 00:00')::timestamp AT TIME ZONE v_tz;
  v_to   := ((p_to + 1)::text || ' 00:00')::timestamp AT TIME ZONE v_tz;

  RETURN QUERY
  WITH timer AS (
    SELECT t.project_id,
           SUM(fn_clamped_minutes(te.started_at, te.ended_at, v_from, v_to))::int AS mins,
           COUNT(DISTINCT te.profile_id)::int AS people,
           COUNT(DISTINCT te.task_id)::int    AS tasks
      FROM task_time_entries te
      JOIN tasks t ON t.id = te.task_id
     WHERE te.started_at < v_to
       AND COALESCE(te.ended_at, now()) > v_from
       AND fn_can_report_on(te.profile_id)
     GROUP BY t.project_id
  ),
  sup AS (
    SELECT se.project_id,
           SUM(se.minutes_spent)::int AS mins,
           COUNT(DISTINCT s.profile_id)::int AS people
      FROM standup_entries se
      JOIN standups s ON s.id = se.standup_id
     WHERE s.standup_date BETWEEN p_from AND p_to
       AND se.project_id IS NOT NULL
       AND fn_can_report_on(s.profile_id)
     GROUP BY se.project_id
  )
  SELECT p.id, p.name, c.name, p.status, p.budget,
         COALESCE(ti.mins, 0), COALESCE(su.mins, 0),
         COALESCE(su.mins, 0) - COALESCE(ti.mins, 0),
         GREATEST(COALESCE(ti.people, 0), COALESCE(su.people, 0)),
         COALESCE(ti.tasks, 0)
    FROM projects p
    LEFT JOIN clients c ON c.id = p.client_id
    LEFT JOIN timer ti ON ti.project_id = p.id
    LEFT JOIN sup   su ON su.project_id = p.id
   -- Only projects with something recorded in the window.
   WHERE COALESCE(ti.mins, 0) > 0 OR COALESCE(su.mins, 0) > 0
   ORDER BY COALESCE(ti.mins, 0) + COALESCE(su.mins, 0) DESC;
END;
$$;

-- ── Employee backlog ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION report_employee_backlog(p_from date, p_to date)
RETURNS TABLE (
  profile_id uuid, profile_name text, avatar_url text, role text,
  timer_minutes integer, standup_minutes integer, variance_minutes integer,
  standups_submitted integer, standups_late integer,
  required_minutes integer, projects integer
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
  -- What each person owed across the window, so a shortfall is visible.
  owed AS (
    SELECT pr.id AS profile_id,
           COALESCE(SUM(fn_standup_required_minutes(pr.id, d.day)), 0)::int AS mins
      FROM profiles pr
      CROSS JOIN generate_series(p_from, p_to, interval '1 day') AS d(day)
     WHERE pr.is_active
     GROUP BY pr.id
  )
  SELECT pr.id, pr.name, pr.avatar_url, pr.role,
         COALESCE(ti.mins, 0), COALESCE(su.mins, 0),
         COALESCE(su.mins, 0) - COALESCE(ti.mins, 0),
         COALESCE(su.submitted, 0), COALESCE(su.late, 0),
         COALESCE(ow.mins, 0), COALESCE(su.projects, 0)
    FROM profiles pr
    LEFT JOIN timer ti ON ti.profile_id = pr.id
    LEFT JOIN sup   su ON su.profile_id = pr.id
    LEFT JOIN owed  ow ON ow.profile_id = pr.id
   WHERE pr.is_active
     AND pr.role NOT IN ('client_owner', 'client_member')
     AND fn_can_report_on(pr.id)
   ORDER BY COALESCE(su.mins, 0) + COALESCE(ti.mins, 0) DESC, pr.name;
END;
$$;

REVOKE ALL ON FUNCTION active_timers()                        FROM public, anon;
REVOKE ALL ON FUNCTION timesheet_segments(date, uuid)         FROM public, anon;
REVOKE ALL ON FUNCTION report_project_backlog(date, date)     FROM public, anon;
REVOKE ALL ON FUNCTION report_employee_backlog(date, date)    FROM public, anon;
GRANT EXECUTE ON FUNCTION active_timers()                     TO authenticated;
GRANT EXECUTE ON FUNCTION timesheet_segments(date, uuid)      TO authenticated;
GRANT EXECUTE ON FUNCTION report_project_backlog(date, date)  TO authenticated;
GRANT EXECUTE ON FUNCTION report_employee_backlog(date, date) TO authenticated;
