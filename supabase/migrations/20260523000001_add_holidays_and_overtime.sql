-- ── Holidays ──────────────────────────────────────────────────────────────────
CREATE TABLE holidays (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  date        date        NOT NULL UNIQUE,
  name        text        NOT NULL,
  type        text        NOT NULL DEFAULT 'public_holiday'
                          CHECK (type IN ('public_holiday', 'company_off', 'optional')),
  created_by  uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

-- Everyone (authenticated) can read holidays
CREATE POLICY p_holidays_select ON holidays
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only admin / HR can insert
CREATE POLICY p_holidays_insert ON holidays
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('super_admin', 'admin', 'hr')
    )
  );

-- Only admin / HR can delete
CREATE POLICY p_holidays_delete ON holidays
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('super_admin', 'admin', 'hr')
    )
  );

-- When a holiday is inserted, flip any 'absent' attendance rows on that date to 'holiday'
CREATE OR REPLACE FUNCTION fn_holiday_backfill_attendance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE attendance
  SET    status     = 'holiday',
         updated_at = now()
  WHERE  date   = NEW.date
    AND  status = 'absent';
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_holiday_backfill
  AFTER INSERT ON holidays
  FOR EACH ROW EXECUTE FUNCTION fn_holiday_backfill_attendance();

-- ── Overtime requests ─────────────────────────────────────────────────────────
CREATE TABLE overtime_requests (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date        date        NOT NULL,
  start_time  time        NOT NULL,
  end_time    time        NOT NULL,
  hours       numeric(4,2) NOT NULL,
  reason      text        NOT NULL,
  status      text        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_note text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE overtime_requests ENABLE ROW LEVEL SECURITY;

-- Employees see their own; HR / admin / PM see all
CREATE POLICY p_ot_select ON overtime_requests
  FOR SELECT USING (
    profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('super_admin', 'admin', 'hr', 'project_manager')
    )
  );

-- Only the employee themselves can submit
CREATE POLICY p_ot_insert ON overtime_requests
  FOR INSERT WITH CHECK (profile_id = auth.uid());

-- Employee can update their own pending request; HR/admin can update status
CREATE POLICY p_ot_update ON overtime_requests
  FOR UPDATE USING (
    (profile_id = auth.uid() AND status = 'pending')
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('super_admin', 'admin', 'hr')
    )
  );
