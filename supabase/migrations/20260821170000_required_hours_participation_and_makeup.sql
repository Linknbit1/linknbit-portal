-- ════════════════════════════════════════════════════════════════════
-- Two corrections to what a person owes.
--
-- ── 1. Somebody who is never asked owes nothing ──────────────────────────────
-- fn_standup_required_minutes checked working days, leave and exceptions, but
-- never whether this person submits a standup at all. So an admin, an HR
-- manager and every employee explicitly excluded from the ritual showed a full
-- month's requirement in the backlog — and a full month's shortfall against it.
-- Participation is now the first question asked.
--
-- ── 2. An exception is a debt, not a discount ────────────────────────────────
-- Two hours out of the office still reduces that day's standup: the person was
-- not there, and asking them to write up eight hours they did not work would
-- only teach them to invent two. But the hours do not vanish — they are unpaid,
-- and they are made up later.
--
-- So the day's requirement drops AND the same two hours are recorded as a
-- make-up balance. Logging more than a later day requires pays that balance
-- down. The balance is what payroll and a manager actually want to see; the
-- daily figure is only ever about what to write up today.
-- ════════════════════════════════════════════════════════════════════

-- ── Required minutes, now aware of participation ─────────────────────────────
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
  -- Nothing is owed by somebody the standup never asks. This is the check that
  -- was missing: without it every non-participant carried a full requirement.
  IF NOT fn_standup_required(p_profile, p_date) THEN RETURN 0; END IF;

  SELECT work_start_time, work_end_time, half_day_start_time
    INTO v_start, v_end, v_half
    FROM attendance_settings LIMIT 1;

  SELECT a.day_type, a.day_part INTO v_day_type, v_day_part
    FROM attendance a
   WHERE a.profile_id = p_profile AND a.date = p_date;

  IF v_day_type IN ('leave', 'holiday') AND COALESCE(v_day_part, 'full') = 'full' THEN
    RETURN 0;
  END IF;

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
$$;

