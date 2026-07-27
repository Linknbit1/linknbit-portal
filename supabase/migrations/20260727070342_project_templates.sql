-- ════════════════════════════════════════════════════════════════════
-- Project templates — a team's reusable pipeline for a service.
--
-- A team lead builds the stages and tasks they run every time (a Marketing
-- team's "Standard campaign", a Design team's "Brand identity"), and picks one
-- when a project takes on that service. Applying a template COPIES it: later
-- edits to the template never touch projects already created from it.
--
-- Ownership is the team; the service is chosen per template, so a Marketing
-- team can keep both a Marketing and an SEO pipeline. Visibility is deliberately
-- narrow — templates are a management tool, not something the whole team reads.
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE project_templates (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     uuid        NOT NULL REFERENCES teams(id)    ON DELETE CASCADE,
  service_id  uuid        NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  name        text        NOT NULL CHECK (length(btrim(name)) > 0),
  description text,
  created_by  uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_templates_team    ON project_templates (team_id);
CREATE INDEX idx_project_templates_service ON project_templates (service_id);

CREATE TRIGGER trg_project_templates_touch
  BEFORE UPDATE ON project_templates
  FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

COMMENT ON TABLE project_templates IS
  'A team''s reusable stage/task pipeline for one service. Applying one copies it into a project service.';

CREATE TABLE template_stages (
  id                uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id       uuid    NOT NULL REFERENCES project_templates(id) ON DELETE CASCADE,
  name              text    NOT NULL CHECK (length(btrim(name)) > 0),
  order_index       integer NOT NULL DEFAULT 0,
  requires_approval boolean NOT NULL DEFAULT false,
  client_visible    boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_template_stages_template ON template_stages (template_id, order_index);

-- Mirrors the columns a real task can know before a project exists: no
-- assignees and no dates, since both depend on the project it lands in.
CREATE TABLE template_tasks (
  id                uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  template_stage_id uuid    NOT NULL REFERENCES template_stages(id) ON DELETE CASCADE,
  title             text    NOT NULL CHECK (length(btrim(title)) > 0),
  description       text,
  priority          text    NOT NULL DEFAULT 'medium'
                            CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  estimated_minutes integer CHECK (estimated_minutes IS NULL OR estimated_minutes > 0),
  client_visible    boolean NOT NULL DEFAULT false,
  order_index       integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_template_tasks_stage ON template_tasks (template_stage_id, order_index);

-- ── Who may see and change a team's templates ────────────────────────────────
-- The team's own lead, a project manager staffed on that team, and admins.
-- Ordinary members are excluded: they receive the stages and tasks once a
-- project is created, they do not author them.
CREATE OR REPLACE FUNCTION can_manage_team_templates(p_team_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT current_user_role() IN ('super_admin', 'admin')
      OR EXISTS (SELECT 1 FROM teams t WHERE t.id = p_team_id AND t.lead_id = auth.uid())
      OR (current_user_role() = 'project_manager'
          AND EXISTS (SELECT 1 FROM team_members tm
                       WHERE tm.team_id = p_team_id AND tm.profile_id = auth.uid()))
$$;

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_stages   ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_tasks    ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_project_templates_all ON project_templates
  FOR ALL USING     (can_manage_team_templates(team_id))
  WITH CHECK (can_manage_team_templates(team_id));

CREATE POLICY p_template_stages_all ON template_stages
  FOR ALL USING (EXISTS (
    SELECT 1 FROM project_templates t
     WHERE t.id = template_stages.template_id AND can_manage_team_templates(t.team_id)))
  WITH CHECK (EXISTS (
    SELECT 1 FROM project_templates t
     WHERE t.id = template_stages.template_id AND can_manage_team_templates(t.team_id)));

CREATE POLICY p_template_tasks_all ON template_tasks
  FOR ALL USING (EXISTS (
    SELECT 1 FROM template_stages ts
      JOIN project_templates t ON t.id = ts.template_id
     WHERE ts.id = template_tasks.template_stage_id AND can_manage_team_templates(t.team_id)))
  WITH CHECK (EXISTS (
    SELECT 1 FROM template_stages ts
      JOIN project_templates t ON t.id = ts.template_id
     WHERE ts.id = template_tasks.template_stage_id AND can_manage_team_templates(t.team_id)));

-- ── Applying a template ──────────────────────────────────────────────────────
-- Copies every stage and task into one service block of a project, appended
-- after whatever is already there. Returns the number of stages and tasks made.
CREATE OR REPLACE FUNCTION apply_template_to_service(
  p_project_service_id uuid,
  p_template_id uuid
)
RETURNS TABLE (stages_created integer, tasks_created integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_project    uuid;
  v_service    uuid;
  v_team       uuid;
  v_tpl_service uuid;
  v_offset     integer;
  v_stage      record;
  v_new_stage  uuid;
  v_stages     integer := 0;
  v_tasks      integer := 0;
  v_added      integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;

  SELECT ps.project_id, ps.service_id INTO v_project, v_service
    FROM project_services ps WHERE ps.id = p_project_service_id;
  IF v_project IS NULL THEN
    RAISE EXCEPTION 'That service is not on this project' USING ERRCODE = 'P0030';
  END IF;

  SELECT t.team_id, t.service_id INTO v_team, v_tpl_service
    FROM project_templates t WHERE t.id = p_template_id;
  IF v_team IS NULL THEN
    RAISE EXCEPTION 'Template not found' USING ERRCODE = 'P0031';
  END IF;

  -- Must be allowed to read the template AND to build in the project.
  IF NOT can_manage_team_templates(v_team) THEN
    RAISE EXCEPTION 'Not allowed to use this team''s templates' USING ERRCODE = '42501';
  END IF;
  IF NOT (is_internal() AND (
            current_user_role() IN ('super_admin', 'admin', 'project_manager')
            OR is_project_member(v_project))) THEN
    RAISE EXCEPTION 'Not allowed to add stages to this project' USING ERRCODE = '42501';
  END IF;

  IF v_tpl_service <> v_service THEN
    RAISE EXCEPTION 'This template builds a different service than the one selected'
      USING ERRCODE = 'P0032';
  END IF;

  SELECT COALESCE(max(order_index) + 1, 0) INTO v_offset
    FROM stages WHERE project_service_id = p_project_service_id;

  FOR v_stage IN
    SELECT * FROM template_stages WHERE template_id = p_template_id ORDER BY order_index, created_at
  LOOP
    INSERT INTO stages (project_id, project_service_id, name, order_index, requires_approval, client_visible, status)
    VALUES (v_project, p_project_service_id, v_stage.name, v_offset + v_stages,
            v_stage.requires_approval, v_stage.client_visible, 'upcoming')
    RETURNING id INTO v_new_stage;
    v_stages := v_stages + 1;

    INSERT INTO tasks (
      project_id, project_service_id, stage_id, title, description,
      priority, status, estimated_minutes, client_visible, board_order, created_by)
    SELECT v_project, p_project_service_id, v_new_stage, tt.title, tt.description,
           tt.priority, 'todo', tt.estimated_minutes, tt.client_visible, tt.order_index, auth.uid()
      FROM template_tasks tt
     WHERE tt.template_stage_id = v_stage.id
     ORDER BY tt.order_index, tt.created_at;
    GET DIAGNOSTICS v_added = ROW_COUNT;
    v_tasks := v_tasks + v_added;
  END LOOP;

  stages_created := v_stages;
  tasks_created  := v_tasks;
  RETURN NEXT;
END;
$$;
