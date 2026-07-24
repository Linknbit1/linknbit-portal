-- ════════════════════════════════════════════════════════════════════
-- AUDIT LOG — Part 2 of 4: attendance module triggers.
--
-- Attaches fn_audit_capture('attendance') to every attendance write surface.
-- Event lists are deliberately narrow: calendar tables only on INSERT/DELETE,
-- request tables on INSERT/UPDATE (approvals), enrolled_devices only when the
-- approval flag flips, so ordinary last_seen_at touches don't spam the log.
-- ════════════════════════════════════════════════════════════════════

CREATE TRIGGER trg_audit_attendance
  AFTER INSERT OR UPDATE OR DELETE ON attendance
  FOR EACH ROW EXECUTE FUNCTION fn_audit_capture('attendance');

CREATE TRIGGER trg_audit_holidays
  AFTER INSERT OR DELETE ON holidays
  FOR EACH ROW EXECUTE FUNCTION fn_audit_capture('attendance');

CREATE TRIGGER trg_audit_company_wfh_days
  AFTER INSERT OR DELETE ON company_wfh_days
  FOR EACH ROW EXECUTE FUNCTION fn_audit_capture('attendance');

CREATE TRIGGER trg_audit_working_saturdays
  AFTER INSERT OR DELETE ON working_saturdays
  FOR EACH ROW EXECUTE FUNCTION fn_audit_capture('attendance');

CREATE TRIGGER trg_audit_leave_requests
  AFTER INSERT OR UPDATE OR DELETE ON leave_requests
  FOR EACH ROW EXECUTE FUNCTION fn_audit_capture('attendance');

CREATE TRIGGER trg_audit_wfh_requests
  AFTER INSERT OR UPDATE ON wfh_requests
  FOR EACH ROW EXECUTE FUNCTION fn_audit_capture('attendance');

CREATE TRIGGER trg_audit_overtime_requests
  AFTER INSERT OR UPDATE ON overtime_requests
  FOR EACH ROW EXECUTE FUNCTION fn_audit_capture('attendance');

CREATE TRIGGER trg_audit_attendance_exceptions
  AFTER INSERT OR UPDATE ON attendance_exceptions
  FOR EACH ROW EXECUTE FUNCTION fn_audit_capture('attendance');

CREATE TRIGGER trg_audit_attendance_settings
  AFTER UPDATE ON attendance_settings
  FOR EACH ROW EXECUTE FUNCTION fn_audit_capture('attendance');

-- Only when the approval flag flips — approved / deactivated, not every touch.
CREATE TRIGGER trg_audit_enrolled_devices
  AFTER UPDATE OF is_active ON enrolled_devices
  FOR EACH ROW EXECUTE FUNCTION fn_audit_capture('attendance');
