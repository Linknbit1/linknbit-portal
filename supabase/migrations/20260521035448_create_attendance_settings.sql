-- Attendance settings singleton — one row, never deleted
CREATE TABLE attendance_settings (
  singleton          boolean     PRIMARY KEY DEFAULT true CHECK (singleton = true),
  work_start_time    time        NOT NULL DEFAULT '09:00:00',
  work_end_time      time        NOT NULL DEFAULT '18:00:00',
  grace_period_min   integer     NOT NULL DEFAULT 15,
  timezone           text        NOT NULL DEFAULT 'Asia/Karachi',
  xp_on_time_checkin integer     NOT NULL DEFAULT 10,
  office_ip_cidr     text,
  updated_by         uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at         timestamptz NOT NULL DEFAULT now()
);

INSERT INTO attendance_settings DEFAULT VALUES;

ALTER TABLE attendance_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_attendance_settings_read ON attendance_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY p_attendance_settings_write ON attendance_settings
  FOR ALL
  USING     (current_user_role() = ANY (ARRAY['admin', 'super_admin']))
  WITH CHECK (current_user_role() = ANY (ARRAY['admin', 'super_admin']));
