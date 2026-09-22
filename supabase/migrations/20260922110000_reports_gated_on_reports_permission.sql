-- Reports were gated on the standup permissions, not the reports one.
--
-- fn_can_report_on() tested can_view_standups / can_view_team_standups. Two roles
-- were wrong as a result: Finance held can_view_reports and neither standup key,
-- so the page opened and returned only their own row; HR held can_view_standups,
-- so they could pull delivery time on every employee.
--
-- Scope now comes from the timesheet/task keys, which are what "whose work may I
-- look at" already means everywhere else. Effect per role:
--   Super Admin, Admin  unchanged (all)
--   Finance             self -> all      (fixed; the role this was built for)
--   Project Manager     team -> all      (they already held can_view_all_timesheets
--                                         and saw every row on the Timesheet screen;
--                                         this removes the inconsistency)
--   HR                  all -> all       (preserved deliberately, see below)
--   Team Lead, Employee unchanged
--
-- HR is granted can_view_all_timesheets explicitly rather than allowed to lose
-- access silently: this migration changes the mechanism, not who can do what.
-- Whether HR should see delivery time at all is a decision, and it should look
-- like one — revoke that key and it is made.

CREATE OR REPLACE FUNCTION public.fn_can_report_on(p_profile uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT p_profile = auth.uid()
      OR (
        has_feature('can_view_reports')
        AND (
          has_feature('can_view_all_timesheets')
          OR (has_feature('can_view_team_tasks') AND shares_team_with(p_profile))
        )
      );
$function$;

CREATE OR REPLACE FUNCTION public.fn_can_report_on_project(p_project uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT has_feature('can_view_all_timesheets')
      OR is_project_manager(p_project)
      OR is_project_member(p_project)
      OR (has_feature('can_view_team_tasks') AND EXISTS (
            SELECT 1
              FROM team_members tm
              JOIN teams t             ON t.id = tm.team_id
              JOIN project_services ps ON ps.project_id = p_project
              JOIN services s          ON s.id = ps.service_id
             WHERE tm.profile_id = auth.uid()
               AND t.service_type = s.slug
         ));
$function$;

INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, 'can_view_all_timesheets' FROM roles r WHERE r.slug = 'hr'
ON CONFLICT DO NOTHING;
