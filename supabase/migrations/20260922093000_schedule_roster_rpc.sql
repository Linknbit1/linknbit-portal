-- One read for the Schedule calendar: capacity, plan and actual side by side.
--
-- Built on capacity_roster so the scope rule lives in exactly one place. Each row
-- is one person on one day and carries three numbers that must never be summed
-- together:
--   available_minutes  what the day holds        (fn_available_minutes)
--   planned_minutes    what has been booked into it (task_allocations)
--   tracked_minutes    what the timer measured   (task_time_entries)
--
-- The allocations themselves come back as jsonb rather than as extra rows, so one
-- call renders a whole week grid without the client stitching two result sets
-- together by person and date.
--
-- tracked_minutes is clamped to the day in the office timezone, so an entry that
-- runs past midnight counts against the day it happened in rather than landing
-- wholly on one side.

CREATE OR REPLACE FUNCTION public.schedule_roster(p_from date, p_to date, p_profile uuid DEFAULT NULL)
RETURNS TABLE(
  profile_id        uuid,
  profile_name      text,
  avatar_url        text,
  job_title         text,
  team_names        text[],
  day               date,
  available_minutes integer,
  planned_minutes   integer,
  tracked_minutes   integer,
  allocations       jsonb
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_tz text;
BEGIN
  IF NOT is_internal() THEN
    RAISE EXCEPTION 'schedule_roster: internal users only' USING ERRCODE = '42501';
  END IF;
  IF p_to < p_from OR p_to - p_from > 92 THEN
    RAISE EXCEPTION 'schedule_roster: span must be between 0 and 92 days';
  END IF;

  SELECT timezone INTO v_tz FROM attendance_settings LIMIT 1;

  RETURN QUERY
  SELECT
    c.profile_id, c.profile_name, c.avatar_url, c.job_title, c.team_names, c.day,
    c.available_minutes,
    COALESCE(al.planned, 0),
    COALESCE(tt.tracked, 0),
    COALESCE(al.items, '[]'::jsonb)
  FROM capacity_roster(p_from, p_to, p_profile) c
  LEFT JOIN LATERAL (
    SELECT
      SUM(a.planned_minutes)::int AS planned,
      jsonb_agg(jsonb_build_object(
        'id',              a.id,
        'task_id',         a.task_id,
        'task_title',      t.title,
        'project_id',      t.project_id,
        'project_name',    pr.name,
        'status',          t.status,
        'planned_minutes', a.planned_minutes,
        'start_time',      to_char(a.start_time::interval, 'HH24:MI'),
        'end_time',        to_char(a.end_time::interval,   'HH24:MI'),
        'note',            a.note
      ) ORDER BY a.start_time NULLS LAST, t.title) AS items
    FROM task_allocations a
    JOIN tasks t          ON t.id = a.task_id AND t.deleted_at IS NULL
    LEFT JOIN projects pr ON pr.id = t.project_id
    WHERE a.profile_id = c.profile_id
      AND a.day = c.day
  ) al ON true
  LEFT JOIN LATERAL (
    SELECT SUM(fn_clamped_minutes(
             te.started_at, te.ended_at,
             (c.day::text || ' 00:00')::timestamp AT TIME ZONE v_tz,
             ((c.day + 1)::text || ' 00:00')::timestamp AT TIME ZONE v_tz))::int AS tracked
      FROM task_time_entries te
     WHERE te.profile_id = c.profile_id
       AND te.started_at < ((c.day + 1)::text || ' 00:00')::timestamp AT TIME ZONE v_tz
       AND COALESCE(te.ended_at, now()) > (c.day::text || ' 00:00')::timestamp AT TIME ZONE v_tz
  ) tt ON true
  ORDER BY c.profile_name, c.day;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.schedule_roster(date, date, uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.schedule_roster(date, date, uuid) TO authenticated;
