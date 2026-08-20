-- ════════════════════════════════════════════════════════════════════
-- A standup now has to account for the day.
--
-- Required minutes = the working day (start → end, less the lunch break),
-- reduced by whatever the person was legitimately absent for: half a day of
-- leave, a late arrival, an early departure, an approved trip out of the office.
--
-- ── The trap this deliberately avoids ────────────────────────────────────────
-- Deducting an absence at face value double-counts the break. Somebody out of
-- office from 12:30 to 14:30 was away for two hours, but only one of those was
-- working time — 13:00–14:00 was lunch, which the working day already excludes.
-- Subtracting 120 would ask them to log 6h when they owe 7h. So every deduction
-- goes through fn_working_overlap_minutes, which counts only the part of an
-- interval that lands inside working hours and outside the break.
-- ════════════════════════════════════════════════════════════════════

-- ── Rich descriptions ────────────────────────────────────────────────────────
-- Same shape the BD lead notes use: the ProseMirror document alongside a plain
-- text mirror. `work_done` stays the source of truth for length checks, search
-- and anything that cannot read the JSON — including every standup written
-- before this column existed.
ALTER TABLE standup_entries
  ADD COLUMN IF NOT EXISTS work_done_doc jsonb;

COMMENT ON COLUMN standup_entries.work_done_doc IS
  'Formatted description (bold/italic/lists/links). `work_done` is its plain-text mirror.';

-- Minutes of [p_from, p_to) that are actually working time.
CREATE OR REPLACE FUNCTION fn_working_overlap_minutes(p_from time, p_to time)
RETURNS integer
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s attendance_settings;
  v_from time; v_to time;
  v_total int; v_break int;
BEGIN
  IF p_from IS NULL OR p_to IS NULL OR p_to <= p_from THEN RETURN 0; END IF;
  SELECT * INTO s FROM attendance_settings LIMIT 1;

  -- Clamp to the working day: time before the day starts or after it ends was
  -- never owed in the first place.
  v_from := GREATEST(p_from, s.work_start_time);
  v_to   := LEAST(p_to,   s.work_end_time);
  IF v_to <= v_from THEN RETURN 0; END IF;

  v_total := EXTRACT(EPOCH FROM (v_to - v_from))::int / 60;

  -- Remove any part of the span that was lunch.
  IF s.break_start_time IS NOT NULL THEN
    v_break := GREATEST(
      0,
      EXTRACT(EPOCH FROM (LEAST(v_to, s.break_end_time) - GREATEST(v_from, s.break_start_time)))::int / 60
    );
    v_total := v_total - v_break;
  END IF;

  RETURN GREATEST(0, v_total);
END;
$$;

-- ── What one person owes on one day ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_standup_required_minutes(p_profile uuid, p_date date)
RETURNS integer
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s attendance_settings;
  v_required int;
  v_day_type text; v_day_part text;
  r record;
BEGIN
  IF NOT fn_is_working_day(p_date) THEN RETURN 0; END IF;

  SELECT * INTO s FROM attendance_settings LIMIT 1;
  v_required := fn_working_day_minutes();

  SELECT a.day_type, a.day_part INTO v_day_type, v_day_part
    FROM attendance a
   WHERE a.profile_id = p_profile AND a.date = p_date;

  -- A whole day off owes nothing at all.
  IF v_day_type IN ('leave', 'holiday') AND COALESCE(v_day_part, 'full') = 'full' THEN
    RETURN 0;
  END IF;

  -- Half a day off: the half actually taken, measured against the clock rather
  -- than halved arithmetically — a morning off is not always exactly half a day
  -- once the break sits where it does.
  IF v_day_type = 'leave' AND v_day_part = 'first_half' THEN
    v_required := v_required - fn_working_overlap_minutes(s.work_start_time, s.half_day_start_time);
  ELSIF v_day_type = 'leave' AND v_day_part = 'second_half' THEN
    v_required := v_required - fn_working_overlap_minutes(s.half_day_start_time, s.work_end_time);
  END IF;

  -- Approved exceptions, each reduced to its working-time overlap.
  FOR r IN
    SELECT exception_type, requested_time, return_time
      FROM attendance_exceptions
     WHERE profile_id = p_profile AND date = p_date AND status = 'approved'
  LOOP
    IF r.exception_type = 'late_arrival' THEN
      v_required := v_required - fn_working_overlap_minutes(s.work_start_time, r.requested_time);
    ELSIF r.exception_type = 'early_departure' THEN
      v_required := v_required - fn_working_overlap_minutes(r.requested_time, s.work_end_time);
    ELSIF r.exception_type = 'out_of_office' THEN
      -- An open-ended trip out is treated as gone for the rest of the day.
      v_required := v_required - fn_working_overlap_minutes(
        r.requested_time, COALESCE(r.return_time, s.work_end_time));
    END IF;
  END LOOP;

  RETURN GREATEST(0, v_required);
