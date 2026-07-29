-- ════════════════════════════════════════════════════════════════════
-- Four-layer projects: project → service → stage → task.
--
-- Was: a project had ONE service (projects.service_type, a services.slug) and
-- people were attached to the project. Now a project holds any number of
-- services, and people are attached to a service — the unit of work they were
-- actually staffed on.
--
-- THIS MIGRATION LOSES NO DATA. Every existing row is carried across:
--   • each project gets a project_services row from its current service_type;
--   • a project whose stages/tasks disagreed with it (4 archived 'seo' tasks in
--     a 'marketing' project) gains that second service rather than having the
--     rows coerced — the new model can finally represent them honestly;
--   • all 55 project_members become service_members on every service of their
--     project, so nobody loses access;
--   • every stage and task is bound to a service, preferring its own
--     service_type and falling back to the project's.
-- Each step is followed by a guard that aborts the whole migration if a single
-- row would be left behind.
--
-- project_members and the legacy service_type columns are deliberately still
-- here — part 2 drops them once the app has stopped reading them.
-- ════════════════════════════════════════════════════════════════════

-- ── 1. The service layer ──────────────────────────────────────────────────────
CREATE TABLE project_services (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  service_id  uuid        NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  order_index integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  -- One block per service per project: the service IS the identity of the block.
  UNIQUE (project_id, service_id),
  -- Composite-FK target: lets stages/tasks prove their service belongs to their
  -- project without a trigger.
  UNIQUE (id, project_id)
);

CREATE INDEX idx_project_services_project ON project_services (project_id, order_index);
CREATE INDEX idx_project_services_service ON project_services (service_id);

COMMENT ON TABLE project_services IS
  'A service a project is running (design/development/…). Stages, tasks and members hang off this, not the project.';

-- Every project's current service.
INSERT INTO project_services (project_id, service_id)
SELECT p.id, s.id
  FROM projects p
  JOIN services s ON s.slug = p.service_type
ON CONFLICT (project_id, service_id) DO NOTHING;

-- Services implied by existing stages/tasks that disagreed with their project.
INSERT INTO project_services (project_id, service_id)
SELECT DISTINCT st.project_id, s.id
  FROM stages st JOIN services s ON s.slug = st.service_type
ON CONFLICT (project_id, service_id) DO NOTHING;

INSERT INTO project_services (project_id, service_id)
SELECT DISTINCT t.project_id, s.id
  FROM tasks t JOIN services s ON s.slug = t.service_type
ON CONFLICT (project_id, service_id) DO NOTHING;

-- Order services deterministically within each project (catalog order).
UPDATE project_services ps
   SET order_index = o.rn - 1
  FROM (
    SELECT ps2.id, row_number() OVER (PARTITION BY ps2.project_id ORDER BY s.name) AS rn
      FROM project_services ps2 JOIN services s ON s.id = ps2.service_id
  ) o
 WHERE o.id = ps.id;

DO $$
DECLARE v_orphans int;
BEGIN
  SELECT count(*) INTO v_orphans
    FROM projects p
   WHERE NOT EXISTS (SELECT 1 FROM project_services ps WHERE ps.project_id = p.id);
  IF v_orphans > 0 THEN
    RAISE EXCEPTION 'Aborting: % project(s) would be left with no service', v_orphans;
  END IF;
END $$;

-- ── 2. Membership moves to the service ────────────────────────────────────────
CREATE TABLE service_members (
  project_service_id uuid        NOT NULL REFERENCES project_services(id) ON DELETE CASCADE,
  profile_id         uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_in_service    text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_service_id, profile_id)
);

CREATE INDEX idx_service_members_profile ON service_members (profile_id);

COMMENT ON TABLE service_members IS
  'Who works on a project service. Replaces project_members — is_project_member() now means "member of any service of the project".';

-- Existing members join every service of their project, so no access is lost.
INSERT INTO service_members (project_service_id, profile_id, role_in_service, created_at)
SELECT ps.id, pm.profile_id, pm.role_in_project, pm.created_at
  FROM project_members pm
  JOIN project_services ps ON ps.project_id = pm.project_id
