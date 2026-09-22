-- The reports table was the second way to read a budget without the permission.
--
-- report_project_backlog is SECURITY DEFINER, so RLS does not apply inside it and
-- it returned p.budget to everyone who could open Reports. The column is NULL now
-- unless the caller holds can_view_budget. The Reports page already renders "-"
-- for a null budget, so nothing else changes.

CREATE OR REPLACE FUNCTION public.report_project_backlog(p_from date, p_to date)
 RETURNS TABLE(project_id uuid, project_name text, client_name text, status text, budget numeric, timer_minutes integer, standup_minutes integer, variance_minutes integer, people integer, tasks integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_tz text; v_from timestamptz; v_to timestamptz; v_budget boolean;
BEGIN
  SELECT timezone INTO v_tz FROM attendance_settings LIMIT 1;
  v_from := (p_from::text || ' 00:00')::timestamp AT TIME ZONE v_tz;
  v_to   := ((p_to + 1)::text || ' 00:00')::timestamp AT TIME ZONE v_tz;
  v_budget := has_feature('can_view_budget');

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
  SELECT p.id, p.name, c.name, p.status,
         CASE WHEN v_budget THEN p.budget END,
         COALESCE(ti.mins, 0), COALESCE(su.mins, 0),
         COALESCE(su.mins, 0) - COALESCE(ti.mins, 0),
         GREATEST(COALESCE(ti.people, 0), COALESCE(su.people, 0)),
         COALESCE(ti.tasks, 0)
    FROM projects p
    LEFT JOIN clients c ON c.id = p.client_id
    LEFT JOIN timer ti ON ti.project_id = p.id
    LEFT JOIN sup   su ON su.project_id = p.id
   WHERE (COALESCE(ti.mins, 0) > 0 OR COALESCE(su.mins, 0) > 0) AND fn_can_report_on_project(p.id)
   ORDER BY COALESCE(ti.mins, 0) + COALESCE(su.mins, 0) DESC;
END;
$function$;
