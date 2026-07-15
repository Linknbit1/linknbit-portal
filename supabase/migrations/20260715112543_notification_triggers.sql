-- ════════════════════════════════════════════════════════════════════
-- NOTIFICATIONS — Part 2: who gets told about what.
--
--  Employee submits leave/WFH/exception/overtime → governors + their team lead
--  Request approved/rejected                     → the requester
--  HR grants WFH directly                        → the employee
--  Holiday / company WFH day / working Saturday  → everyone internal
--  Quest claimed                                 → governors only
--
-- Edge cases handled:
--  • fn_notify() never notifies the actor about their own action, so an admin
--    approving their own leave (or claiming their own quest) stays quiet.
--  • fn_request_approvers() UNIONs governors with team leads, so an HR person who
--    also leads the team gets ONE notification, not two.
--  • WFH granted directly by HR arrives as status='approved' on INSERT — that is
--    not a request, so it notifies the employee instead of the approvers.
--  • Editing a pending request keeps status='pending', so the review triggers
--    (which require pending → approved/rejected) stay silent.
--  • Holiday ranges insert N rows in ONE statement. These are STATEMENT-level
--    triggers with transition tables, so a 5-day Eid is one notification per
--    person, not five.
-- ════════════════════════════════════════════════════════════════════

-- Short date like "Jul 6" (FM strips the padding).
CREATE OR REPLACE FUNCTION fn_fmt_day(d date) RETURNS text AS $$
  SELECT to_char(d, 'FMMon FMDD');
$$ LANGUAGE sql IMMUTABLE;

-- ── Leave ───────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_notify_leave_submitted()
RETURNS trigger AS $$
DECLARE v_name text; v_body text;
BEGIN
  SELECT name INTO v_name FROM profiles WHERE id = NEW.profile_id;
  v_body := v_name || ' requested leave — ' || fn_fmt_day(NEW.start_date)
            || CASE WHEN NEW.end_date > NEW.start_date THEN ' to ' || fn_fmt_day(NEW.end_date) ELSE '' END;

  PERFORM fn_notify(a.profile_id, 'request_leave_submitted', 'Leave request', v_body,
                    'leave_request', NEW.id::text, NEW.profile_id)
  FROM fn_request_approvers(NEW.profile_id) a;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION fn_notify_leave_reviewed()
RETURNS trigger AS $$
BEGIN
  PERFORM fn_notify(NEW.profile_id, 'request_leave_reviewed',
    'Leave ' || NEW.status,
    'Your leave request was ' || NEW.status
      || COALESCE(' — ' || NULLIF(NEW.review_note, ''), '') || '.',
    'leave_request', NEW.id::text, auth.uid());
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_notify_leave_submitted AFTER INSERT ON leave_requests
  FOR EACH ROW WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION fn_notify_leave_submitted();

CREATE TRIGGER trg_notify_leave_reviewed AFTER UPDATE OF status ON leave_requests
  FOR EACH ROW WHEN (OLD.status = 'pending' AND NEW.status IN ('approved','rejected'))
  EXECUTE FUNCTION fn_notify_leave_reviewed();

-- ── WFH ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_notify_wfh_submitted()
RETURNS trigger AS $$
DECLARE v_name text;
BEGIN
  SELECT name INTO v_name FROM profiles WHERE id = NEW.profile_id;
  PERFORM fn_notify(a.profile_id, 'request_wfh_submitted', 'WFH request',
                    v_name || ' requested WFH for ' || fn_fmt_day(NEW.date),
                    'wfh_request', NEW.id::text, NEW.profile_id)
  FROM fn_request_approvers(NEW.profile_id) a;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- HR granted WFH without a request — tell the employee, not the approvers.
