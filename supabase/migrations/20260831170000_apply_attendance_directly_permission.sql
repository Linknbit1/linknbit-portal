-- Bypassing the approval queue becomes a permission.
--
-- Four decisions govern filing a request for somebody else. Two were already
-- permissions; two were still lists of role names, so a role built on the Roles
-- screen could be given every attendance permission there is and still not be
-- able to enter leave, and still not get the immediate-apply behaviour:
--
--   who may file for someone   can_manage_attendance   (exceptions, overtime)
--                              role names              (leave, WFH)   ← here
--   who may approve            can_approve_requests, and not the filer
--   whether it applies at once role names 'admin', 'super_admin'      ← here
--
-- Both are now keys. `can_apply_attendance_directly` is the new one: it says the
-- holder's entry lands approved instead of queued. Granted to super_admin and
-- admin, which is exactly who had it by name, so nobody's behaviour changes
-- today — what changes is that it can be granted to somebody else tomorrow
-- without editing a policy.
--
-- It also now applies to all four kinds. Exceptions and overtime used to be
-- pending whoever filed them; an admin bypasses the queue everywhere.

INSERT INTO permissions (key, label, description, category, sort_order, is_hidden)
VALUES ('can_apply_attendance_directly', 'Apply attendance without approval',
        'Leave, WFH, exceptions and overtime this person enters for somebody else take effect immediately instead of waiting in the approval queue.',
        'Attendance', 46, false)
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, 'can_apply_attendance_directly'
  FROM roles r
 WHERE r.slug IN ('super_admin', 'admin')
ON CONFLICT DO NOTHING;

-- ── One shape, four tables ───────────────────────────────────────────────────
-- Your own request, pending. Or somebody else's, if you may file for them — and
-- already approved only if you may skip the queue.
DROP POLICY IF EXISTS p_leave_insert ON leave_requests;
CREATE POLICY p_leave_insert ON leave_requests FOR INSERT
  WITH CHECK (
    (profile_id = auth.uid() AND entered_by IS NULL AND status = 'pending')
    OR (
      profile_id <> auth.uid()
      AND entered_by = auth.uid()
      AND has_feature('can_manage_attendance')
      AND (
        status = 'pending'
        OR (status = 'approved' AND has_feature('can_apply_attendance_directly'))
      )
    )
  );

-- WFH has no entered_by; `granted_directly` is how it marks an entry made for
-- somebody else, and a person filing their own may not set it.
DROP POLICY IF EXISTS p_wfh_insert ON wfh_requests;
CREATE POLICY p_wfh_insert ON wfh_requests FOR INSERT
  WITH CHECK (
    (profile_id = auth.uid() AND status = 'pending' AND NOT granted_directly)
    OR (
      profile_id <> auth.uid()
      AND has_feature('can_manage_attendance')
      AND (
        status = 'pending'
        OR (status = 'approved' AND has_feature('can_apply_attendance_directly'))
      )
    )
  );

DROP POLICY IF EXISTS p_exc_insert ON attendance_exceptions;
CREATE POLICY p_exc_insert ON attendance_exceptions FOR INSERT
  WITH CHECK (
    (profile_id = auth.uid() AND entered_by IS NULL AND status = 'pending')
    OR (
      profile_id <> auth.uid()
      AND entered_by = auth.uid()
      AND has_feature('can_manage_attendance')
      AND (
        status = 'pending'
        OR (status = 'approved' AND has_feature('can_apply_attendance_directly'))
      )
    )
  );

DROP POLICY IF EXISTS p_ot_insert ON overtime_requests;
CREATE POLICY p_ot_insert ON overtime_requests FOR INSERT
  WITH CHECK (
    (profile_id = auth.uid() AND entered_by IS NULL AND status = 'pending')
    OR (
      profile_id <> auth.uid()
      AND entered_by = auth.uid()
      AND has_feature('can_manage_attendance')
      AND (
        status = 'pending'
        OR (status = 'approved' AND has_feature('can_apply_attendance_directly'))
      )
    )
  );

-- ── Telling the person it happened ───────────────────────────────────────────
-- Leave and WFH already announce an entry that arrives approved. Exceptions and
-- overtime never could, because they could not arrive approved — the "reviewed"
-- notification fires on a pending→approved update that now may never happen, so
-- without these two the record would change with nobody told.
CREATE OR REPLACE FUNCTION public.fn_notify_exception_granted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM fn_notify(
    NEW.profile_id, 'request_exception_reviewed', 'Exception recorded',
    'A ' || fn_exception_label(NEW.exception_type) || ' was recorded for you on '
      || fn_fmt_day(NEW.date) || '.',
    'attendance_exception', NEW.id::text, NEW.entered_by);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_exception_granted ON attendance_exceptions;
CREATE TRIGGER trg_notify_exception_granted
  AFTER INSERT ON attendance_exceptions
  FOR EACH ROW WHEN (NEW.status = 'approved' AND NEW.entered_by IS NOT NULL)
  EXECUTE FUNCTION fn_notify_exception_granted();

CREATE OR REPLACE FUNCTION public.fn_notify_overtime_granted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM fn_notify(
    NEW.profile_id, 'request_overtime_reviewed', 'Overtime recorded',
    NEW.hours || 'h of overtime was recorded for you on ' || fn_fmt_day(NEW.date) || '.',
    'overtime_request', NEW.id::text, NEW.entered_by);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_overtime_granted ON overtime_requests;
CREATE TRIGGER trg_notify_overtime_granted
  AFTER INSERT ON overtime_requests
  FOR EACH ROW WHEN (NEW.status = 'approved' AND NEW.entered_by IS NOT NULL)
  EXECUTE FUNCTION fn_notify_overtime_granted();
