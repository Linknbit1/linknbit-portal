-- Who may see a task stops being a list of role names.
--
-- A team lead created a task, left it unassigned because nobody had been picked
-- yet, and then could not find it again. Underneath, task_visible answered by
-- matching current_user_role() against 'super_admin', 'admin', 'finance' and
-- 'team_lead'. A role invented on the Roles screen could therefore never be
-- given a delivery lead's reach however its permissions were set, which is
-- backwards for a portal whose roles are data.
--
-- Two permissions replace those names, and each grants exactly the reach the
-- Mine / My team / Everyone lens offers:
--
--   can_view_team_tasks  every task in a service you or a teammate are staffed
--                        on, and every task assigned to a teammate
--   can_view_all_tasks   every task in the portal
--
-- A project's managers keep their reach with no permission at all: sitting on
-- project_managers is already a statement about that one project, and it is
-- data rather than a role. So is being staffed on a service — which is what
-- lets a lead see the work in their own block whether or not anybody has been
-- put on it yet.

-- ── The two permissions ──────────────────────────────────────────────────────
INSERT INTO permissions (key, label, description, category, sort_order, is_hidden)
VALUES
  ('can_view_team_tasks', 'View team tasks',
   'See every task in a service you or your teammates are staffed on, and every task assigned to a teammate — not only the ones assigned to you.',
   'Projects', 17, false),
  ('can_view_all_tasks', 'View all tasks',
   'See every task in every project, whoever it belongs to.',
   'Projects', 18, false)
ON CONFLICT (key) DO NOTHING;

-- Granted to the roles that already had this reach through their name, so the
-- change is a change of mechanism and not of who can see what.
INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, 'can_view_team_tasks'
  FROM roles r
 WHERE r.slug IN ('super_admin', 'admin', 'project_manager', 'team_lead')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, 'can_view_all_tasks'
  FROM roles r
 WHERE r.slug IN ('super_admin', 'admin', 'finance')
ON CONFLICT DO NOTHING;

-- ── Is this service one my team works in? ────────────────────────────────────
-- Staffing, not assignment: a service block is "yours" on the day it holds no
-- task of yours at all, which is the case the lead ran into.
CREATE OR REPLACE FUNCTION public.is_team_service(p_project_service_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
      FROM service_members sm
     WHERE sm.project_service_id = p_project_service_id
       AND (sm.profile_id = auth.uid() OR shares_team_with(sm.profile_id))
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.is_team_service(uuid) IS
  'Is the current user, or anyone sharing a team with them, staffed on this project service?';

-- ── The rule, over columns rather than an id ─────────────────────────────────
-- Takes the columns rather than the id so it can still be asked about the row a
-- statement is inserting — PostgREST reads every write back, and that read-back
-- is checked against the SELECT policy (see 20260828140000).
--
-- p_project_service_id is new. Nothing outside these policies calls this
-- function, so the old four-argument form is dropped at the end rather than
-- being kept alive through a deploy.
CREATE OR REPLACE FUNCTION public.task_visible(
  p_task_id            uuid,
  p_project_id         uuid,
  p_project_service_id uuid,
  p_assignee_id        uuid,
  p_created_by         uuid
) RETURNS boolean AS $$
  SELECT
    has_feature('can_view_all_tasks')
    OR p_assignee_id = auth.uid()
    OR p_created_by  = auth.uid()
    -- A task being inserted has no assignees or reviewers yet, so these are
    -- simply false for it rather than unanswerable.
    OR EXISTS (
      SELECT 1 FROM task_assignees ta
      WHERE ta.task_id = p_task_id AND ta.profile_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM task_reviewers tr
      WHERE tr.task_id = p_task_id AND tr.profile_id = auth.uid()
    )
    -- The manager of a project answers for all of it, whichever service the
    -- work sits in. No permission: it is a fact about this project.
    OR is_project_manager(p_project_id)
    OR (
      has_feature('can_view_team_tasks')
      AND (
        is_team_service(p_project_service_id)
        OR (p_assignee_id IS NOT NULL AND shares_team_with(p_assignee_id))
        OR EXISTS (
          SELECT 1 FROM task_assignees ta
          WHERE ta.task_id = p_task_id AND shares_team_with(ta.profile_id)
        )
        -- Nobody on it yet, in a project they are part of: work in flight
        -- belongs to whoever is running the project, not to nobody.
        OR (
          p_assignee_id IS NULL
          AND NOT EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = p_task_id)
          AND (is_project_member(p_project_id) OR is_project_creator(p_project_id))
        )
      )
    )
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.task_visible(uuid, uuid, uuid, uuid, uuid) IS
  'May the current user read a task with these columns? Takes the columns rather than an id so it can be asked about a row that is still being written.';

-- ── The id-shaped wrapper every dependent policy uses ────────────────────────
CREATE OR REPLACE FUNCTION public.can_access_task(p_task_id uuid) RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = p_task_id
      AND task_visible(t.id, t.project_id, t.project_service_id, t.assignee_id, t.created_by)
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ── Deleted tasks: also a permission now ─────────────────────────────────────
DROP POLICY IF EXISTS p_tasks_internal_select ON tasks;
CREATE POLICY p_tasks_internal_select ON tasks FOR SELECT
  USING (
    is_internal()
    AND (deleted_at IS NULL OR has_feature('can_view_deleted_projects'))
    AND task_visible(id, project_id, project_service_id, assignee_id, created_by)
  );

DROP FUNCTION IF EXISTS public.task_visible(uuid, uuid, uuid, uuid);

REVOKE ALL ON FUNCTION public.task_visible(uuid, uuid, uuid, uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.task_visible(uuid, uuid, uuid, uuid, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.is_team_service(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_team_service(uuid) TO authenticated;