CREATE OR REPLACE FUNCTION fn_notify_wfh_granted()
RETURNS trigger AS $$
BEGIN
  PERFORM fn_notify(NEW.profile_id, 'request_wfh_reviewed', 'WFH granted',
                    'You have been granted WFH for ' || fn_fmt_day(NEW.date)
                      || COALESCE(' — ' || NULLIF(NEW.reason, ''), '') || '.',
                    'wfh_request', NEW.id::text, auth.uid());
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION fn_notify_wfh_reviewed()
RETURNS trigger AS $$
BEGIN
  PERFORM fn_notify(NEW.profile_id, 'request_wfh_reviewed',
    'WFH ' || NEW.status,
    'Your WFH request for ' || fn_fmt_day(NEW.date) || ' was ' || NEW.status
      || COALESCE(' — ' || NULLIF(NEW.review_note, ''), '') || '.',
    'wfh_request', NEW.id::text, auth.uid());
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_notify_wfh_submitted AFTER INSERT ON wfh_requests
  FOR EACH ROW WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION fn_notify_wfh_submitted();

CREATE TRIGGER trg_notify_wfh_granted AFTER INSERT ON wfh_requests
  FOR EACH ROW WHEN (NEW.status = 'approved' AND NEW.granted_directly)
  EXECUTE FUNCTION fn_notify_wfh_granted();

CREATE TRIGGER trg_notify_wfh_reviewed AFTER UPDATE OF status ON wfh_requests
  FOR EACH ROW WHEN (OLD.status = 'pending' AND NEW.status IN ('approved','rejected'))
  EXECUTE FUNCTION fn_notify_wfh_reviewed();

-- ── Attendance exceptions ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_exception_label(t text) RETURNS text AS $$
  SELECT CASE t
    WHEN 'late_arrival'    THEN 'late arrival'
    WHEN 'early_departure' THEN 'early departure'
    WHEN 'out_of_office'   THEN 'out of office'
    ELSE t END;
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION fn_notify_exception_submitted()
RETURNS trigger AS $$
DECLARE v_name text;
BEGIN
  SELECT name INTO v_name FROM profiles WHERE id = NEW.profile_id;
  PERFORM fn_notify(a.profile_id, 'request_exception_submitted', 'Attendance exception',
                    v_name || ' requested ' || fn_exception_label(NEW.exception_type)
                      || ' on ' || fn_fmt_day(NEW.date),
                    'attendance_exception', NEW.id::text, NEW.profile_id)
  FROM fn_request_approvers(NEW.profile_id) a;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION fn_notify_exception_reviewed()
RETURNS trigger AS $$
BEGIN
  PERFORM fn_notify(NEW.profile_id, 'request_exception_reviewed',
    'Exception ' || NEW.status,
    'Your ' || fn_exception_label(NEW.exception_type) || ' request for '
      || fn_fmt_day(NEW.date) || ' was ' || NEW.status
      || COALESCE(' — ' || NULLIF(NEW.review_note, ''), '') || '.',
    'attendance_exception', NEW.id::text, auth.uid());
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_notify_exception_submitted AFTER INSERT ON attendance_exceptions
  FOR EACH ROW WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION fn_notify_exception_submitted();

CREATE TRIGGER trg_notify_exception_reviewed AFTER UPDATE OF status ON attendance_exceptions
  FOR EACH ROW WHEN (OLD.status = 'pending' AND NEW.status IN ('approved','rejected'))
  EXECUTE FUNCTION fn_notify_exception_reviewed();

-- ── Overtime ────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_notify_overtime_submitted()
RETURNS trigger AS $$
DECLARE v_name text;
BEGIN
  SELECT name INTO v_name FROM profiles WHERE id = NEW.profile_id;
  PERFORM fn_notify(a.profile_id, 'request_overtime_submitted', 'Overtime request',
                    v_name || ' logged ' || NEW.hours || 'h overtime on ' || fn_fmt_day(NEW.date),
                    'overtime_request', NEW.id::text, NEW.profile_id)
  FROM fn_request_approvers(NEW.profile_id) a;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION fn_notify_overtime_reviewed()