END;
$$;

COMMENT ON FUNCTION fn_standup_required_minutes(uuid, date) IS
  'Minutes of work a person must account for in their standup: the working day less break, leave and approved exceptions.';

-- ── When the window opens ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_standup_opens_at(p_date date)
RETURNS timestamptz
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE s attendance_settings; ss standup_settings;
BEGIN
  SELECT * INTO s  FROM attendance_settings LIMIT 1;
  SELECT * INTO ss FROM standup_settings    LIMIT 1;

  IF ss.unlock_mode = 'fixed' THEN
    RETURN (p_date::text || ' ' || ss.unlock_time)::timestamp AT TIME ZONE s.timezone;
  END IF;
  RETURN ((p_date::text || ' ' || s.work_end_time)::timestamp AT TIME ZONE s.timezone)
         - make_interval(mins => ss.unlock_offset_min);
END;
$$;

-- ── The window, now settings-driven and carrying the day's requirement ───────
DROP FUNCTION IF EXISTS standup_window();
DROP FUNCTION IF EXISTS fn_standup_window(uuid);

CREATE OR REPLACE FUNCTION fn_standup_window(p_profile uuid)
RETURNS TABLE (
  server_now timestamptz, standup_date date, opens_at timestamptz, closes_at timestamptz,
  on_time_until timestamptz, is_open boolean, is_working_day boolean, is_required boolean,
  already_done boolean, work_end_time time, timezone text,
  required_minutes integer, min_work_done_chars integer, enforce_required_hours boolean,
  xp_on_time integer
) AS $$
DECLARE
  s attendance_settings; ss standup_settings;
  v_today date; v_opens timestamptz;
BEGIN
  SELECT * INTO s  FROM attendance_settings LIMIT 1;
  SELECT * INTO ss FROM standup_settings    LIMIT 1;

  v_today := (now() AT TIME ZONE s.timezone)::date;
  v_opens := fn_standup_opens_at(v_today);

  server_now     := now();
  standup_date   := v_today;
  opens_at       := v_opens;
  on_time_until  := v_opens + make_interval(mins => ss.on_time_window_min);
  closes_at      := fn_next_working_start(v_today);
  is_working_day := fn_is_working_day(v_today);
  is_open        := now() >= v_opens AND now() <= closes_at AND is_working_day;
  is_required    := is_working_day AND fn_standup_required(p_profile, v_today);
  already_done   := EXISTS (SELECT 1 FROM standups st WHERE st.profile_id = p_profile AND st.standup_date = v_today);
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
  already_done boolean, work_end_time time, timezone text,
  required_minutes integer, min_work_done_chars integer, enforce_required_hours boolean,
  xp_on_time integer
) AS $$
  SELECT * FROM fn_standup_window(auth.uid())
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ── Shared validation for both write paths ───────────────────────────────────
-- Submit and correct must agree about what a valid standup is, and the only way
-- to guarantee that is one function.
CREATE OR REPLACE FUNCTION fn_validate_standup_entries(
  p_profile uuid, p_date date, p_entries jsonb
) RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ss standup_settings; v_entry jsonb; v_total int := 0; v_required int; v_len int;
BEGIN
  SELECT * INTO ss FROM standup_settings LIMIT 1;

  IF jsonb_typeof(p_entries) <> 'array' OR jsonb_array_length(p_entries) = 0 THEN
    RAISE EXCEPTION 'Add at least one project update' USING ERRCODE = 'P0005';
  END IF;

  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries) LOOP
    v_len := length(btrim(COALESCE(v_entry->>'work_done', '')));
    IF v_len < ss.min_work_done_chars THEN
      RAISE EXCEPTION 'Each update needs at least % characters (one has %)',
        ss.min_work_done_chars, v_len USING ERRCODE = 'P0009';
    END IF;
    v_total := v_total + COALESCE((v_entry->>'minutes_spent')::int, 0);
  END LOOP;

  v_required := fn_standup_required_minutes(p_profile, p_date);

  IF ss.enforce_required_hours AND v_required > 0 AND v_total <> v_required THEN
    RAISE EXCEPTION 'Log exactly % minutes for today — you have logged %',
      v_required, v_total USING ERRCODE = 'P0010';
  END IF;
