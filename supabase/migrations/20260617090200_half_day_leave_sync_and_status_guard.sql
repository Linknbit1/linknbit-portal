-- Half-day leave attendance sync + self check-in status guard.
--
-- 1. Approved half-day leave writes a 'half_day' attendance row (full-day leave still
--    writes 'leave'). The note carries which half.
-- 2. A subsequent self check-in for the worked half must NOT flip the row's status
--    back to present/late. fn_set_attendance_status is rewritten (based on the
--    20260616101000 early-window version) to preserve a pre-existing
--    half_day/leave/wfh status on a self UPDATE, while still recording check_in/out.

-- ── Sync approved Leave → attendance (half_day for half parts) ─────────────────
CREATE OR REPLACE FUNCTION fn_sync_leave_to_attendance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_type_name text;
  v_status    text;
BEGIN
  -- Un-approve cleanup: remove any previously-synced leave OR half_day rows.
  IF TG_OP = 'UPDATE' AND OLD.status = 'approved' THEN
    DELETE FROM attendance
    WHERE profile_id = OLD.profile_id AND source = 'system'
      AND status IN ('leave', 'half_day')
      AND date BETWEEN OLD.start_date AND OLD.end_date;
  END IF;

  IF NEW.status = 'approved' THEN
    SELECT name INTO v_type_name FROM leave_types WHERE id = NEW.leave_type_id;
    v_status := CASE WHEN NEW.day_part = 'full' THEN 'leave' ELSE 'half_day' END;

    INSERT INTO attendance (profile_id, date, status, source, marked_by, note)
    SELECT NEW.profile_id, g.d::date, v_status, 'system', NEW.reviewed_by,
           COALESCE(v_type_name, 'Leave')
           || CASE NEW.day_part
                WHEN 'first_half'  THEN ' (first half)'
                WHEN 'second_half' THEN ' (second half)'
                ELSE ''
              END
    FROM generate_series(NEW.start_date, NEW.end_date, interval '1 day') g(d)
    WHERE fn_is_working_day(g.d::date)
    ON CONFLICT (profile_id, date) DO UPDATE
      SET status = EXCLUDED.status, source = 'system', marked_by = EXCLUDED.marked_by,
          note = EXCLUDED.note, updated_at = now()
      WHERE attendance.source <> 'self';   -- never clobber a real check-in
  END IF;
  RETURN NEW;
END;
$$;

-- ── Self check-in status, preserving system-synced leave/half_day/wfh ──────────
CREATE OR REPLACE FUNCTION public.fn_set_attendance_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_settings    attendance_settings%ROWTYPE;
  v_local_time  time;
  v_late_cutoff time;
  v_early_open  time;
BEGIN
  IF NEW.source = 'self' AND NEW.check_in IS NOT NULL THEN
    -- Preserve a status set by an approved leave/half-day/WFH sync: the employee is
    -- checking in for the worked half (half_day) or this is otherwise an authoritative
    -- status. Allow check_in/check_out columns to update, but keep the status.
    IF TG_OP = 'UPDATE' AND OLD.status IN ('half_day', 'leave', 'wfh') THEN
      RETURN NEW;
    END IF;

    SELECT * INTO v_settings FROM attendance_settings;
    v_local_time  := (NEW.check_in AT TIME ZONE v_settings.timezone)::time;
    v_early_open  := v_settings.work_start_time
                     - (v_settings.early_checkin_min || ' minutes')::interval;
    v_late_cutoff := v_settings.work_start_time
                     + (v_settings.grace_period_min || ' minutes')::interval;

    -- Block check-ins before the early window opens
    IF v_local_time < v_early_open THEN
      RAISE EXCEPTION 'Check-in is not allowed before % (%)', v_early_open, v_settings.timezone;
    END IF;

    -- Present if within grace window, late otherwise (early arrivals are present)
    NEW.status := CASE WHEN v_local_time <= v_late_cutoff THEN 'present' ELSE 'late' END;
  END IF;
  RETURN NEW;
END;
$$;
