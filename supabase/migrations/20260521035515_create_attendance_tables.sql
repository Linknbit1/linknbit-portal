-- Attendance table
CREATE TABLE attendance (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id         uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date               date        NOT NULL,
  check_in           timestamptz,
  check_out          timestamptz,
  status             text        NOT NULL DEFAULT 'present'
                                 CHECK (status IN ('present', 'late', 'absent', 'half_day', 'leave', 'holiday')),
  source             text        NOT NULL DEFAULT 'self'
                                 CHECK (source IN ('self', 'admin', 'system')),
  marked_by          uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  note               text,
  device_name        text,
  device_fingerprint text,
  ip_address         inet,
  wifi_validated     boolean     NOT NULL DEFAULT false,
  device_flagged     boolean     NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, date)
);

CREATE INDEX idx_attendance_date         ON attendance (date);
CREATE INDEX idx_attendance_profile_date ON attendance (profile_id, date DESC);
CREATE INDEX idx_attendance_fingerprint  ON attendance (device_fingerprint, date);

-- ── Functions ──────────────────────────────────────────────────────────────────

-- Mark present vs late on self check-in (original — fixed in 20260521093936)
CREATE OR REPLACE FUNCTION public.fn_set_attendance_status()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_settings    attendance_settings%ROWTYPE;
  v_local_time  time;
  v_late_cutoff time;
BEGIN
  IF NEW.source = 'self' AND NEW.check_in IS NOT NULL THEN
    SELECT * INTO v_settings FROM attendance_settings;
    v_local_time  := (NEW.check_in AT TIME ZONE v_settings.timezone)::time;
    v_late_cutoff := v_settings.work_start_time
                     + (v_settings.grace_period_min || ' minutes')::interval;
    IF v_local_time > v_settings.work_end_time THEN
      RAISE EXCEPTION 'Check-in after work end time is not allowed';
    END IF;
    NEW.status := CASE WHEN v_local_time <= v_late_cutoff THEN 'present' ELSE 'late' END;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_attendance_auto_status
  BEFORE INSERT OR UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION fn_set_attendance_status();

-- Award XP on on-time self check-in
CREATE OR REPLACE FUNCTION public.fn_attendance_xp()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_xp int;
BEGIN
  IF NEW.status = 'present' AND NEW.source = 'self' THEN
    SELECT xp_on_time_checkin INTO v_xp FROM attendance_settings;
    INSERT INTO xp_transactions (profile_id, amount, reason)
    VALUES (NEW.profile_id, v_xp, 'On-time check-in: ' || NEW.date);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_attendance_xp
  AFTER INSERT ON attendance
  FOR EACH ROW EXECUTE FUNCTION fn_attendance_xp();

-- Validate checkout window (original — dropped in 20260521121611 due to inverted logic)
CREATE OR REPLACE FUNCTION public.fn_validate_checkout()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_settings attendance_settings%ROWTYPE;
BEGIN
  IF NEW.check_out IS NOT NULL AND OLD.check_out IS NULL THEN
    SELECT * INTO v_settings FROM attendance_settings;
    IF (NEW.check_out AT TIME ZONE v_settings.timezone)::time > v_settings.work_end_time THEN
      RAISE EXCEPTION 'Check-out after work end time is not allowed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_attendance_checkout_validate
  BEFORE UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION fn_validate_checkout();

-- ── RLS ────────────────────────────────────────────────────────────────────────

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_attendance_own ON attendance
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY p_attendance_self_insert ON attendance
  FOR INSERT WITH CHECK (profile_id = auth.uid() AND source = 'self');

-- Original self-update policy (causes RLS recursion — fixed in 20260522000001)
CREATE POLICY p_attendance_self_update ON attendance
  FOR UPDATE
  USING     (profile_id = auth.uid() AND source = 'self')
  WITH CHECK (profile_id = auth.uid() AND source = 'self'
              AND date = (SELECT date FROM attendance a2 WHERE a2.id = attendance.id)
              AND check_in = (SELECT check_in FROM attendance a2 WHERE a2.id = attendance.id));

CREATE POLICY p_attendance_admin ON attendance
  FOR SELECT USING (current_user_role() = ANY (ARRAY['admin', 'super_admin', 'hr']));

CREATE POLICY p_attendance_admin_write ON attendance
  FOR ALL
  USING     (current_user_role() = ANY (ARRAY['admin', 'super_admin', 'hr']))
  WITH CHECK (current_user_role() = ANY (ARRAY['admin', 'super_admin', 'hr']));

CREATE POLICY p_attendance_team ON attendance
  FOR SELECT USING (
    current_user_role() = ANY (ARRAY['team_lead', 'project_manager', 'admin', 'super_admin'])
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = attendance.profile_id
        AND p.team_id IN (SELECT profiles.team_id FROM profiles WHERE profiles.id = auth.uid())
    )
  );
