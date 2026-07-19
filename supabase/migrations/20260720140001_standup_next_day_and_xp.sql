-- Standup v2: submittable until the NEXT working day's start; on-time (5 XP + 5
-- reputation) only within opens_at + 60 min; after that it's late (no points).

DROP FUNCTION IF EXISTS standup_window();
DROP FUNCTION IF EXISTS fn_standup_window(uuid);

-- Next working day's start instant after a given office-local date.
CREATE OR REPLACE FUNCTION fn_next_working_start(p_date date)
RETURNS timestamptz AS $$
DECLARE s attendance_settings; d date; i int := 1;
BEGIN
  SELECT * INTO s FROM attendance_settings LIMIT 1;
  LOOP
    d := p_date + i;
    EXIT WHEN fn_is_working_day(d) OR i > 10;
    i := i + 1;
  END LOOP;
  RETURN (d::text || ' ' || s.work_start_time)::timestamp AT TIME ZONE s.timezone;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION fn_standup_window(p_profile uuid)
RETURNS TABLE (
  server_now timestamptz, standup_date date, opens_at timestamptz, closes_at timestamptz,
  on_time_until timestamptz, is_open boolean, is_working_day boolean, is_required boolean,
  already_done boolean, work_end_time time, timezone text
) AS $$
DECLARE
  s attendance_settings; v_today date; v_end timestamptz; v_opens timestamptz;
  v_role text; v_active boolean; v_excl boolean; v_onleave boolean;
BEGIN
  SELECT * INTO s FROM attendance_settings LIMIT 1;
  v_today := (now() AT TIME ZONE s.timezone)::date;
  v_end   := (v_today::text || ' ' || s.work_end_time)::timestamp AT TIME ZONE s.timezone;
  v_opens := v_end - interval '5 minutes';

  SELECT p.role, p.is_active, p.attendance_excluded INTO v_role, v_active, v_excl
  FROM profiles p WHERE p.id = p_profile;
  SELECT EXISTS (SELECT 1 FROM attendance a WHERE a.profile_id = p_profile AND a.date = v_today AND a.status = 'leave') INTO v_onleave;

  server_now     := now();
  standup_date   := v_today;
  opens_at       := v_opens;
  on_time_until  := v_opens + interval '60 minutes';
  closes_at      := fn_next_working_start(v_today);
  is_working_day := fn_is_working_day(v_today);
  is_open        := now() >= v_opens AND now() <= closes_at AND is_working_day;
  is_required    := is_working_day AND COALESCE(v_active,false) AND NOT COALESCE(v_excl,false)
                    AND v_role = 'employee' AND NOT v_onleave;
  already_done   := EXISTS (SELECT 1 FROM standups st WHERE st.profile_id = p_profile AND st.standup_date = v_today);
  work_end_time  := s.work_end_time;
  timezone       := s.timezone;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION standup_window()
RETURNS TABLE (
  server_now timestamptz, standup_date date, opens_at timestamptz, closes_at timestamptz,
  on_time_until timestamptz, is_open boolean, is_working_day boolean, is_required boolean,
  already_done boolean, work_end_time time, timezone text
) AS $$
  SELECT * FROM fn_standup_window(auth.uid())
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION submit_standup(p_entries jsonb, p_notes text DEFAULT NULL)
RETURNS uuid AS $$
DECLARE
  w record; v_standup uuid; v_entry jsonb; v_idx int := 0; v_late boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000'; END IF;
  SELECT * INTO w FROM fn_standup_window(auth.uid());

  IF NOT w.is_working_day THEN RAISE EXCEPTION 'Standups are only submitted on working days' USING ERRCODE = 'P0001'; END IF;
  IF now() < w.opens_at THEN RAISE EXCEPTION 'The standup window is not open yet' USING ERRCODE = 'P0002'; END IF;
  IF now() > w.closes_at THEN RAISE EXCEPTION 'The standup window has closed for today' USING ERRCODE = 'P0003'; END IF;
  IF w.already_done THEN RAISE EXCEPTION 'You already submitted today''s standup' USING ERRCODE = 'P0004'; END IF;
  IF jsonb_typeof(p_entries) <> 'array' OR jsonb_array_length(p_entries) = 0 THEN
    RAISE EXCEPTION 'Add at least one project update' USING ERRCODE = 'P0005'; END IF;

  v_late := now() > w.on_time_until;

  INSERT INTO standups (profile_id, standup_date, is_late, notes)
  VALUES (auth.uid(), w.standup_date, v_late, NULLIF(btrim(p_notes), ''))
  RETURNING id INTO v_standup;

  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries) LOOP
    INSERT INTO standup_entries (standup_id, project_id, task_id, work_done, minutes_spent, blocker, order_index)
    VALUES (v_standup, (v_entry->>'project_id')::uuid, NULLIF(v_entry->>'task_id','')::uuid,
            btrim(v_entry->>'work_done'), (v_entry->>'minutes_spent')::int,
            NULLIF(btrim(COALESCE(v_entry->>'blocker','')),''), v_idx);
    v_idx := v_idx + 1;
  END LOOP;

  -- On-time standup → +5 XP and +5 reputation (one positive tx credits both).
  IF NOT v_late THEN
    INSERT INTO xp_transactions (profile_id, amount, reason)
    VALUES (auth.uid(), 5, 'Daily standup: ' || w.standup_date);
  END IF;

  RETURN v_standup;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
