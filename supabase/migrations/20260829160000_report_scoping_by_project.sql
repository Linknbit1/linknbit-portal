-- Reports: scope the PROJECT side the way the people side is already scoped.
--
-- fn_can_report_on(profile) has always narrowed the numbers to people you may
-- report on, so the hours in a project row were already limited to your own
-- team's contribution. What was never limited was which PROJECTS you could
-- name, or open a drill-down on: report_project_detail and report_project_tasks
-- take a project id and answer for any of them.
--
-- The missing rule, as asked for:
--
--   team_lead  projects running a service their team covers. A lead answers for
--              a craft, so Design's lead sees the design work on a project and
--              has no business in its marketing spend.
--   PM         projects they manage. Settled by project_managers, so a
--              co-manager counts, and it is the same predicate task visibility
--              uses rather than a second definition of "runs this project".
--   admin/hr/  everything, unchanged.
--   super_admin
--
-- Deliberately mirrors fn_can_report_on rather than inventing a second shape:
-- one function per axis, person and project, and every report asks the one it
-- needs.
CREATE OR REPLACE FUNCTION public.fn_can_report_on_project(p_project uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT current_user_role() IN ('super_admin', 'admin', 'hr')
      OR is_project_manager(p_project)
      -- The lead's craft: a project running a service one of their teams covers.
      OR (current_user_role() = 'team_lead' AND EXISTS (
            SELECT 1
              FROM team_members tm
              JOIN teams t          ON t.id = tm.team_id
              JOIN project_services ps ON ps.project_id = p_project
              JOIN services s       ON s.id = ps.service_id
             WHERE tm.profile_id = auth.uid()
               AND t.service_type = s.slug
         ))
      -- Anyone staffed on it can already see its tasks, so withholding the
      -- summary of work they did themselves would be theatre.
      OR is_project_member(p_project);
$$;

COMMENT ON FUNCTION public.fn_can_report_on_project(uuid) IS
  'May the current user see reporting for this project? The project-side counterpart of fn_can_report_on.';

REVOKE ALL ON FUNCTION public.fn_can_report_on_project(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.fn_can_report_on_project(uuid) TO authenticated;

-- ── Apply it ─────────────────────────────────────────────────────────────────
-- Patched into the live definitions rather than retyped: these functions are
-- long, and re-declaring them from a migration file that has already drifted
-- once is how the chat notifier ended up with two versions. The asserts make a
-- missed anchor fail loudly instead of silently leaving a report unscoped.
DO $do$
DECLARE v_def text;
BEGIN
  -- 1. The list: a project you may not report on is not yours to see at all.
  SELECT pg_get_functiondef(oid) INTO v_def
    FROM pg_proc WHERE proname = 'report_project_backlog' AND pronamespace = 'public'::regnamespace;

  IF position('WHERE COALESCE(ti.mins, 0) > 0 OR COALESCE(su.mins, 0) > 0' IN v_def) = 0 THEN
    RAISE EXCEPTION 'report_project_backlog: anchor not found, refusing to leave it unscoped';
  END IF;

  v_def := replace(
    v_def,
    'WHERE COALESCE(ti.mins, 0) > 0 OR COALESCE(su.mins, 0) > 0',
    'WHERE (COALESCE(ti.mins, 0) > 0 OR COALESCE(su.mins, 0) > 0) AND fn_can_report_on_project(p.id)'
  );
  EXECUTE v_def;

  -- 2. The drill-downs: guard at the top, so an id typed into the URL is
  --    refused rather than answered.
  FOR v_def IN
    SELECT pg_get_functiondef(oid) FROM pg_proc
     WHERE proname IN ('report_project_detail', 'report_project_tasks')
       AND pronamespace = 'public'::regnamespace
  LOOP
    IF position('BEGIN' IN v_def) = 0 THEN
      RAISE EXCEPTION 'project report function has no BEGIN to guard';
    END IF;
    v_def := overlay(
      v_def PLACING
        E'BEGIN\n  IF NOT fn_can_report_on_project(p_project) THEN\n'
        || E'    RAISE EXCEPTION ''Not allowed to report on this project'';\n  END IF;\n'
      FROM position('BEGIN' IN v_def) FOR 6
    );
    EXECUTE v_def;
  END LOOP;
END
$do$;