ON CONFLICT (project_service_id, profile_id) DO NOTHING;

DO $$
DECLARE v_before int; v_after int;
BEGIN
  SELECT count(*) INTO v_before FROM project_members;
  SELECT count(DISTINCT (ps.project_id, sm.profile_id)) INTO v_after
    FROM service_members sm JOIN project_services ps ON ps.id = sm.project_service_id;
  IF v_after < v_before THEN
    RAISE EXCEPTION 'Aborting: % project memberships in, only % distinct (project, person) pairs out', v_before, v_after;
  END IF;
END $$;

-- ── 3. Stages belong to a service ─────────────────────────────────────────────
ALTER TABLE stages ADD COLUMN project_service_id uuid;

-- Prefer the stage's own service_type; fall back to the project's.
UPDATE stages st
   SET project_service_id = ps.id
  FROM project_services ps
  JOIN services s ON s.id = ps.service_id
 WHERE ps.project_id = st.project_id
   AND s.slug = st.service_type;

UPDATE stages st
   SET project_service_id = ps.id
  FROM project_services ps
  JOIN services s ON s.id = ps.service_id
  JOIN projects p ON p.id = ps.project_id
 WHERE st.project_service_id IS NULL
   AND ps.project_id = st.project_id
   AND s.slug = p.service_type;

DO $$
DECLARE v int;
BEGIN
  SELECT count(*) INTO v FROM stages WHERE project_service_id IS NULL;
  IF v > 0 THEN RAISE EXCEPTION 'Aborting: % stage(s) could not be assigned a service', v; END IF;
END $$;

ALTER TABLE stages ALTER COLUMN project_service_id SET NOT NULL;
ALTER TABLE stages ADD CONSTRAINT stages_service_belongs_to_project
  FOREIGN KEY (project_service_id, project_id) REFERENCES project_services (id, project_id) ON DELETE CASCADE;
-- Composite-FK target for tasks: a task's stage must be in the task's service.
ALTER TABLE stages ADD CONSTRAINT stages_id_service_unique UNIQUE (id, project_service_id);

CREATE INDEX idx_stages_service ON stages (project_service_id, order_index);

-- ── 4. Tasks belong to a service (with or without a stage) ────────────────────
ALTER TABLE tasks ADD COLUMN project_service_id uuid;

-- A staged task always follows its stage.
UPDATE tasks t
   SET project_service_id = st.project_service_id
  FROM stages st
 WHERE st.id = t.stage_id;

-- Otherwise its own service_type, then the project's.
UPDATE tasks t
   SET project_service_id = ps.id
  FROM project_services ps
  JOIN services s ON s.id = ps.service_id
 WHERE t.project_service_id IS NULL
   AND ps.project_id = t.project_id
   AND s.slug = t.service_type;

UPDATE tasks t
   SET project_service_id = ps.id
  FROM project_services ps
  JOIN services s ON s.id = ps.service_id
  JOIN projects p ON p.id = ps.project_id
 WHERE t.project_service_id IS NULL
   AND ps.project_id = t.project_id
   AND s.slug = p.service_type;

DO $$
DECLARE v int;
BEGIN
  SELECT count(*) INTO v FROM tasks WHERE project_service_id IS NULL;
  IF v > 0 THEN RAISE EXCEPTION 'Aborting: % task(s) could not be assigned a service', v; END IF;
END $$;

ALTER TABLE tasks ALTER COLUMN project_service_id SET NOT NULL;
ALTER TABLE tasks ADD CONSTRAINT tasks_service_belongs_to_project
  FOREIGN KEY (project_service_id, project_id) REFERENCES project_services (id, project_id) ON DELETE CASCADE;

CREATE INDEX idx_tasks_service ON tasks (project_service_id);