RETURNS trigger AS $$
BEGIN
  PERFORM fn_notify(NEW.profile_id, 'request_overtime_reviewed',
    'Overtime ' || NEW.status,
    'Your ' || NEW.hours || 'h overtime on ' || fn_fmt_day(NEW.date) || ' was ' || NEW.status
      || COALESCE(' — ' || NULLIF(NEW.review_note, ''), '') || '.',
    'overtime_request', NEW.id::text, auth.uid());
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_notify_overtime_submitted AFTER INSERT ON overtime_requests
  FOR EACH ROW WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION fn_notify_overtime_submitted();

CREATE TRIGGER trg_notify_overtime_reviewed AFTER UPDATE OF status ON overtime_requests
  FOR EACH ROW WHEN (OLD.status = 'pending' AND NEW.status IN ('approved','rejected'))
  EXECUTE FUNCTION fn_notify_overtime_reviewed();

-- ── Quest claimed → governors only ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_notify_quest_claimed()
RETURNS trigger AS $$
DECLARE v_name text; v_title text;
BEGIN
  SELECT name  INTO v_name  FROM profiles    WHERE id = NEW.profile_id;
  SELECT title INTO v_title FROM quest_tasks WHERE id = NEW.task_id;

  PERFORM fn_notify(p.id, 'quest_claimed', 'Quest claimed',
                    v_name || ' claimed "' || COALESCE(v_title, 'a quest') || '"',
                    'quest_task', NEW.task_id::text, NEW.profile_id)
  FROM profiles p
  WHERE p.is_active AND p.role IN ('super_admin','admin','hr');
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_notify_quest_claimed AFTER INSERT ON quest_task_claims
  FOR EACH ROW EXECUTE FUNCTION fn_notify_quest_claimed();

-- ── Schedule announcements → everyone (STATEMENT-level: a range = 1 notice) ─────
CREATE OR REPLACE FUNCTION fn_notify_holidays()
RETURNS trigger AS $$
DECLARE r RECORD; v_when text;
BEGIN
  FOR r IN SELECT name, min(date) AS from_date, max(date) AS to_date, count(*) AS n
             FROM new_rows GROUP BY name
  LOOP
    v_when := CASE WHEN r.n > 1
      THEN fn_fmt_day(r.from_date) || ' to ' || fn_fmt_day(r.to_date) || ' (' || r.n || ' days)'
      ELSE fn_fmt_day(r.from_date) END;
    PERFORM fn_notify(s.profile_id, 'schedule_holiday', 'Holiday announced',
                      r.name || ' — ' || v_when, 'holiday', NULL, auth.uid())
    FROM fn_all_internal_staff() s;
  END LOOP;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_notify_holidays AFTER INSERT ON holidays
  REFERENCING NEW TABLE AS new_rows
  FOR EACH STATEMENT EXECUTE FUNCTION fn_notify_holidays();

CREATE OR REPLACE FUNCTION fn_notify_company_wfh()
RETURNS trigger AS $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id, date, reason FROM new_rows LOOP
    PERFORM fn_notify(s.profile_id, 'schedule_wfh_day', 'Company WFH day',
                      fn_fmt_day(r.date) || ' — work from home. ' || r.reason,
                      'company_wfh_day', r.id::text, auth.uid())
    FROM fn_all_internal_staff() s;
  END LOOP;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_notify_company_wfh AFTER INSERT ON company_wfh_days
  REFERENCING NEW TABLE AS new_rows
  FOR EACH STATEMENT EXECUTE FUNCTION fn_notify_company_wfh();

CREATE OR REPLACE FUNCTION fn_notify_working_saturday()
RETURNS trigger AS $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id, date, note FROM new_rows LOOP
    PERFORM fn_notify(s.profile_id, 'schedule_working_saturday', 'Working Saturday',
                      fn_fmt_day(r.date) || ' is a working day'
                        || COALESCE(' — ' || NULLIF(r.note, ''), '') || '.',
                      'working_saturday', r.id::text, auth.uid())
    FROM fn_all_internal_staff() s;
  END LOOP;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_notify_working_saturday AFTER INSERT ON working_saturdays
  REFERENCING NEW TABLE AS new_rows
  FOR EACH STATEMENT EXECUTE FUNCTION fn_notify_working_saturday();
