-- How much time a person actually has on a given day.
--
-- Every piece of this already existed and nothing put them together: work_days
-- and schedule_mode on the profile, the working day and break in
-- attendance_settings, holidays, working Saturdays, approved leave, approved
-- exceptions, and now the employment period. The portal could say whether a day
-- was a working day; it could not say how much of it was left.
--
-- Decisions worth stating:
--   * WFH does NOT reduce capacity. Working from home is working. Only leave,
--     holidays and approved exceptions take time out of a day.
--   * Approved leave counts even before the nightly job has written it to
--     attendance, so tomorrow's capacity is right the moment leave is approved
--     rather than the morning after.
--   * attendance_excluded does NOT zero capacity. Somebody exempt from check-in
--     still does a day's work; they are exempt from being *watched*, not from
--     existing. (day_roster excludes them; this deliberately does not.)
--   * Overlapping exceptions are merged before deducting, so a late arrival that
--     overlaps an out-of-office is not subtracted twice.
--
-- capacity_roster is the same answer for a team over a range. Its scope clause is
-- the planning question — whose week may you look at — rather than the attendance
-- one: yourself always, everyone with can_manage_projects or can_view_all_tasks,
-- your team's with can_view_team_tasks. Capped at 92 days so a caller cannot ask
-- for a year of per-person-per-day rows in one go.

CREATE OR REPLACE FUNCTION public.fn_available_minutes(p_profile uuid, p_date date)
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_start time; v_end time; v_half time;
  v_day_type text; v_day_part text;
  v_deducted int := 0;
  r record;
BEGIN
  IF NOT fn_employed_on(p_profile, p_date)        THEN RETURN 0; END IF;
  IF NOT fn_is_working_day_for(p_profile, p_date) THEN RETURN 0; END IF;

  SELECT work_start_time, work_end_time, half_day_start_time
    INTO v_start, v_end, v_half
    FROM attendance_settings LIMIT 1;

  SELECT a.day_type, a.day_part INTO v_day_type, v_day_part
    FROM attendance a
   WHERE a.profile_id = p_profile AND a.date = p_date;

  IF v_day_type IN ('leave', 'holiday') AND COALESCE(v_day_part, 'full') = 'full' THEN
    RETURN 0;
  END IF;

  IF v_day_type IS NULL AND EXISTS (
    SELECT 1 FROM leave_requests lr
     WHERE lr.profile_id = p_profile
       AND lr.status = 'approved'
       AND p_date BETWEEN lr.start_date AND lr.end_date
       AND lr.day_part = 'full'
  ) THEN
    RETURN 0;
  END IF;

  FOR r IN
    WITH raw(f, t) AS (
      SELECT v_start, v_half WHERE v_day_type = 'leave' AND v_day_part = 'first_half'
      UNION ALL
      SELECT v_half, v_end   WHERE v_day_type = 'leave' AND v_day_part = 'second_half'
      UNION ALL
      SELECT
        CASE WHEN e.exception_type = 'late_arrival' THEN v_start ELSE e.requested_time END,
        CASE
          WHEN e.exception_type = 'late_arrival'    THEN e.requested_time
          WHEN e.exception_type = 'early_departure' THEN v_end
          ELSE COALESCE(e.return_time, v_end)
        END
      FROM attendance_exceptions e
      WHERE e.profile_id = p_profile AND e.date = p_date AND e.status = 'approved'
    ),
    valid AS (SELECT f, t FROM raw WHERE f IS NOT NULL AND t IS NOT NULL AND t > f),
    ordered AS (
      SELECT f, t, MAX(t) OVER (ORDER BY f, t ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS prev_max
        FROM valid
    ),
    grouped AS (
      SELECT f, t, SUM(CASE WHEN prev_max IS NULL OR f > prev_max THEN 1 ELSE 0 END)
                     OVER (ORDER BY f, t) AS run
        FROM ordered
    )
    SELECT MIN(f) AS f, MAX(t) AS t FROM grouped GROUP BY run
  LOOP
    v_deducted := v_deducted + fn_working_overlap_minutes(r.f, r.t);
  END LOOP;

  RETURN GREATEST(0, fn_working_day_minutes() - v_deducted);
END;
$function$;

CREATE OR REPLACE FUNCTION public.capacity_roster(p_from date, p_to date, p_profile uuid DEFAULT NULL)
RETURNS TABLE(
  profile_id uuid, profile_name text, avatar_url text, job_title text,
  team_names text[], day date, available_minutes integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT is_internal() THEN
    RAISE EXCEPTION 'capacity_roster: internal users only' USING ERRCODE = '42501';
  END IF;
  IF p_to < p_from OR p_to - p_from > 92 THEN
    RAISE EXCEPTION 'capacity_roster: span must be between 0 and 92 days';
  END IF;

  RETURN QUERY
  SELECT
    p.id, p.name, p.avatar_url,
    COALESCE(dg.name, p.job_title),
    COALESCE(tm.names, ARRAY[]::text[]),
    d.day::date,
    fn_available_minutes(p.id, d.day::date)
  FROM profiles p
  LEFT JOIN designations dg ON dg.id = p.designation_id
  CROSS JOIN generate_series(p_from, p_to, interval '1 day') AS d(day)
  LEFT JOIN LATERAL (
    SELECT array_agg(t.name ORDER BY t.name) AS names
      FROM team_members m JOIN teams t ON t.id = m.team_id
     WHERE m.profile_id = p.id
  ) tm ON true
  WHERE p.role NOT IN ('client_owner', 'client_member')
    AND (p_profile IS NULL OR p.id = p_profile)
    AND p.joined_on <= p_to
    AND (p.left_on IS NULL OR p.left_on >= p_from)
    AND (
      p.id = auth.uid()
      OR has_feature('can_manage_projects')
      OR has_feature('can_view_all_tasks')
      OR (has_feature('can_view_team_tasks') AND shares_team_with(p.id))
    )
  ORDER BY p.name, d.day;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.fn_available_minutes(uuid, date) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.fn_available_minutes(uuid, date) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.capacity_roster(date, date, uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.capacity_roster(date, date, uuid) TO authenticated;
