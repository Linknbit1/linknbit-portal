-- Task visibility becomes a function of who the work belongs to, not of which
-- project you happen to be staffed on.
--
-- Until now any internal user staffed on any service of a project could read
-- every task in it, and project_manager/finance could read every task in the
-- company. The rule the business actually wants is narrower:
--
--   employee                     — tasks assigned to them, and nothing else
--   team_lead / project_manager  — their own, plus work assigned to anyone they
--                                  share a team with (team membership, not the
--                                  team they are named lead of, so one rule
--                                  serves both roles and widens by itself as
--                                  somebody joins another team)
--   super_admin / admin / finance — everything, as before. Finance keeps its reach
--                                  because billing questions do not respect team
--                                  boundaries.
--
-- HR is deliberately NOT on that list. It never had blanket task access — only
-- what project staffing gave it — so granting it here would be widening access
-- under cover of a change that is meant to narrow it. HR now falls under the
-- same rule as anybody else: its own tasks.
--
-- Two carve-outs, both load-bearing rather than convenience:
--
--   * Unassigned tasks stay visible to leads and PMs inside projects they are on.
--     Without this a backlog is invisible to the only people who can hand it out,
--     and a board becomes impossible to run.
--   * A task's creator can always read it. `insert ... returning` and
--     `update ... returning` both re-read the row through this policy, so
--     without it raising a task for somebody else fails at the moment it is
--     created rather than merely disappearing afterwards.
--
-- Additive to the schema — policies and one function body only, no column or
-- signature changes, so a deployed client keeps working. What it does change is
-- how much a given session is allowed to read, which takes effect immediately.

-- ── The rule, in one place ───────────────────────────────────────────────────
-- Every dependent policy (subtasks, comments, task_assignees, task watchers,
-- time entries) and the task-activity RPCs already gate on can_access_task, so
-- redefining it here closes those doors at the same time rather than leaving
-- a task unreadable but its comment thread wide open.
CREATE OR REPLACE FUNCTION can_access_task(p_task_id uuid) RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = p_task_id
      AND (
        -- Company-wide roles. HR is not one of them — see the header.
        current_user_role() IN ('super_admin', 'admin', 'finance')

        -- Mine: the join table first, then the legacy single assignee.
        OR t.assignee_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM task_assignees ta
          WHERE ta.task_id = t.id AND ta.profile_id = auth.uid()
        )

        -- Raised by me. See the header: this is what keeps RETURNING working.
        OR t.created_by = auth.uid()

        OR (
          current_user_role() IN ('team_lead', 'project_manager')
          AND (
            -- Work belonging to somebody on one of my teams.
            (t.assignee_id IS NOT NULL AND shares_team_with(t.assignee_id))
            OR EXISTS (
              SELECT 1 FROM task_assignees ta
              WHERE ta.task_id = t.id AND shares_team_with(ta.profile_id)
            )
            -- Nobody's work yet — triage, in projects they are actually on.
            OR (
              t.assignee_id IS NULL
              AND NOT EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id)
              AND (is_project_member(t.project_id) OR is_project_creator(t.project_id))
            )
          )
        )
      )
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION can_access_task(uuid) IS
  'May the current user read this task? Assignment-based: own tasks for everyone, plus teammates'' work and unassigned triage for leads and PMs, plus everything for super_admin/admin/finance. The single source of truth for tasks and everything hanging off them.';

-- ── Tasks ────────────────────────────────────────────────────────────────────
-- Deleted rows stay admin-only, exactly as before.
DROP POLICY IF EXISTS p_tasks_internal_select ON tasks;
CREATE POLICY p_tasks_internal_select ON tasks FOR SELECT
  USING (
    is_internal()
    AND (deleted_at IS NULL OR current_user_role() IN ('super_admin', 'admin'))
    AND can_access_task(id)
  );

-- ── Attachments ──────────────────────────────────────────────────────────────
-- Task files were gated on project membership alone, so they would have stayed
-- readable on a task the same person can no longer open. Project-level files
-- (task_id IS NULL) keep the old rule: they belong to the project, not to a task.
DROP POLICY IF EXISTS p_attachments_internal_select ON attachments;
CREATE POLICY p_attachments_internal_select ON attachments FOR SELECT
  USING (
    is_internal()
    AND (
      (task_id IS NOT NULL AND can_access_task(task_id))
      OR (task_id IS NULL AND project_id IS NOT NULL
          AND (has_feature('can_view_all_projects') OR is_project_member(project_id)))
      OR (lead_id    IS NOT NULL AND bd_can_view())
      OR (bd_task_id IS NOT NULL AND bd_can_view())
    )
    AND ((NOT is_confidential) OR can_view_confidential_scope(confidential_scope))
  );

-- Assignment drives visibility now, so both sides of it need to be cheap to ask.
CREATE INDEX IF NOT EXISTS idx_task_assignees_profile ON task_assignees (profile_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by       ON tasks (created_by);