-- A task's stage must live in the task's service. This is a trigger rather than
-- a composite FK because stage_id must stay ON DELETE SET NULL (deleting a stage
-- unstages its tasks, it does not delete them) and a composite FK would try to
-- null the NOT NULL service column with it.
CREATE OR REPLACE FUNCTION fn_task_stage_service_match()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_stage_service uuid;
BEGIN
  IF NEW.stage_id IS NULL THEN RETURN NEW; END IF;
  SELECT project_service_id INTO v_stage_service FROM stages WHERE id = NEW.stage_id;
  IF v_stage_service IS DISTINCT FROM NEW.project_service_id THEN
    RAISE EXCEPTION 'Task stage belongs to a different service of this project'
      USING ERRCODE = 'P0020';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_task_stage_service_match
  BEFORE INSERT OR UPDATE OF stage_id, project_service_id ON tasks
  FOR EACH ROW EXECUTE FUNCTION fn_task_stage_service_match();

-- Moving a stage to another service takes its tasks along, so the rule above
-- can never be violated from the stage side.
CREATE OR REPLACE FUNCTION fn_stage_service_moved()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE tasks SET project_service_id = NEW.project_service_id
   WHERE stage_id = NEW.id AND project_service_id IS DISTINCT FROM NEW.project_service_id;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_stage_service_moved
  AFTER UPDATE OF project_service_id ON stages
  FOR EACH ROW WHEN (OLD.project_service_id IS DISTINCT FROM NEW.project_service_id)
  EXECUTE FUNCTION fn_stage_service_moved();

