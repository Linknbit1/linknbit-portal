-- Real feature flags, part 2 of 2: enforcement + security fixes.
--
-- Every capability below now resolves through has_feature(), so the Settings
-- permissions matrix actually governs behaviour instead of decorating it.
-- Seeds in part 1 were chosen to reproduce today's behaviour, EXCEPT the two
-- tightenings noted there (project_manager loses company-wide attendance read and
-- client write) plus the two security fixes at the bottom of this file.
--
-- Deliberately left hardcoded (hierarchy / segregation rules, not capabilities):
--   * can_manage_target / can_grant_role role LADDER (admin can't touch super_admin…)
--   * admin_update_profile_details  — sa/admin only; routing it through
--     can_manage_people would silently grant HR the ability to rename people.
--   * p_profiles_admin_update       — direct-table write path; people management
--     flows through the SECURITY DEFINER RPCs, so HR must not gain raw UPDATE.
--   * p_leave_update "entered_by IS NOT NULL" branch — segregation of duties:
--     HR may not approve an on-behalf leave it entered itself.

-- ── Gamification: two helpers, ~20 dependent policies inherit for free ────────
-- was: current_user_role() IN ('super_admin','admin','hr')
CREATE OR REPLACE FUNCTION can_govern_gamification()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT has_feature('can_govern_gamification')
$$;

-- was: current_user_role() IN ('super_admin','admin','hr','project_manager','team_lead')
CREATE OR REPLACE FUNCTION can_recognize()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT has_feature('can_recognize')
$$;

-- ── People: gate the two ladders every admin_*_profile RPC funnels through ────
-- The CASE ladder (who outranks whom) stays; the flag decides whether the actor
-- has the capability at all.
CREATE OR REPLACE FUNCTION can_manage_target(p_target_role text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT has_feature('can_manage_people')
     AND CASE current_user_role()
           WHEN 'super_admin' THEN true
           WHEN 'admin'       THEN p_target_role <> 'super_admin'
           WHEN 'hr'          THEN p_target_role NOT IN ('super_admin','admin')
           ELSE false END
$$;

CREATE OR REPLACE FUNCTION can_grant_role(p_role text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT has_feature('can_manage_people')
     AND CASE current_user_role()
           WHEN 'super_admin' THEN true
           WHEN 'admin'       THEN p_role <> 'super_admin'
           WHEN 'hr'          THEN p_role NOT IN ('super_admin','admin')
           ELSE false END
$$;

-- ── Clients ──────────────────────────────────────────────────────────────────
-- was: current_user_role() IN ('super_admin','admin','project_manager')
DROP POLICY IF EXISTS p_clients_insert ON clients;
CREATE POLICY p_clients_insert ON clients
  FOR INSERT WITH CHECK (has_feature('can_manage_clients'));

DROP POLICY IF EXISTS p_clients_update ON clients;
CREATE POLICY p_clients_update ON clients
  FOR UPDATE USING (has_feature('can_manage_clients'))
  WITH CHECK (has_feature('can_manage_clients'));

DROP POLICY IF EXISTS p_client_members_write ON client_members;
CREATE POLICY p_client_members_write ON client_members
  FOR ALL USING (has_feature('can_manage_clients'))
  WITH CHECK (has_feature('can_manage_clients'));

-- ── Attendance: company-wide read (team-scoped p_*_team policies untouched) ───
-- was: profile_id = auth.uid() OR role IN ('super_admin','admin','hr','project_manager')
DROP POLICY IF EXISTS p_leave_select ON leave_requests;
CREATE POLICY p_leave_select ON leave_requests
  FOR SELECT USING (profile_id = auth.uid() OR has_feature('can_view_all_attendance'));

DROP POLICY IF EXISTS p_wfh_select ON wfh_requests;
CREATE POLICY p_wfh_select ON wfh_requests
  FOR SELECT USING (profile_id = auth.uid() OR has_feature('can_view_all_attendance'));

DROP POLICY IF EXISTS p_ot_select ON overtime_requests;
CREATE POLICY p_ot_select ON overtime_requests
  FOR SELECT USING (profile_id = auth.uid() OR has_feature('can_view_all_attendance'));

-- ── Attendance: approvals ────────────────────────────────────────────────────
-- was: (own AND pending) OR role IN ('super_admin','admin','hr')
DROP POLICY IF EXISTS p_wfh_update ON wfh_requests;
CREATE POLICY p_wfh_update ON wfh_requests
  FOR UPDATE USING (
    (profile_id = auth.uid() AND status = 'pending')
    OR has_feature('can_approve_requests')
  );

DROP POLICY IF EXISTS p_ot_update ON overtime_requests;
CREATE POLICY p_ot_update ON overtime_requests
  FOR UPDATE USING (
    (profile_id = auth.uid() AND status = 'pending')
    OR has_feature('can_approve_requests')
  );

-- was: role IN ('admin','hr','super_admin')
DROP POLICY IF EXISTS p_exc_admin_update ON attendance_exceptions;
CREATE POLICY p_exc_admin_update ON attendance_exceptions
  FOR UPDATE USING (has_feature('can_approve_requests'));

-- Leave keeps its on-behalf segregation branch hardcoded to super_admin/admin.
DROP POLICY IF EXISTS p_leave_update ON leave_requests;
CREATE POLICY p_leave_update ON leave_requests
  FOR UPDATE USING (
    CASE
      WHEN entered_by IS NOT NULL THEN
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()
                AND role IN ('super_admin', 'admin'))
      ELSE
        (profile_id = auth.uid() AND status = 'pending')
        OR has_feature('can_approve_requests')
    END
  );

-- ══ SECURITY FIXES ═══════════════════════════════════════════════════════════

-- 1. Approvals could be flipped by ANY project member.
-- was: role IN ('super_admin','admin','project_manager') OR is_project_member(project_id)
DROP POLICY IF EXISTS p_approvals_update ON approvals;
CREATE POLICY p_approvals_update ON approvals
  FOR UPDATE USING (has_feature('can_approve_tasks'))
  WITH CHECK (has_feature('can_approve_tasks'));

-- 2. Self-approval hole: p_tasks_update allowed is_task_assignee(id) with NO status
-- restriction, so an employee could set their own task to 'approved'.
--
-- A trigger (not the policy) enforces this so that only the TRANSITION into
-- 'approved' is guarded — editing an already-approved task still works.
CREATE OR REPLACE FUNCTION fn_guard_task_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved'
     AND OLD.status IS DISTINCT FROM 'approved'
     AND NOT has_feature('can_approve_tasks') THEN
    RAISE EXCEPTION 'forbidden_approve';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_task_approval ON tasks;
CREATE TRIGGER trg_guard_task_approval
  BEFORE UPDATE OF status ON tasks
  FOR EACH ROW EXECUTE FUNCTION fn_guard_task_approval();
