-- Reports: the work log — every timer segment in a range, with what it was for.
--
-- The backlog reports answer "how many hours"; at month end the question is
-- "on what". Each start→stop now carries a required description, so one row
-- per segment is the record that answers it: who, which project and task, from
-- when to when, and the description they gave when they pressed Start.
--
-- Scoped exactly like the other reports rather than by table RLS: a person you
-- may not report on, or a project you may not report on, contributes no rows.
-- Reading task_time_entries directly would draw that line somewhere else, and
-- the work log would disagree with the totals exported beside it.
--
-- Minutes are clamped to the range, the same as the backlog totals, so a
-- segment running across midnight on the 1st is counted only for its share.
CREATE OR REPLACE FUNCTION public.report_time_entries(
  p_from date,
  p_to date,
  p_profile uuid DEFAULT NULL,
  p_project uuid DEFAULT NULL
)
RETURNS TABLE (
  entry_id uuid,
  started_at timestamptz,
  ended_at timestamptz,
  minutes integer,
  is_running boolean,
  profile_id uuid,
  profile_name text,
  project_id uuid,
  project_name text,
  client_name text,
  service_name text,
  task_id uuid,
  task_title text,
  task_deleted boolean,
  note text,
  source text,
  billable boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tz text; v_from timestamptz; v_to timestamptz;
BEGIN
  SELECT timezone INTO v_tz FROM attendance_settings LIMIT 1;
  v_from := (p_from::text || ' 00:00')::timestamp AT TIME ZONE v_tz;
  v_to   := ((p_to + 1)::text || ' 00:00')::timestamp AT TIME ZONE v_tz;

  RETURN QUERY
  SELECT te.id,
         te.started_at,
         te.ended_at,
         fn_clamped_minutes(te.started_at, te.ended_at, v_from, v_to),
         te.ended_at IS NULL,
         te.profile_id,
         pr.name,
         t.project_id,
         p.name,
         c.name,
         s.name,
         t.id,
         t.title,
         t.deleted_at IS NOT NULL,
         te.note,
         te.source,
         te.billable
    FROM task_time_entries te
    JOIN tasks t          ON t.id = te.task_id
    JOIN profiles pr      ON pr.id = te.profile_id
    LEFT JOIN projects p  ON p.id = t.project_id
    LEFT JOIN clients c   ON c.id = p.client_id
    LEFT JOIN project_services ps ON ps.id = t.project_service_id
    LEFT JOIN services s  ON s.id = ps.service_id
   WHERE te.started_at < v_to
     AND COALESCE(te.ended_at, now()) > v_from
     AND (p_profile IS NULL OR te.profile_id = p_profile)
     AND (p_project IS NULL OR t.project_id = p_project)
     AND fn_can_report_on(te.profile_id)
     AND fn_can_report_on_project(t.project_id)
   -- Stable order, so the client can page through a month without a row
   -- landing on two pages or none.
   ORDER BY te.started_at, te.id;
END;
$$;

COMMENT ON FUNCTION public.report_time_entries(date, date, uuid, uuid) IS
  'Every timer segment in a range with its description, scoped by fn_can_report_on and fn_can_report_on_project. The work-log export.';

REVOKE ALL ON FUNCTION public.report_time_entries(date, date, uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.report_time_entries(date, date, uuid, uuid) TO authenticated;