-- ── 5. Access helpers ─────────────────────────────────────────────────────────
-- Same name, same meaning to every existing policy ("does this person work on
-- this project?"), now answered one layer down. Nothing else has to change.
CREATE OR REPLACE FUNCTION is_project_member(p_project_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
      FROM service_members sm
      JOIN project_services ps ON ps.id = sm.project_service_id
     WHERE ps.project_id = p_project_id
       AND sm.profile_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION is_service_member(p_project_service_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM service_members sm
     WHERE sm.project_service_id = p_project_service_id
       AND sm.profile_id = auth.uid()
  )
$$;

-- ── 6. RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE project_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_members  ENABLE ROW LEVEL SECURITY;

-- Internal staff read the service list (mirrors p_project_members_select).
CREATE POLICY p_project_services_internal_select ON project_services
  FOR SELECT USING (is_internal());

-- Clients see the services of the projects already visible to them — the chips
-- on their project pages come from here now that projects.service_type is going.
CREATE POLICY p_project_services_client_select ON project_services
  FOR SELECT USING (
    NOT is_internal()
    AND EXISTS (
      SELECT 1 FROM projects p
       WHERE p.id = project_services.project_id
         AND p.client_visible
         AND p.deleted_at IS NULL
         AND p.client_id IN (SELECT cm.client_id FROM client_members cm WHERE cm.profile_id = auth.uid())
    )
  );

CREATE POLICY p_project_services_write ON project_services
  FOR ALL USING     (current_user_role() IN ('super_admin', 'admin', 'project_manager'))
  WITH CHECK (current_user_role() IN ('super_admin', 'admin', 'project_manager'));

CREATE POLICY p_service_members_select ON service_members
  FOR SELECT USING (is_internal());

CREATE POLICY p_service_members_write ON service_members
  FOR ALL USING     (current_user_role() IN ('super_admin', 'admin', 'project_manager'))
  WITH CHECK (current_user_role() IN ('super_admin', 'admin', 'project_manager'));

-- ── 7. Audit ──────────────────────────────────────────────────────────────────
-- Staffing changes stay visible in the trail that already covers project_members.
-- A dedicated capture keeps the semantic action names (fn_audit_capture's arms
-- are keyed on table names it does not know about).
CREATE OR REPLACE FUNCTION fn_audit_project_service()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row jsonb; v_actor uuid := auth.uid(); v_actor_name text; v_actor_role text;
  v_subject uuid; v_subject_name text; v_project uuid; v_project_name text;
  v_service text; v_action text; v_summary text;
BEGIN
  v_row := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;

  IF TG_TABLE_NAME = 'service_members' THEN
    v_subject := NULLIF(v_row->>'profile_id','')::uuid;
    v_action  := CASE WHEN TG_OP = 'INSERT' THEN 'service_member.added' ELSE 'service_member.removed' END;
    SELECT ps.project_id, s.name INTO v_project, v_service
      FROM project_services ps JOIN services s ON s.id = ps.service_id
     WHERE ps.id = (v_row->>'project_service_id')::uuid;
  ELSE
    v_action  := CASE WHEN TG_OP = 'INSERT' THEN 'project_service.added' ELSE 'project_service.removed' END;
    v_project := NULLIF(v_row->>'project_id','')::uuid;
    SELECT s.name INTO v_service FROM services s WHERE s.id = (v_row->>'service_id')::uuid;
  END IF;

  SELECT name INTO v_project_name FROM projects WHERE id = v_project;
  IF v_actor IS NOT NULL THEN
    SELECT name, role INTO v_actor_name, v_actor_role FROM profiles WHERE id = v_actor;
  END IF;
  IF v_subject IS NOT NULL THEN
    SELECT name INTO v_subject_name FROM profiles WHERE id = v_subject;
  END IF;

  v_summary := format('%s (%s): %s — %s%s',
    COALESCE(v_actor_name,'System'), COALESCE(v_actor_role,'system'),
    replace(replace(v_action, '.', ' '), '_', ' '),
    COALESCE(v_service,'service') || ' on ' || COALESCE(v_project_name,'a project'),
    CASE WHEN v_subject_name IS NOT NULL THEN ' — ' || v_subject_name ELSE '' END);

  INSERT INTO audit_log(
    module, table_name, record_id, operation, action, severity,
    actor_id, actor_name, actor_role, actor_kind,
    subject_id, subject_name, summary,
    old_values, new_values, context)
  VALUES (
    'projects', TG_TABLE_NAME, v_project, TG_OP, v_action, 'info',
    v_actor, COALESCE(v_actor_name,'System'), COALESCE(v_actor_role,'system'),
    CASE WHEN v_actor IS NULL THEN 'system' ELSE 'user' END,
    v_subject, v_subject_name, v_summary,
    CASE WHEN TG_OP = 'DELETE' THEN v_row ELSE NULL END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE v_row END,
    jsonb_build_object('project_id', v_project, 'service', v_service));

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_audit_service_members
  AFTER INSERT OR DELETE ON service_members
  FOR EACH ROW EXECUTE FUNCTION fn_audit_project_service();

CREATE TRIGGER trg_audit_project_services
  AFTER INSERT OR DELETE ON project_services
  FOR EACH ROW EXECUTE FUNCTION fn_audit_project_service();

-- ── 8. Removing a service from a project ──────────────────────────────────────
-- The FKs cascade, so a bare DELETE would silently take stages and tasks with
-- it. This is the only supported path: it refuses while work still hangs off
-- the service, and says exactly what is in the way.
CREATE OR REPLACE FUNCTION remove_project_service(p_project_service_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_stages int; v_tasks int; v_project uuid; v_count int;
BEGIN
  IF current_user_role() NOT IN ('super_admin', 'admin', 'project_manager') THEN
    RAISE EXCEPTION 'Not allowed to change a project''s services' USING ERRCODE = '42501';
  END IF;

  SELECT project_id INTO v_project FROM project_services WHERE id = p_project_service_id;
  IF v_project IS NULL THEN
    RAISE EXCEPTION 'Service not found on this project' USING ERRCODE = 'P0021';
  END IF;

  SELECT count(*) INTO v_stages FROM stages WHERE project_service_id = p_project_service_id;
  SELECT count(*) INTO v_tasks  FROM tasks
   WHERE project_service_id = p_project_service_id AND deleted_at IS NULL;

  IF v_stages > 0 OR v_tasks > 0 THEN
    RAISE EXCEPTION 'This service still has % stage(s) and % task(s) — move or delete them first', v_stages, v_tasks
      USING ERRCODE = 'P0022';
  END IF;

  SELECT count(*) INTO v_count FROM project_services WHERE project_id = v_project;
  IF v_count <= 1 THEN
    RAISE EXCEPTION 'A project must keep at least one service' USING ERRCODE = 'P0023';
  END IF;

  DELETE FROM project_services WHERE id = p_project_service_id;
END;
$$;