END;
$$;

-- ── Submit ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION submit_standup(p_entries jsonb, p_notes text DEFAULT NULL)
RETURNS uuid AS $$
DECLARE
  w record; ss standup_settings; v_standup uuid; v_entry jsonb; v_idx int := 0; v_late boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000'; END IF;
  SELECT * INTO w  FROM fn_standup_window(auth.uid());
  SELECT * INTO ss FROM standup_settings LIMIT 1;

  IF NOT w.is_working_day THEN RAISE EXCEPTION 'Standups are only submitted on working days' USING ERRCODE = 'P0001'; END IF;
  IF now() < w.opens_at THEN RAISE EXCEPTION 'The standup window is not open yet' USING ERRCODE = 'P0002'; END IF;
  IF now() > w.closes_at THEN RAISE EXCEPTION 'The standup window has closed for today' USING ERRCODE = 'P0003'; END IF;
  IF w.already_done THEN RAISE EXCEPTION 'You already submitted today''s standup' USING ERRCODE = 'P0004'; END IF;

  PERFORM fn_validate_standup_entries(auth.uid(), w.standup_date, p_entries);

  v_late := now() > w.on_time_until;

  INSERT INTO standups (profile_id, standup_date, is_late, notes)
  VALUES (auth.uid(), w.standup_date, v_late, NULLIF(btrim(p_notes), ''))
  RETURNING id INTO v_standup;

  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries) LOOP
    INSERT INTO standup_entries (standup_id, project_id, task_id, work_done, work_done_doc, minutes_spent, blocker, order_index)
    VALUES (v_standup, (v_entry->>'project_id')::uuid, NULLIF(v_entry->>'task_id','')::uuid,
            btrim(v_entry->>'work_done'), v_entry->'work_done_doc',
            (v_entry->>'minutes_spent')::int,
            NULLIF(btrim(COALESCE(v_entry->>'blocker','')),''), v_idx);
    v_idx := v_idx + 1;
  END LOOP;

  -- On-time standup → XP and reputation, at whatever the setting says today.
  IF NOT v_late AND ss.xp_on_time > 0 THEN
    INSERT INTO xp_transactions (profile_id, amount, reason)
    VALUES (auth.uid(), ss.xp_on_time, 'Daily standup: ' || w.standup_date);
  END IF;

  RETURN v_standup;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── Correct ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_standup(p_standup_id uuid, p_entries jsonb, p_notes text DEFAULT NULL)
RETURNS uuid AS $$
DECLARE
  st standups; v_entry jsonb; v_idx int := 0; v_closes timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000'; END IF;

  SELECT * INTO st FROM standups WHERE id = p_standup_id;
  IF st.id IS NULL THEN RAISE EXCEPTION 'Standup not found' USING ERRCODE = 'P0006'; END IF;
  IF st.profile_id <> auth.uid() THEN
    RAISE EXCEPTION 'You can only edit your own standup' USING ERRCODE = 'P0007';
  END IF;

  v_closes := fn_next_working_start(st.standup_date);
  IF now() > v_closes THEN
    RAISE EXCEPTION 'This standup is locked — the window has closed' USING ERRCODE = 'P0008';
  END IF;

  -- A correction has to satisfy the same rules the original did: fixing a typo
  -- must not be a way to drop below the day's hours.
  PERFORM fn_validate_standup_entries(st.profile_id, st.standup_date, p_entries);

  DELETE FROM standup_entries WHERE standup_id = st.id;

  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries) LOOP
    INSERT INTO standup_entries (standup_id, project_id, task_id, work_done, work_done_doc, minutes_spent, blocker, order_index)
    VALUES (st.id, (v_entry->>'project_id')::uuid, NULLIF(v_entry->>'task_id','')::uuid,
            btrim(v_entry->>'work_done'), v_entry->'work_done_doc',
            (v_entry->>'minutes_spent')::int,
            NULLIF(btrim(COALESCE(v_entry->>'blocker','')),''), v_idx);
    v_idx := v_idx + 1;
  END LOOP;

  UPDATE standups
     SET notes      = NULLIF(btrim(p_notes), ''),
         edited_at  = now(),
         edit_count = edit_count + 1
   WHERE id = st.id;

  RETURN st.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
