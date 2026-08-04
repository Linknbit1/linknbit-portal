-- ════════════════════════════════════════════════════════════════════
-- Attendance requests: nobody reviews their own.
--
-- HR is a tracked employee (attendance_excluded = false) who files
-- exceptions, overtime, WFH and leave like everyone else — but HR also holds
-- can_approve_requests, so the approver arm of each UPDATE policy matched
-- their own rows and they could sign off on themselves. Admins deal with HR's
-- requests instead; fn_request_approvers already excludes the requester from
-- the submission notification, so the routing was the only piece missing.
--
-- The self INSERT arms are tightened at the same time: they constrained only
-- profile_id, so any authenticated user could POST a row that was already
-- 'approved' (or, for WFH, granted_directly) and skip review entirely. The
-- app never did this, but the policy allowed it. leave_requests already had
-- the correct shape and is the model followed here.
-- ════════════════════════════════════════════════════════════════════

-- ── 1. A request you create for yourself starts pending ───────────────────────
DROP POLICY IF EXISTS p_exc_own_insert ON attendance_exceptions;
CREATE POLICY p_exc_own_insert ON attendance_exceptions FOR INSERT
  WITH CHECK (profile_id = auth.uid() AND status = 'pending');

DROP POLICY IF EXISTS p_ot_insert ON overtime_requests;
CREATE POLICY p_ot_insert ON overtime_requests FOR INSERT
  WITH CHECK (profile_id = auth.uid() AND status = 'pending');

-- WFH keeps its second arm (HR/admin granting WFH directly), minus the ability
-- to grant it to yourself.
DROP POLICY IF EXISTS p_wfh_insert ON wfh_requests;
CREATE POLICY p_wfh_insert ON wfh_requests FOR INSERT
  WITH CHECK (
    (profile_id = auth.uid() AND status = 'pending' AND NOT granted_directly)
    OR (
      profile_id <> auth.uid()
      AND EXISTS (
        SELECT 1 FROM profiles
         WHERE profiles.id = auth.uid()
           AND profiles.role = ANY (ARRAY['super_admin', 'admin', 'hr'])
      )
    )
  );

-- Leave: arm 1 (own request) was already correct. Arms 2 and 3 are the
-- on-behalf paths — an HR/admin entering leave for someone else — so they now
-- say "someone else" explicitly rather than leaving self-entry open.
DROP POLICY IF EXISTS p_leave_insert ON leave_requests;
CREATE POLICY p_leave_insert ON leave_requests FOR INSERT
  WITH CHECK (
    (profile_id = auth.uid() AND entered_by IS NULL AND status = 'pending')
    OR (
      entered_by = auth.uid() AND profile_id <> auth.uid() AND status = 'pending'
      AND EXISTS (
        SELECT 1 FROM profiles
         WHERE profiles.id = auth.uid()
           AND profiles.role = ANY (ARRAY['super_admin', 'admin', 'hr'])
      )
    )
    OR (
      entered_by = auth.uid() AND profile_id <> auth.uid()
      AND EXISTS (
        SELECT 1 FROM profiles
         WHERE profiles.id = auth.uid()
           AND profiles.role = ANY (ARRAY['super_admin', 'admin'])
      )
    )
  );

-- ── 2. Approving is for other people's requests ───────────────────────────────
-- The owner arm is untouched: it still lets the requester edit their own row
-- while it is pending, and (being both USING and WITH CHECK) still refuses to
-- let them move it out of 'pending' themselves.
DROP POLICY IF EXISTS p_exc_admin_update ON attendance_exceptions;
CREATE POLICY p_exc_admin_update ON attendance_exceptions FOR UPDATE
  USING (has_feature('can_approve_requests') AND profile_id <> auth.uid());

DROP POLICY IF EXISTS p_ot_update ON overtime_requests;
CREATE POLICY p_ot_update ON overtime_requests FOR UPDATE
  USING (
    (profile_id = auth.uid() AND status = 'pending')
    OR (has_feature('can_approve_requests') AND profile_id <> auth.uid())
  );

DROP POLICY IF EXISTS p_wfh_update ON wfh_requests;
CREATE POLICY p_wfh_update ON wfh_requests FOR UPDATE
  USING (
    (profile_id = auth.uid() AND status = 'pending')
    OR (has_feature('can_approve_requests') AND profile_id <> auth.uid())
  );

DROP POLICY IF EXISTS p_leave_update ON leave_requests;
CREATE POLICY p_leave_update ON leave_requests FOR UPDATE
  USING (
    CASE
      WHEN entered_by IS NOT NULL THEN (
        profile_id <> auth.uid()
        AND EXISTS (
          SELECT 1 FROM profiles
           WHERE profiles.id = auth.uid()
             AND profiles.role = ANY (ARRAY['super_admin', 'admin'])
        )
      )
      ELSE (
        (profile_id = auth.uid() AND status = 'pending')
        OR (has_feature('can_approve_requests') AND profile_id <> auth.uid())
      )
    END
  );
