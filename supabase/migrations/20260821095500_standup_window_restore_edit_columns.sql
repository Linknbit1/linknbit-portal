-- ════════════════════════════════════════════════════════════════════
-- Restore my_standup_id / can_edit on the standup window.
--
-- The settings rewrite reissued fn_standup_window from an older definition and
-- lost the two columns the edit flow depends on: which standup is today's, and
-- whether corrections are still allowed. Nothing reads the window without them,
-- so this puts them back alongside the new settings-driven fields.
-- ════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS standup_window();
DROP FUNCTION IF EXISTS fn_standup_window(uuid);

CREATE OR REPLACE FUNCTION fn_standup_window(p_profile uuid)
RETURNS TABLE (
  server_now timestamptz, standup_date date, opens_at timestamptz, closes_at timestamptz,
  on_time_until timestamptz, is_open boolean, is_working_day boolean, is_required boolean,
  already_done boolean, my_standup_id uuid, can_edit boolean,
  work_end_time time, timezone text,
  required_minutes integer, min_work_done_chars integer, enforce_required_hours boolean,
  xp_on_time integer
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
  -- Corrections are allowed for as long as the window itself is open.
  can_edit       := v_standup IS NOT NULL AND now() <= v_closes;
  work_end_time  := s.work_end_time;
  timezone       := s.timezone;

  required_minutes       := fn_standup_required_minutes(p_profile, v_today);
  min_work_done_chars    := ss.min_work_done_chars;
  enforce_required_hours := ss.enforce_required_hours;
  xp_on_time             := ss.xp_on_time;
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
  xp_on_time integer
) AS $$
  SELECT * FROM fn_standup_window(auth.uid())
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
