-- ════════════════════════════════════════════════════════════════════
-- Absences must be merged before they are subtracted.
--
-- The first cut deducted each absence in turn. Overlapping ones were therefore
-- counted twice: a morning of leave (09:00–14:00) plus an approved trip out
-- from 12:30 to 14:30 removed 240 + 60 = 300 minutes, leaving 180. The person
-- was actually only away until 14:30, so they owe 14:30–18:00 = 210.
--
-- Same shape of mistake as double-counting the lunch break, one level up. The
-- fix is the same: work out the union of the intervals first, then measure it
-- once.
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_standup_required_minutes(p_profile uuid, p_date date)
RETURNS integer
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_start time; v_end time; v_half time;
  v_day_type text; v_day_part text;
  v_deducted int := 0;
  r record;
BEGIN
  IF NOT fn_is_working_day(p_date) THEN RETURN 0; END IF;

  SELECT work_start_time, work_end_time, half_day_start_time
    INTO v_start, v_end, v_half
    FROM attendance_settings LIMIT 1;

  SELECT a.day_type, a.day_part INTO v_day_type, v_day_part
    FROM attendance a
   WHERE a.profile_id = p_profile AND a.date = p_date;

  IF v_day_type IN ('leave', 'holiday') AND COALESCE(v_day_part, 'full') = 'full' THEN
    RETURN 0;
  END IF;

  -- Every absence as an interval, merged into non-overlapping runs, then
  -- measured against working time.
  FOR r IN
    WITH raw(f, t) AS (
      SELECT v_start, v_half
       WHERE v_day_type = 'leave' AND v_day_part = 'first_half'
      UNION ALL
      SELECT v_half, v_end
       WHERE v_day_type = 'leave' AND v_day_part = 'second_half'
      UNION ALL
      SELECT
        CASE WHEN e.exception_type = 'late_arrival' THEN v_start ELSE e.requested_time END,
        CASE
          WHEN e.exception_type = 'late_arrival'    THEN e.requested_time
          WHEN e.exception_type = 'early_departure' THEN v_end
          -- An open-ended trip out is treated as gone for the rest of the day.
          ELSE COALESCE(e.return_time, v_end)
        END
      FROM attendance_exceptions e
      WHERE e.profile_id = p_profile AND e.date = p_date AND e.status = 'approved'
    ),
    valid AS (
      SELECT f, t FROM raw WHERE f IS NOT NULL AND t IS NOT NULL AND t > f
    ),
    ordered AS (
      SELECT f, t,
             MAX(t) OVER (ORDER BY f, t ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS prev_max
        FROM valid
    ),
    grouped AS (
      SELECT f, t,
             SUM(CASE WHEN prev_max IS NULL OR f > prev_max THEN 1 ELSE 0 END)
               OVER (ORDER BY f, t) AS run
        FROM ordered
    )
    SELECT MIN(f) AS f, MAX(t) AS t FROM grouped GROUP BY run
  LOOP
    v_deducted := v_deducted + fn_working_overlap_minutes(r.f, r.t);
  END LOOP;

  RETURN GREATEST(0, fn_working_day_minutes() - v_deducted);
END;
$$;

COMMENT ON FUNCTION fn_standup_required_minutes(uuid, date) IS
  'Minutes a person must account for: the working day less break, less the UNION of leave and approved exceptions.';
