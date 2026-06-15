-- Attendance exceptions — late arrivals, early departures, out-of-office requests
CREATE TABLE attendance_exceptions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id       uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date             date        NOT NULL,
  exception_type   text        NOT NULL
                               CHECK (exception_type IN ('late_arrival', 'early_departure', 'out_of_office')),
  requested_time   time        NOT NULL,
  return_time      time,
  actual_departure timestamptz,
  actual_return    timestamptz,
  reason           text        NOT NULL,
  status           text        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by      uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at      timestamptz,
  review_note      text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, date, exception_type)
);

CREATE INDEX idx_exceptions_profile_date ON attendance_exceptions (profile_id, date);
CREATE INDEX idx_exceptions_status       ON attendance_exceptions (status) WHERE status = 'pending';

ALTER TABLE attendance_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_exc_own_select ON attendance_exceptions
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY p_exc_own_insert ON attendance_exceptions
  FOR INSERT WITH CHECK (profile_id = auth.uid());

CREATE POLICY p_exc_admin_select ON attendance_exceptions
  FOR SELECT USING (current_user_role() = ANY (ARRAY['admin', 'hr', 'super_admin']));

CREATE POLICY p_exc_admin_update ON attendance_exceptions
  FOR UPDATE USING (current_user_role() = ANY (ARRAY['admin', 'hr', 'super_admin']));
