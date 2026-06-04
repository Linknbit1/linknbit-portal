-- WFH requests, Leave management (admin-defined types + quotas), attendance
-- sync for approved WFH/Leave, and a daily absence-marking job.

-- ── Allow 'wfh' as an attendance status ───────────────────────────────────────
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_status_check;
ALTER TABLE attendance ADD CONSTRAINT attendance_status_check
  CHECK (status IN ('present', 'late', 'absent', 'half_day', 'leave', 'holiday', 'wfh'));

-- ── Shared helper: is a given date a working day? ─────────────────────────────
-- Not Sunday, not a holiday, and Saturdays only when globally enabled or listed
-- as a one-off working Saturday. Reused by leave sync and the absence job.
CREATE OR REPLACE FUNCTION fn_is_working_day(d date)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_dow         int;
  v_sat_working boolean;
BEGIN
  v_dow := EXTRACT(DOW FROM d);           -- 0 = Sun … 6 = Sat
  IF v_dow = 0 THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM holidays WHERE date = d) THEN RETURN false; END IF;
  IF v_dow = 6 THEN
    SELECT saturday_working INTO v_sat_working FROM attendance_settings LIMIT 1;
    IF COALESCE(v_sat_working, false) THEN RETURN true; END IF;
    RETURN EXISTS (SELECT 1 FROM working_saturdays WHERE date = d);
  END IF;
  RETURN true;
END;
$$;

-- ── WFH requests ──────────────────────────────────────────────────────────────
CREATE TABLE wfh_requests (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id       uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date             date        NOT NULL,
  reason           text        NOT NULL,
  status           text        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'approved', 'rejected')),
  granted_directly boolean     NOT NULL DEFAULT false,
  reviewed_by      uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at      timestamptz,
  review_note      text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_wfh_profile_date ON wfh_requests (profile_id, date DESC);

ALTER TABLE wfh_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_wfh_select ON wfh_requests
  FOR SELECT USING (
    profile_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()
               AND role IN ('super_admin', 'admin', 'hr', 'project_manager'))
  );

CREATE POLICY p_wfh_insert ON wfh_requests
  FOR INSERT WITH CHECK (
    profile_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()
               AND role IN ('super_admin', 'admin', 'hr'))   -- HR can grant on behalf
  );

CREATE POLICY p_wfh_update ON wfh_requests
  FOR UPDATE USING (
    (profile_id = auth.uid() AND status = 'pending')
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()
               AND role IN ('super_admin', 'admin', 'hr'))
  );

-- ── Leave types (admin-defined, with yearly day quota) ────────────────────────
CREATE TABLE leave_types (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text        NOT NULL UNIQUE,
  days_allowed integer     NOT NULL DEFAULT 0 CHECK (days_allowed >= 0),
  color        text        NOT NULL DEFAULT 'service-dev',
  is_active    boolean     NOT NULL DEFAULT true,
  created_by   uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_leave_types_read ON leave_types
  FOR SELECT USING (is_internal());

CREATE POLICY p_leave_types_write ON leave_types
  FOR ALL
  USING     (current_user_role() = ANY (ARRAY['super_admin', 'admin', 'hr']))
  WITH CHECK (current_user_role() = ANY (ARRAY['super_admin', 'admin', 'hr']));

-- Seed common defaults — admins can edit/remove/add from the UI.
INSERT INTO leave_types (name, days_allowed, color) VALUES
  ('Annual Leave', 14, 'service-dev'),
  ('Sick Leave',    8, 'service-mkt'),
  ('Casual Leave', 10, 'service-design');

-- ── Leave requests ────────────────────────────────────────────────────────────
CREATE TABLE leave_requests (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  leave_type_id uuid        NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
  start_date    date        NOT NULL,
  end_date      date        NOT NULL,
  days          integer     NOT NULL DEFAULT 0,   -- working days in range (set by trigger)
  reason        text        NOT NULL,
  status        text        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by   uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at   timestamptz,
  review_note   text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);
CREATE INDEX idx_leave_profile ON leave_requests (profile_id, start_date DESC);

ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_leave_select ON leave_requests
  FOR SELECT USING (
    profile_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()
               AND role IN ('super_admin', 'admin', 'hr', 'project_manager'))
  );

CREATE POLICY p_leave_insert ON leave_requests
  FOR INSERT WITH CHECK (profile_id = auth.uid());

CREATE POLICY p_leave_update ON leave_requests
  FOR UPDATE USING (
    (profile_id = auth.uid() AND status = 'pending')
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()
               AND role IN ('super_admin', 'admin', 'hr'))
  );

