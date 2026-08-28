-- A project can have more than one manager.
--
-- projects.manager_id held exactly one, which meant co-managed work had to
-- nominate a figurehead, and the other manager was invisible to every rule that
-- asked "who runs this". Expand/migrate/contract, per the migration rules: the
-- column stays and keeps working, a join table becomes the truth, and the two
-- are held in step until the front end has moved and a later migration can drop
-- the column.
--
-- What "manager" now decides:
--   * they can read the project, even with no service staffing and no
--     can_view_all_projects. Managing a project you cannot open is nonsense,
--     and it was the state a manager was actually in.
--   * they can read every task in it. This replaces the shared-team rule that
--     20260828100000 gave project_manager, which was never the intent: a PM
--     answers for the projects they run, not for whoever happens to sit on
--     their teams.
--
-- The manager rule is deliberately NOT gated on role. An admin named as manager,
-- or a team lead running one project, gets it for that project because they
-- manage it, not because of what their role is called.

-- ── The table ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_managers (
  project_id uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  profile_id uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  PRIMARY KEY (project_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_project_managers_profile ON project_managers (profile_id);

COMMENT ON TABLE project_managers IS
  'Who manages a project. Replaces projects.manager_id, which is kept in step as the primary manager until the column is dropped.';

-- Everyone already staffed as the single manager keeps the job.
INSERT INTO project_managers (project_id, profile_id)
SELECT p.id, p.manager_id FROM projects p WHERE p.manager_id IS NOT NULL
ON CONFLICT DO NOTHING;

ALTER TABLE project_managers ENABLE ROW LEVEL SECURITY;

-- Readable by everyone internal: "who runs this project" is not privileged, and
-- the project card shows it.
DROP POLICY IF EXISTS p_project_managers_select ON project_managers;
CREATE POLICY p_project_managers_select ON project_managers FOR SELECT
  USING (is_internal());

DROP POLICY IF EXISTS p_project_managers_write ON project_managers;
CREATE POLICY p_project_managers_write ON project_managers FOR ALL
  USING     (is_internal() AND has_feature('can_manage_projects'))
  WITH CHECK (is_internal() AND has_feature('can_manage_projects'));

-- ── Keeping the column in step, both ways ────────────────────────────────────
-- Each side guards on IS DISTINCT FROM, so the write that would bounce back is
-- never issued and the two triggers cannot chase each other.
CREATE OR REPLACE FUNCTION fn_sync_manager_id_to_table()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.manager_id IS NOT NULL THEN
    INSERT INTO project_managers (project_id, profile_id)
    VALUES (NEW.id, NEW.manager_id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_projects_sync_manager ON projects;
CREATE TRIGGER trg_projects_sync_manager
  AFTER INSERT OR UPDATE OF manager_id ON projects
  FOR EACH ROW EXECUTE FUNCTION fn_sync_manager_id_to_table();

-- The column follows the table: the longest-standing manager is the primary,
-- so an old client reading manager_id sees a stable, sensible answer rather
-- than whoever was added last.
CREATE OR REPLACE FUNCTION fn_sync_table_to_manager_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_project uuid; v_primary uuid;
BEGIN
  v_project := COALESCE(NEW.project_id, OLD.project_id);

  SELECT pm.profile_id INTO v_primary
    FROM project_managers pm
   WHERE pm.project_id = v_project
   ORDER BY pm.created_at, pm.profile_id
   LIMIT 1;

  UPDATE projects
     SET manager_id = v_primary
   WHERE id = v_project
     AND manager_id IS DISTINCT FROM v_primary;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_managers_sync_column ON project_managers;
CREATE TRIGGER trg_project_managers_sync_column
  AFTER INSERT OR DELETE ON project_managers
  FOR EACH ROW EXECUTE FUNCTION fn_sync_table_to_manager_id();

-- ── Asking the question ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_project_manager(p_project_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_managers pm
     WHERE pm.project_id = p_project_id
       AND pm.profile_id = auth.uid()
  )
$$;

COMMENT ON FUNCTION public.is_project_manager(uuid) IS
  'Does the current user manage this project? Independent of role: an admin or a lead named as manager qualifies for that project.';

REVOKE ALL ON FUNCTION public.is_project_manager(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_project_manager(uuid) TO authenticated;

-- ── A manager can open their own project ─────────────────────────────────────
DROP POLICY IF EXISTS p_projects_internal_select ON projects;
CREATE POLICY p_projects_internal_select ON projects FOR SELECT
  USING (
    is_internal()
    AND (deleted_at IS NULL OR has_feature('can_view_deleted_projects'))
    AND (
      has_feature('can_view_all_projects')
      OR is_project_member(id)
      OR is_project_manager(id)
      OR created_by = auth.uid()
    )
  );

-- ── Task visibility follows the project, not the team ────────────────────────
CREATE OR REPLACE FUNCTION public.task_visible(
  p_task_id     uuid,
  p_project_id  uuid,
  p_assignee_id uuid,
  p_created_by  uuid
) RETURNS boolean AS $$
  SELECT
    current_user_role() IN ('super_admin', 'admin', 'finance')
    OR p_assignee_id = auth.uid()
    OR p_created_by  = auth.uid()
    OR EXISTS (
      SELECT 1 FROM task_assignees ta
      WHERE ta.task_id = p_task_id AND ta.profile_id = auth.uid()
    )
    -- Whoever manages the project sees all of its work. Not role-gated: it is
    -- the managing that grants it.
    OR is_project_manager(p_project_id)
    -- A lead answers for their people rather than for a project, so their reach
    -- is still the teams they are on.
    OR (
      current_user_role() = 'team_lead'
      AND (
        (p_assignee_id IS NOT NULL AND shares_team_with(p_assignee_id))
        OR EXISTS (
          SELECT 1 FROM task_assignees ta
          WHERE ta.task_id = p_task_id AND shares_team_with(ta.profile_id)
        )
        OR (
          p_assignee_id IS NULL
          AND NOT EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = p_task_id)
          AND (is_project_member(p_project_id) OR is_project_creator(p_project_id))
        )
      )
    )
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
