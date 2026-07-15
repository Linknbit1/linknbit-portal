-- ════════════════════════════════════════════════════════════════════
-- COMPANY WFH DAYS — declare a whole day as work-from-home for everyone
-- (office power cut, flooding, protest, etc.). Unlike a holiday, the day is
-- still a WORKING day: staff are expected to work, they just aren't in office.
--
-- Declaring a day marks every eligible employee's attendance for that date as
-- 'wfh' (source 'system'), so nobody has to check in from the office network.
-- Removing the day reverts exactly those rows, leaving individually-granted WFH
-- (wfh_requests) untouched.
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE company_wfh_days (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  date       date        NOT NULL UNIQUE,
  reason     text        NOT NULL,
  created_by uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_company_wfh_days_date ON company_wfh_days(date);

ALTER TABLE company_wfh_days ENABLE ROW LEVEL SECURITY;

-- Read: any signed-in user (employees need to see it on their upcoming schedule).
-- Write: HR/Admin only — mirrors the holidays + working_saturdays policies.
CREATE POLICY p_company_wfh_select ON company_wfh_days FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY p_company_wfh_insert ON company_wfh_days FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('super_admin','admin','hr')
  ));

CREATE POLICY p_company_wfh_delete ON company_wfh_days FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('super_admin','admin','hr')
  ));

-- ── Apply: mark everyone WFH for that date ──────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_company_wfh_apply()
RETURNS trigger AS $$
BEGIN
  -- Sundays / holidays / non-working Saturdays are already non-working days.
  IF NOT fn_is_working_day(NEW.date) THEN RETURN NEW; END IF;

  INSERT INTO attendance (profile_id, date, status, source, marked_by, note)
  SELECT p.id, NEW.date, 'wfh', 'system', NEW.created_by, 'Company WFH — ' || NEW.reason
  FROM profiles p
  WHERE p.is_active
    AND p.role NOT IN ('client_owner','client_member')
    AND NOT p.attendance_excluded
  ON CONFLICT (profile_id, date) DO UPDATE
    SET status = 'wfh', source = 'system', marked_by = EXCLUDED.marked_by,
        note = EXCLUDED.note, updated_at = now()
    -- Never clobber someone who already checked in themselves, and never convert
    -- an approved leave/half-day into a work-from-home day.
    WHERE attendance.source <> 'self'
      AND attendance.status NOT IN ('leave','half_day');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── Revert: undo only the rows this company day created ─────────────────────────
CREATE OR REPLACE FUNCTION fn_company_wfh_revert()
RETURNS trigger AS $$
BEGIN
  DELETE FROM attendance a
  WHERE a.date = OLD.date
    AND a.source = 'system'
    AND a.status = 'wfh'
    -- Keep WFH that stands on its own via an approved individual request.
    AND NOT EXISTS (
      SELECT 1 FROM wfh_requests w
      WHERE w.profile_id = a.profile_id AND w.date = a.date AND w.status = 'approved'
    );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_company_wfh_apply
  AFTER INSERT ON company_wfh_days
  FOR EACH ROW EXECUTE FUNCTION fn_company_wfh_apply();

CREATE TRIGGER trg_company_wfh_revert
  AFTER DELETE ON company_wfh_days
  FOR EACH ROW EXECUTE FUNCTION fn_company_wfh_revert();
