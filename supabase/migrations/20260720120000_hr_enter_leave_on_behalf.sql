-- HR (and admins) can enter leave on an employee's behalf — e.g. backdated "old"
-- leave that was taken but never logged — with a reason. The entry is created as
-- 'pending' and MUST be approved by an admin/super_admin before it applies.
--
-- Segregation of duties: the HR person who enters the leave cannot approve it. Only
-- super_admin/admin may act on an on-behalf entry (rows where entered_by IS NOT NULL).
-- Self-submitted requests (entered_by IS NULL) keep their existing review behavior.

-- ── Track who entered the leave. NULL = the employee submitted it themselves. ─────
ALTER TABLE leave_requests
  ADD COLUMN entered_by uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- ── INSERT: self-submit, OR a governor entering it on behalf (entered_by = actor) ──
DROP POLICY IF EXISTS p_leave_insert ON leave_requests;
CREATE POLICY p_leave_insert ON leave_requests
  FOR INSERT WITH CHECK (
    (profile_id = auth.uid() AND entered_by IS NULL)
    OR (
      entered_by = auth.uid()
      AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()
                  AND role IN ('super_admin', 'admin', 'hr'))
    )
  );

-- ── UPDATE: on-behalf entries are admin-only; self-submitted keep prior behavior ──
DROP POLICY IF EXISTS p_leave_update ON leave_requests;
CREATE POLICY p_leave_update ON leave_requests
  FOR UPDATE USING (
    CASE
      WHEN entered_by IS NOT NULL THEN
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()
                AND role IN ('super_admin', 'admin'))
      ELSE
        (profile_id = auth.uid() AND status = 'pending')
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()
                   AND role IN ('super_admin', 'admin', 'hr'))
    END
  );

-- ── Notification: reflect HR-entered leave in the body, and treat the HR person as
--    the actor so fn_notify does not ping them about their own action. Approvers
--    (super_admin/admin/hr + team lead) are notified exactly as before. ───────────
CREATE OR REPLACE FUNCTION fn_notify_leave_submitted()
RETURNS trigger AS $$
DECLARE v_name text; v_hr text; v_body text;
BEGIN
  SELECT name INTO v_name FROM profiles WHERE id = NEW.profile_id;

  IF NEW.entered_by IS NOT NULL THEN
    SELECT name INTO v_hr FROM profiles WHERE id = NEW.entered_by;
    v_body := COALESCE(v_hr, 'HR') || ' added leave for ' || v_name || ' — '
              || fn_fmt_day(NEW.start_date)
              || CASE WHEN NEW.end_date > NEW.start_date THEN ' to ' || fn_fmt_day(NEW.end_date) ELSE '' END;
  ELSE
    v_body := v_name || ' requested leave — ' || fn_fmt_day(NEW.start_date)
              || CASE WHEN NEW.end_date > NEW.start_date THEN ' to ' || fn_fmt_day(NEW.end_date) ELSE '' END;
  END IF;

  PERFORM fn_notify(a.profile_id, 'request_leave_submitted', 'Leave request', v_body,
                    'leave_request', NEW.id::text, COALESCE(NEW.entered_by, NEW.profile_id))
  FROM fn_request_approvers(NEW.profile_id) a;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
