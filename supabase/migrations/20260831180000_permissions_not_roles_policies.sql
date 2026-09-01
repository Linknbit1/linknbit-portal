-- Role names out of RLS, part 1: the policies.
--
-- Ten policies across six tables still asked "is this person an admin?" instead
-- of "may this person do this?". Every one is replaced by a permission, and each
-- new key is granted in this same migration to exactly the roles that held the
-- ability by name — so nothing changes about who can do what today. What changes
-- is that a role built on the Roles screen can now be given any of it.
--
-- See the Permission Rules section of CLAUDE.md.
--
-- Deliberately NOT converted: `p_profiles_self_update`, whose `role =
-- current_user_role()` is not a gate. It is the check that stops you editing
-- your own role — the column being guarded happens to be the role, and there is
-- no permission that could express that better.

-- ── Three new keys ───────────────────────────────────────────────────────────
INSERT INTO permissions (key, label, description, category, sort_order, is_hidden)
VALUES
  ('can_manage_calendar', 'Manage the company calendar',
   'Add and remove public holidays, company-wide WFH days and working Saturdays.',
   'Attendance', 47, false),
  ('can_view_all_timesheets', 'View all logged time',
   'See time logged against tasks by anyone, not only your own and your teammates''.',
   'Projects', 19, false),
  ('can_manage_timesheets', 'Edit logged time',
   'Add, change and remove time entries on somebody else''s behalf.',
   'Projects', 20, false)
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, 'can_manage_calendar' FROM roles r
 WHERE r.slug IN ('super_admin', 'admin', 'hr')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, 'can_view_all_timesheets' FROM roles r
 WHERE r.slug IN ('super_admin', 'admin', 'project_manager', 'finance')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, 'can_manage_timesheets' FROM roles r
 WHERE r.slug IN ('super_admin', 'admin', 'project_manager')
ON CONFLICT DO NOTHING;

-- ── The company calendar: holidays, WFH days, working Saturdays ──────────────
DROP POLICY IF EXISTS p_holidays_insert ON holidays;
CREATE POLICY p_holidays_insert ON holidays FOR INSERT
  WITH CHECK (has_feature('can_manage_calendar'));
DROP POLICY IF EXISTS p_holidays_delete ON holidays;
CREATE POLICY p_holidays_delete ON holidays FOR DELETE
  USING (has_feature('can_manage_calendar'));

DROP POLICY IF EXISTS p_company_wfh_insert ON company_wfh_days;
CREATE POLICY p_company_wfh_insert ON company_wfh_days FOR INSERT
  WITH CHECK (has_feature('can_manage_calendar'));
DROP POLICY IF EXISTS p_company_wfh_delete ON company_wfh_days;
CREATE POLICY p_company_wfh_delete ON company_wfh_days FOR DELETE
  USING (has_feature('can_manage_calendar'));

DROP POLICY IF EXISTS p_working_sat_insert ON working_saturdays;
CREATE POLICY p_working_sat_insert ON working_saturdays FOR INSERT
  WITH CHECK (has_feature('can_manage_calendar'));
DROP POLICY IF EXISTS p_working_sat_delete ON working_saturdays;
CREATE POLICY p_working_sat_delete ON working_saturdays FOR DELETE
  USING (has_feature('can_manage_calendar'));

-- ── Status labels: the same key that governs the rest of the taxonomy ────────
DROP POLICY IF EXISTS p_status_labels_write ON status_labels;
CREATE POLICY p_status_labels_write ON status_labels FOR ALL
  USING (has_feature('can_manage_services'))
  WITH CHECK (has_feature('can_manage_services'));

-- ── Logged time ──────────────────────────────────────────────────────────────
-- Your own, your teammates', or everyone's if you may see everyone's. Sharing a
-- team stays a fact about the data rather than a permission, as it was.
DROP POLICY IF EXISTS p_tte_select ON task_time_entries;
CREATE POLICY p_tte_select ON task_time_entries FOR SELECT
  USING (
    is_internal()
    AND can_access_task(task_id)
    AND (
      profile_id = auth.uid()
      OR has_feature('can_view_all_timesheets')
      OR shares_team_with(profile_id)
    )
  );

DROP POLICY IF EXISTS p_tte_write_managed ON task_time_entries;
CREATE POLICY p_tte_write_managed ON task_time_entries FOR ALL
  USING (is_internal() AND has_feature('can_manage_timesheets'))
  WITH CHECK (is_internal() AND has_feature('can_manage_timesheets'));