-- Compute working-day count for the requested range (keeps balances consistent
-- with what actually gets written to attendance on approval).
CREATE OR REPLACE FUNCTION fn_set_leave_days()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.days := (
    SELECT count(*) FROM generate_series(NEW.start_date, NEW.end_date, interval '1 day') g(d)
    WHERE fn_is_working_day(g.d::date)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_leave_set_days
  BEFORE INSERT OR UPDATE OF start_date, end_date ON leave_requests
  FOR EACH ROW EXECUTE FUNCTION fn_set_leave_days();

-- ── Sync approved WFH → attendance ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_sync_wfh_to_attendance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Remove a previously-synced row if this request is no longer approved.
  IF TG_OP = 'UPDATE' AND OLD.status = 'approved' THEN
    DELETE FROM attendance
    WHERE profile_id = OLD.profile_id AND date = OLD.date
      AND source = 'system' AND status = 'wfh';
  END IF;

  IF NEW.status = 'approved' AND fn_is_working_day(NEW.date) THEN
    INSERT INTO attendance (profile_id, date, status, source, marked_by, note)
    VALUES (NEW.profile_id, NEW.date, 'wfh', 'system', NEW.reviewed_by, 'Work from home')
    ON CONFLICT (profile_id, date) DO UPDATE
      SET status = 'wfh', source = 'system', marked_by = EXCLUDED.marked_by, updated_at = now()
      WHERE attendance.source <> 'self';   -- never clobber a real check-in
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_wfh_sync
  AFTER INSERT OR UPDATE ON wfh_requests
  FOR EACH ROW EXECUTE FUNCTION fn_sync_wfh_to_attendance();

-- ── Sync approved Leave → attendance (one row per working day in range) ────────
CREATE OR REPLACE FUNCTION fn_sync_leave_to_attendance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_type_name text;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status = 'approved' THEN
    DELETE FROM attendance
    WHERE profile_id = OLD.profile_id AND source = 'system' AND status = 'leave'
      AND date BETWEEN OLD.start_date AND OLD.end_date;
  END IF;

  IF NEW.status = 'approved' THEN
    SELECT name INTO v_type_name FROM leave_types WHERE id = NEW.leave_type_id;
    INSERT INTO attendance (profile_id, date, status, source, marked_by, note)
    SELECT NEW.profile_id, g.d::date, 'leave', 'system', NEW.reviewed_by, COALESCE(v_type_name, 'Leave')
    FROM generate_series(NEW.start_date, NEW.end_date, interval '1 day') g(d)
    WHERE fn_is_working_day(g.d::date)
    ON CONFLICT (profile_id, date) DO UPDATE
      SET status = 'leave', source = 'system', marked_by = EXCLUDED.marked_by,
          note = EXCLUDED.note, updated_at = now()
      WHERE attendance.source <> 'self';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_leave_sync
  AFTER INSERT OR UPDATE ON leave_requests
  FOR EACH ROW EXECUTE FUNCTION fn_sync_leave_to_attendance();

-- ── Daily absence marking ─────────────────────────────────────────────────────
-- Inserts a 'system'/'absent' row for every active internal employee with no
-- attendance row on a working day. Approved leave/WFH and real check-ins already
-- created rows, so they are skipped.
CREATE OR REPLACE FUNCTION fn_mark_absent_for_date(d date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT fn_is_working_day(d) THEN RETURN; END IF;

  INSERT INTO attendance (profile_id, date, status, source)
  SELECT p.id, d, 'absent', 'system'
  FROM profiles p
  WHERE p.is_active = true
    AND p.role IN ('super_admin', 'admin', 'hr', 'project_manager', 'team_lead', 'employee', 'finance')
    AND NOT EXISTS (SELECT 1 FROM attendance a WHERE a.profile_id = p.id AND a.date = d)
  ON CONFLICT (profile_id, date) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION fn_mark_absent_today()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tz text; v_today date;
BEGIN
  SELECT timezone INTO v_tz FROM attendance_settings LIMIT 1;
  v_today := (now() AT TIME ZONE COALESCE(v_tz, 'Asia/Karachi'))::date;
  PERFORM fn_mark_absent_for_date(v_today);
END;
$$;

-- Run at 18:30 Asia/Karachi (13:30 UTC) — after the workday ends, before the
-- 23:59 PKT auto-checkout job.
SELECT cron.schedule(
  'mark-absent-daily',
  '30 13 * * *',
  'SELECT fn_mark_absent_today()'
);
