-- Admin/super_admin can log leave that applies immediately (inserted 'approved'),
-- while HR-entered and employee-submitted leave must stay 'pending' until an admin
-- approves it. The prior INSERT policy did not constrain status, which would have let
-- a non-admin bypass approval by inserting an already-approved row — this closes that.

-- ── INSERT: status is now gated by role ───────────────────────────────────────
--   • employee self-submit → pending only
--   • HR/admin/super_admin on-behalf → pending
--   • admin/super_admin on-behalf → may insert 'approved' (applies immediately)
DROP POLICY IF EXISTS p_leave_insert ON leave_requests;
CREATE POLICY p_leave_insert ON leave_requests
  FOR INSERT WITH CHECK (
    (profile_id = auth.uid() AND entered_by IS NULL AND status = 'pending')
    OR (
      entered_by = auth.uid()
      AND status = 'pending'
      AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()
                  AND role IN ('super_admin', 'admin', 'hr'))
    )
    OR (
      entered_by = auth.uid()
      AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()
                  AND role IN ('super_admin', 'admin'))
    )
  );

-- ── Notify the employee when leave is applied directly (approved on INSERT) ────
-- Mirrors trg_notify_wfh_granted: a direct-applied leave is not a request, so the
-- submit/review triggers stay silent — tell the employee instead. Actor = entered_by
-- so the admin who added it is not notified about their own action.
CREATE OR REPLACE FUNCTION fn_notify_leave_granted()
RETURNS trigger AS $$
DECLARE v_type text; v_body text;
BEGIN
  SELECT name INTO v_type FROM leave_types WHERE id = NEW.leave_type_id;
  v_body := 'Leave added for you — ' || fn_fmt_day(NEW.start_date)
            || CASE WHEN NEW.end_date > NEW.start_date THEN ' to ' || fn_fmt_day(NEW.end_date) ELSE '' END
            || COALESCE(' (' || v_type || ')', '') || '.';
  PERFORM fn_notify(NEW.profile_id, 'request_leave_reviewed', 'Leave added', v_body,
                    'leave_request', NEW.id::text, NEW.entered_by);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_notify_leave_granted AFTER INSERT ON leave_requests
  FOR EACH ROW WHEN (NEW.status = 'approved' AND NEW.entered_by IS NOT NULL)
  EXECUTE FUNCTION fn_notify_leave_granted();
