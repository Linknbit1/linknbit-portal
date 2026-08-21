-- ════════════════════════════════════════════════════════════════════
-- The timesheet stops being a list of people who happened to press start.
--
-- Until now the day chart was built from `timesheet_segments` alone, so the
-- roster WAS the set of people with a timer entry. Somebody who worked all day
-- without touching the timer, somebody on leave, somebody who never turned up —
-- all three rendered identically: as nothing at all. The one reading a lead
-- actually needs ("who has no time against today?") was the one reading the
-- screen could not give, because absence of a row and absence of work looked
-- the same.
--
-- `timesheet_roster` returns one row per person the caller may see, timer or
-- no timer, and hangs the day's context off it: what kind of day it was, when
-- they were expected in, when they actually badged in and out, the leave or the
-- exception that moved the goalposts, and how many minutes the timer caught.
--
-- Visibility is `fn_can_report_on`, unchanged and shared with the backlog
-- reports — management sees everyone, a lead or PM sees whoever shares a team
-- with them, everyone else sees themselves. The roster cannot be wider than the
-- bars drawn on it.
--
-- Additive only: nothing is renamed or dropped, and `timesheet_segments` keeps
-- its exact shape, so a client running the old bundle is unaffected.
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION timesheet_roster(p_date date)
RETURNS TABLE (
  profile_id       uuid,
  profile_name     text,
  avatar_url       text,
  role             text,
  job_title        text,
  team_names       text[],
  is_working_day   boolean,
  day_type         text,
  day_part         text,
  att_status       text,
  check_in         timestamptz,
  check_out        timestamptz,
  leave_type       text,
  leave_color      text,
  holiday_name     text,
  -- 'HH:MM' in the office timezone. NULL when nobody is expected in at all.
  expected_start   text,
  expected_end     text,
  required_minutes integer,
  tracked_minutes  integer,
  segments         integer,
  exceptions       jsonb
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tz text; v_from timestamptz; v_to timestamptz;
  v_start time; v_end time; v_half time;
  v_working boolean; v_holiday text; v_company_wfh boolean;
BEGIN
  SELECT s.timezone, s.work_start_time, s.work_end_time, s.half_day_start_time
    INTO v_tz, v_start, v_end, v_half
    FROM attendance_settings s LIMIT 1;

  v_from := (p_date::text || ' 00:00')::timestamp AT TIME ZONE v_tz;
  v_to   := v_from + interval '1 day';

  v_working     := fn_is_working_day(p_date);
  v_company_wfh := EXISTS (SELECT 1 FROM company_wfh_days w WHERE w.date = p_date);
  SELECT h.name INTO v_holiday FROM holidays h WHERE h.date = p_date LIMIT 1;

  RETURN QUERY
  WITH person AS (
    SELECT pr.id, pr.name, pr.avatar_url, pr.role,
           COALESCE(dg.name, pr.job_title) AS title,
           pr.allowed_check_in
      FROM profiles pr
      LEFT JOIN designations dg ON dg.id = pr.designation_id
     WHERE pr.is_active
       AND pr.role NOT IN ('client_owner', 'client_member')
       AND fn_can_report_on(pr.id)
  )
  SELECT
    p.id, p.name, p.avatar_url, p.role, p.title,
    COALESCE(tm.names, ARRAY[]::text[]),
    v_working,
    -- The attendance row is authoritative when it exists; a request that has
    -- been approved but not yet written to one still has to show, or a leave
    -- booked for tomorrow reads as an ordinary absent day.
    COALESCE(
      a.day_type,
      CASE
        WHEN v_holiday IS NOT NULL              THEN 'holiday'
        WHEN lv.name IS NOT NULL                THEN 'leave'
        WHEN wf.day_part IS NOT NULL
          OR v_company_wfh                      THEN 'wfh'
        ELSE 'work'
      END
    ),
    COALESCE(a.day_part, lv.day_part, wf.day_part, 'full'),
    a.status, a.check_in, a.check_out,
    lv.name, lv.color, v_holiday,

    -- ── When they were due in ────────────────────────────────────────────────
    -- Half a day of leave moves one edge of the window to the half-day mark; a
    -- personal allowed check-in moves the opening. A full day off returns NULL
    -- on both sides rather than a window nobody was expected to fill.
    CASE
      WHEN NOT v_working THEN NULL
      WHEN COALESCE(a.day_type, CASE WHEN lv.name IS NOT NULL THEN 'leave' ELSE 'work' END)
             IN ('leave', 'holiday')
       AND COALESCE(a.day_part, lv.day_part, 'full') = 'full' THEN NULL
      WHEN COALESCE(a.day_part, lv.day_part, 'full') = 'first_half' THEN to_char(v_half::interval, 'HH24:MI')
      ELSE to_char(COALESCE(p.allowed_check_in, v_start)::interval, 'HH24:MI')
    END,
    CASE
      WHEN NOT v_working THEN NULL
      WHEN COALESCE(a.day_type, CASE WHEN lv.name IS NOT NULL THEN 'leave' ELSE 'work' END)
             IN ('leave', 'holiday')
       AND COALESCE(a.day_part, lv.day_part, 'full') = 'full' THEN NULL
      WHEN COALESCE(a.day_part, lv.day_part, 'full') = 'second_half' THEN to_char(v_half::interval, 'HH24:MI')
      ELSE to_char(v_end::interval, 'HH24:MI')
    END,

    fn_standup_required_minutes(p.id, p_date),
    COALESCE(tt.mins, 0), COALESCE(tt.segs, 0),
    COALESCE(ex.items, '[]'::jsonb)
  FROM person p

  LEFT JOIN attendance a
    ON a.profile_id = p.id AND a.date = p_date

  LEFT JOIN LATERAL (
    SELECT array_agg(t.name ORDER BY t.name) AS names
      FROM team_members m JOIN teams t ON t.id = m.team_id
     WHERE m.profile_id = p.id
  ) tm ON true

  LEFT JOIN LATERAL (
    SELECT lr.day_part, lt.name, lt.color
      FROM leave_requests lr
      JOIN leave_types lt ON lt.id = lr.leave_type_id
     WHERE lr.profile_id = p.id
       AND lr.status = 'approved'
       AND p_date BETWEEN lr.start_date AND lr.end_date
     ORDER BY lr.created_at DESC
     LIMIT 1
  ) lv ON true

  LEFT JOIN LATERAL (
    SELECT wr.day_part
      FROM wfh_requests wr
     WHERE wr.profile_id = p.id
       AND wr.status = 'approved'
       AND p_date BETWEEN wr.start_date AND wr.end_date
     ORDER BY wr.created_at DESC
     LIMIT 1
  ) wf ON true

  LEFT JOIN LATERAL (
    SELECT SUM(fn_clamped_minutes(te.started_at, te.ended_at, v_from, v_to))::int AS mins,
           COUNT(*)::int AS segs
      FROM task_time_entries te
     WHERE te.profile_id = p.id
       AND te.started_at < v_to
       AND COALESCE(te.ended_at, now()) > v_from
  ) tt ON true

  -- Rejected requests are left out: they changed nothing about the day, and
  -- drawing them would put a band on the bar for time the person was in.
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object(
             'type',             e.exception_type,
             'status',           e.status,
             'requested_time',   to_char(e.requested_time::interval, 'HH24:MI'),
             'return_time',      to_char(e.return_time::interval, 'HH24:MI'),
             'actual_departure', e.actual_departure,
             'actual_return',    e.actual_return,
             'reason',           e.reason
           ) ORDER BY e.requested_time) AS items
      FROM attendance_exceptions e
     WHERE e.profile_id = p.id
       AND e.date = p_date
       AND e.status <> 'rejected'
  ) ex ON true

  ORDER BY COALESCE(tt.mins, 0) DESC, p.name;
END;
$$;

COMMENT ON FUNCTION timesheet_roster(date) IS
  'One row per person the caller may report on, with the day''s attendance, leave, exceptions and tracked minutes — whether or not a timer ever ran.';

REVOKE ALL ON FUNCTION timesheet_roster(date) FROM public, anon;
GRANT EXECUTE ON FUNCTION timesheet_roster(date) TO authenticated;
