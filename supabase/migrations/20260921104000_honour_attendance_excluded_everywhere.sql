-- "Excluded from attendance" now means one thing.
--
-- Ten places decide who counts for attendance. Before this, the setting was
-- honoured in exactly one of them — day_roster. Everywhere else the three excluded
-- people were treated as ordinary staff, which is why they still appeared on the
-- Timesheet with expected start and end times and a required day.
--
-- Worse, fn_mark_absent_for_date ignored it too, so the nightly job had written
-- 96 'absent' rows for them: 32 each for ADMIN, Asfandyar and Saif Ullah, between
-- 18 Jun and 18 Sep. All 96 were system-written, none had a check-in, none sat on
-- a leave or holiday — pure noise, and they fed XP, the make-up balance and the
-- backlog report. Deleted here.
--
-- fn_auto_checkout_missing is deliberately untouched: it only acts on rows that
-- have a check-in, and an excluded person has none, so it is already a no-op for
-- them. Adding a guard there would be decoration.
--
-- timesheet_roster keeps excluded people on the list rather than hiding them —
-- they can still track time, and dropping them would hide real tracked hours — but
-- returns nothing that implies an attendance expectation: no working-day flag, no
-- day type, no status, no expected start or end, no required minutes, no
-- exceptions. It gains an `attendance_excluded` boolean so the UI can render one
-- muted "Not tracked" state instead of a row of blanks that reads like missing data.
--
-- That is a return-type change, hence DROP + CREATE rather than CREATE OR REPLACE.
-- It is additive for callers — PostgREST returns the extra field and older bundles
-- ignore it — and the whole migration is one transaction, so no request sees the
-- function missing. The grant is restored explicitly because DROP takes it away.
--
-- timesheet_roster also picks up fn_employed_on here, replacing its is_active test,
-- for the same reason as the other rosters.