-- ── Unpaid minutes: the working time an approved exception took away ─────────
-- Leave is not counted here. Leave is a benefit that was granted; an exception
-- is time the person was absent and is not paid for, and only the second has to
-- be worked back.
CREATE OR REPLACE FUNCTION fn_unpaid_exception_minutes(p_profile uuid, p_date date)
RETURNS integer
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_start time; v_end time; v_total int := 0; r record;
BEGIN
  IF NOT fn_is_working_day(p_date) THEN RETURN 0; END IF;

  SELECT work_start_time, work_end_time INTO v_start, v_end
    FROM attendance_settings LIMIT 1;

  -- Merged the same way required minutes are, so two overlapping exceptions on
  -- one day are one absence rather than two.
  FOR r IN
    WITH raw(f, t) AS (
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
    v_total := v_total + fn_working_overlap_minutes(r.f, r.t);
  END LOOP;

  RETURN v_total;
END;
$$;

COMMENT ON FUNCTION fn_unpaid_exception_minutes(uuid, date) IS
  'Working minutes an approved exception removed from the day — unpaid, and owed back as make-up time.';

-- ── The make-up balance over a window ────────────────────────────────────────
-- owed  = unpaid exception minutes
-- made  = whatever was logged above the day''s requirement
-- The balance is owed − made, floored at zero: a person cannot bank credit by
-- overworking on a day they owed nothing.
CREATE OR REPLACE FUNCTION fn_makeup_balance(p_profile uuid, p_from date, p_to date)
RETURNS TABLE (owed_minutes integer, made_up_minutes integer, balance_minutes integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH days AS (
    SELECT d::date AS day FROM generate_series(p_from, p_to, interval '1 day') d
  ),
  per_day AS (
    SELECT
      fn_unpaid_exception_minutes(p_profile, days.day) AS owed,
      GREATEST(0,
        COALESCE((
          SELECT SUM(se.minutes_spent)::int
            FROM standups s JOIN standup_entries se ON se.standup_id = s.id
           WHERE s.profile_id = p_profile AND s.standup_date = days.day
        ), 0) - fn_standup_required_minutes(p_profile, days.day)
      ) AS made
    FROM days
  )
  SELECT COALESCE(SUM(owed), 0)::int,
         COALESCE(SUM(made), 0)::int,
         GREATEST(0, COALESCE(SUM(owed), 0) - COALESCE(SUM(made), 0))::int
    FROM per_day;
$$;

-- ── Logging beyond the day, to work a balance off ────────────────────────────
-- The hours rule was "exactly the required minutes". That left nowhere to put
-- make-up time: every day was pinned to its own figure, so a debt could never be
-- paid. A day may now run over — but only by as much as is actually outstanding.
CREATE OR REPLACE FUNCTION fn_validate_standup_entries(
  p_profile uuid, p_date date, p_entries jsonb
) RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ss standup_settings; v_entry jsonb; v_total int := 0; v_required int; v_len int;
  v_outstanding int := 0; v_ceiling int;
BEGIN
  SELECT * INTO ss FROM standup_settings LIMIT 1;

  IF jsonb_typeof(p_entries) <> 'array' OR jsonb_array_length(p_entries) = 0 THEN
    RAISE EXCEPTION 'Add at least one update' USING ERRCODE = 'P0005';
  END IF;

  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries) LOOP
    IF NULLIF(v_entry->>'project_id','') IS NULL
       AND length(btrim(COALESCE(v_entry->>'title',''))) < 3 THEN
      RAISE EXCEPTION 'Every update needs a project, or a title of its own' USING ERRCODE = 'P0011';
    END IF;

    v_len := length(btrim(COALESCE(v_entry->>'work_done', '')));
    IF v_len < ss.min_work_done_chars THEN
      RAISE EXCEPTION 'Each update needs at least % characters (one has %)',
        ss.min_work_done_chars, v_len USING ERRCODE = 'P0009';
    END IF;
    v_total := v_total + COALESCE((v_entry->>'minutes_spent')::int, 0);
  END LOOP;

  v_required := fn_standup_required_minutes(p_profile, p_date);

  IF ss.enforce_required_hours AND v_required > 0 THEN
    -- What is still owed from earlier in the month, excluding today.
    SELECT balance_minutes INTO v_outstanding
      FROM fn_makeup_balance(p_profile, date_trunc('month', p_date)::date, p_date - 1);

    v_ceiling := v_required + COALESCE(v_outstanding, 0);

    IF v_total < v_required THEN
      RAISE EXCEPTION 'Log at least % minutes for today — you have logged %',
        v_required, v_total USING ERRCODE = 'P0010';
    END IF;
    IF v_total > v_ceiling THEN
      RAISE EXCEPTION 'Today allows % minutes at most (% required, % make-up owed) — you have logged %',
        v_ceiling, v_required, COALESCE(v_outstanding, 0), v_total USING ERRCODE = 'P0010';
    END IF;
  END IF;
END;
$$;

-- ── Surface the balance on the window, so the form can explain itself ────────
DROP FUNCTION IF EXISTS standup_window();
DROP FUNCTION IF EXISTS fn_standup_window(uuid);

CREATE OR REPLACE FUNCTION fn_standup_window(p_profile uuid)
RETURNS TABLE (
  server_now timestamptz, standup_date date, opens_at timestamptz, closes_at timestamptz,
  on_time_until timestamptz, is_open boolean, is_working_day boolean, is_required boolean,
  already_done boolean, my_standup_id uuid, can_edit boolean,
  work_end_time time, timezone text,
  required_minutes integer, min_work_done_chars integer, enforce_required_hours boolean,
  xp_on_time integer, makeup_owed_minutes integer
) AS $$
DECLARE
  s attendance_settings; ss standup_settings;
  v_today date; v_opens timestamptz; v_closes timestamptz; v_standup uuid;
BEGIN
  SELECT * INTO s  FROM attendance_settings LIMIT 1;
  SELECT * INTO ss FROM standup_settings    LIMIT 1;

  v_today  := (now() AT TIME ZONE s.timezone)::date;
  v_opens  := fn_standup_opens_at(v_today);
  v_closes := fn_next_working_start(v_today);

  SELECT st.id INTO v_standup
    FROM standups st
   WHERE st.profile_id = p_profile AND st.standup_date = v_today;

  server_now     := now();
  standup_date   := v_today;
  opens_at       := v_opens;
  on_time_until  := v_opens + make_interval(mins => ss.on_time_window_min);
  closes_at      := v_closes;
  is_working_day := fn_is_working_day(v_today);
  is_open        := now() >= v_opens AND now() <= v_closes AND is_working_day;
  is_required    := fn_standup_required(p_profile, v_today);
  already_done   := v_standup IS NOT NULL;
  my_standup_id  := v_standup;
  can_edit       := v_standup IS NOT NULL AND now() <= v_closes;
  work_end_time  := s.work_end_time;
  timezone       := s.timezone;

  required_minutes       := fn_standup_required_minutes(p_profile, v_today);
  min_work_done_chars    := ss.min_work_done_chars;
  enforce_required_hours := ss.enforce_required_hours;
  xp_on_time             := ss.xp_on_time;

  SELECT balance_minutes INTO makeup_owed_minutes
    FROM fn_makeup_balance(p_profile, date_trunc('month', v_today)::date, v_today - 1);
  makeup_owed_minutes := COALESCE(makeup_owed_minutes, 0);

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION standup_window()
RETURNS TABLE (
  server_now timestamptz, standup_date date, opens_at timestamptz, closes_at timestamptz,
  on_time_until timestamptz, is_open boolean, is_working_day boolean, is_required boolean,
  already_done boolean, my_standup_id uuid, can_edit boolean,
  work_end_time time, timezone text,
  required_minutes integer, min_work_done_chars integer, enforce_required_hours boolean,
  xp_on_time integer, makeup_owed_minutes integer
) AS $$
  SELECT * FROM fn_standup_window(auth.uid())
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION fn_makeup_balance(uuid, date, date) FROM public;
REVOKE ALL ON FUNCTION fn_makeup_balance(uuid, date, date) FROM anon;
GRANT EXECUTE ON FUNCTION fn_makeup_balance(uuid, date, date) TO authenticated;