CREATE OR REPLACE FUNCTION public.fn_mark_absent_for_date(d date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO attendance (profile_id, date, status, day_type, day_part, source, note)
  SELECT p.id, d,
         CASE WHEN u.kind = 'wfh' THEN NULL  ELSE 'absent' END,
         CASE WHEN u.kind = 'wfh' THEN 'wfh' ELSE 'work'   END,
         'full', 'system',
         CASE WHEN u.kind = 'wfh' THEN 'Remote (no office check-in)' END
  FROM profiles p
  CROSS JOIN LATERAL (SELECT fn_unmarked_day_type(p.id) AS kind) u
  WHERE p.is_active
    AND is_internal_profile(p.id)
    AND NOT p.attendance_excluded
    AND fn_employed_on(p.id, d)
    AND p.schedule_mode <> 'flexible'
    AND fn_is_working_day_for(p.id, d)
    AND NOT EXISTS (SELECT 1 FROM attendance a WHERE a.profile_id = p.id AND a.date = d)
  ON CONFLICT (profile_id, date) DO NOTHING;
END;
$function$;

DELETE FROM attendance a
 USING profiles p
 WHERE p.id = a.profile_id
   AND p.attendance_excluded
   AND a.source = 'system'
   AND a.check_in IS NULL
   AND a.status = 'absent';

DROP FUNCTION IF EXISTS public.timesheet_roster(date);

CREATE FUNCTION public.timesheet_roster(p_date date)
 RETURNS TABLE(profile_id uuid, profile_name text, avatar_url text, role text, job_title text, team_names text[], is_working_day boolean, day_type text, day_part text, att_status text, check_in timestamp with time zone, check_out timestamp with time zone, leave_type text, leave_color text, holiday_name text, expected_start text, expected_end text, required_minutes integer, tracked_minutes integer, segments integer, exceptions jsonb, attendance_excluded boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tz text; v_from timestamptz; v_to timestamptz;
  v_start time; v_end time; v_half time;
  v_holiday text; v_company_wfh boolean;
BEGIN
  SELECT s.timezone, s.work_start_time, s.work_end_time, s.half_day_start_time
    INTO v_tz, v_start, v_end, v_half
    FROM attendance_settings s LIMIT 1;

  v_from := (p_date::text || ' 00:00')::timestamp AT TIME ZONE v_tz;
  v_to   := v_from + interval '1 day';

  v_company_wfh := EXISTS (SELECT 1 FROM company_wfh_days w WHERE w.date = p_date);
  SELECT h.name INTO v_holiday FROM holidays h WHERE h.date = p_date LIMIT 1;

  RETURN QUERY
  WITH person AS (
    SELECT pr.id, pr.name, pr.avatar_url, pr.role,
           COALESCE(dg.name, pr.job_title) AS title,
           pr.allowed_check_in,
           pr.attendance_excluded
      FROM profiles pr
      LEFT JOIN designations dg ON dg.id = pr.designation_id
     WHERE pr.role NOT IN ('client_owner', 'client_member')
       AND fn_employed_on(pr.id, p_date)
       AND fn_can_report_on(pr.id)
  )
  SELECT
    p.id, p.name, p.avatar_url, p.role, p.title,
    COALESCE(tm.names, ARRAY[]::text[]),
    CASE WHEN p.attendance_excluded THEN false ELSE wd.ok END,
    CASE WHEN p.attendance_excluded THEN NULL ELSE COALESCE(
      a.day_type,
      CASE
        WHEN v_holiday IS NOT NULL              THEN 'holiday'
        WHEN lv.name IS NOT NULL                THEN 'leave'
        WHEN wf.day_part IS NOT NULL
          OR v_company_wfh                      THEN 'wfh'
        ELSE 'work'
      END
    ) END,
    COALESCE(a.day_part, lv.day_part, wf.day_part, 'full'),
    CASE WHEN p.attendance_excluded THEN NULL ELSE a.status END,
    a.check_in, a.check_out,
    lv.name, lv.color, v_holiday,
    CASE
      WHEN p.attendance_excluded THEN NULL
      WHEN NOT wd.ok THEN NULL
      WHEN COALESCE(a.day_type, CASE WHEN lv.name IS NOT NULL THEN 'leave' ELSE 'work' END)
             IN ('leave', 'holiday')
       AND COALESCE(a.day_part, lv.day_part, 'full') = 'full' THEN NULL
      WHEN COALESCE(a.day_part, lv.day_part, 'full') = 'first_half' THEN to_char(v_half::interval, 'HH24:MI')
      ELSE to_char(COALESCE(p.allowed_check_in, v_start)::interval, 'HH24:MI')
    END,
    CASE
      WHEN p.attendance_excluded THEN NULL
      WHEN NOT wd.ok THEN NULL
      WHEN COALESCE(a.day_type, CASE WHEN lv.name IS NOT NULL THEN 'leave' ELSE 'work' END)
             IN ('leave', 'holiday')
       AND COALESCE(a.day_part, lv.day_part, 'full') = 'full' THEN NULL
      WHEN COALESCE(a.day_part, lv.day_part, 'full') = 'second_half' THEN to_char(v_half::interval, 'HH24:MI')
      ELSE to_char(v_end::interval, 'HH24:MI')
    END,
    CASE WHEN p.attendance_excluded THEN 0 ELSE fn_standup_required_minutes(p.id, p_date) END,
    COALESCE(tt.mins, 0), COALESCE(tt.segs, 0),
    CASE WHEN p.attendance_excluded THEN '[]'::jsonb ELSE COALESCE(ex.items, '[]'::jsonb) END,
    p.attendance_excluded
  FROM person p
  LEFT JOIN LATERAL (SELECT fn_is_working_day_for(p.id, p_date) AS ok) wd ON true
  LEFT JOIN attendance a ON a.profile_id = p.id AND a.date = p_date
  LEFT JOIN LATERAL (
    SELECT array_agg(t.name ORDER BY t.name) AS names
      FROM team_members m JOIN teams t ON t.id = m.team_id
     WHERE m.profile_id = p.id
  ) tm ON true
  LEFT JOIN LATERAL (
    SELECT lr.day_part, lt.name, lt.color
      FROM leave_requests lr
      JOIN leave_types lt ON lt.id = lr.leave_type_id
     WHERE lr.profile_id = p.id AND lr.status = 'approved'
       AND p_date BETWEEN lr.start_date AND lr.end_date
     ORDER BY lr.created_at DESC LIMIT 1
  ) lv ON true
  LEFT JOIN LATERAL (
    SELECT wr.day_part FROM wfh_requests wr
     WHERE wr.profile_id = p.id AND wr.status = 'approved'
       AND p_date BETWEEN wr.start_date AND wr.end_date
     ORDER BY wr.created_at DESC LIMIT 1
  ) wf ON true
  LEFT JOIN LATERAL (
    SELECT SUM(fn_clamped_minutes(te.started_at, te.ended_at, v_from, v_to))::int AS mins,
           COUNT(*)::int AS segs
      FROM task_time_entries te
     WHERE te.profile_id = p.id
       AND te.started_at < v_to AND COALESCE(te.ended_at, now()) > v_from
  ) tt ON true
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object(
             'type', e.exception_type, 'status', e.status,
             'requested_time', to_char(e.requested_time::interval, 'HH24:MI'),
             'return_time',    to_char(e.return_time::interval, 'HH24:MI'),
             'actual_departure', e.actual_departure,
             'actual_return',    e.actual_return,
             'reason', e.reason
           ) ORDER BY e.requested_time) AS items
      FROM attendance_exceptions e
     WHERE e.profile_id = p.id AND e.date = p_date AND e.status <> 'rejected'
  ) ex ON true
  ORDER BY COALESCE(tt.mins, 0) DESC, p.name;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.timesheet_roster(date) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.timesheet_roster(date) TO authenticated;
