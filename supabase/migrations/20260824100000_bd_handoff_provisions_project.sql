-- Handing a won lead to delivery now builds the project, instead of only
-- writing a note about one.
--
-- Until now `bd_handoffs` recorded the intent — project name, service, receiving
-- manager — and `project_id` stayed NULL forever, because turning it into a real
-- project was a manual step somebody had to remember. The Starr Luxury Jets lead
-- is the proof: handed off, stamped on the timeline, and no project ever
-- appeared under that name.
--
-- It cannot be done from the client. Creating a project needs
-- `can_manage_projects`, and neither BD role holds it — a BD rep's insert would
-- be refused by RLS. Granting them that permission would let them edit and
-- delete every project in the portal, which is far more than "may hand off a
-- deal they won". Hence one SECURITY DEFINER entry point that grants exactly
-- this power and checks `bd_can_manage()` first, the same shape as bd_people().
--
-- Doing it in one function also makes it atomic. The old client-side sequence
-- could create a project, fail to staff it, and leave a half-built shell with no
-- way to tell it apart from a real one.

/* ── 1. Template copying, shared ─────────────────────────────────────────── */

-- Extracted verbatim from apply_template_to_service so the handoff can reuse it.
-- Deliberately carries NO permission checks: it is not granted to anyone, and
-- each caller below is responsible for authorising its own path. Making it
-- internal-only is what lets two different entry points enforce two different
-- rules over the same copying logic.
CREATE OR REPLACE FUNCTION copy_template_into_service(
  p_project_service_id uuid,
  p_template_id uuid
)
RETURNS TABLE (stages_created integer, tasks_created integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_project   uuid;
  v_offset    integer;
  v_stage     record;
  v_new_stage uuid;
  v_stages    integer := 0;
  v_tasks     integer := 0;
  v_added     integer;
BEGIN
  SELECT ps.project_id INTO v_project
    FROM project_services ps WHERE ps.id = p_project_service_id;

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

REVOKE ALL ON FUNCTION copy_template_into_service(uuid, uuid) FROM public;

-- Same checks as before, same behaviour for its existing callers; only the
-- copying body has moved out.
CREATE OR REPLACE FUNCTION apply_template_to_service(p_project_service_id uuid, p_template_id uuid)
RETURNS TABLE (stages_created integer, tasks_created integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_project     uuid;
  v_service     uuid;
  v_team        uuid;
  v_tpl_service uuid;
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

  IF NOT can_manage_team_templates(v_team) THEN
    RAISE EXCEPTION 'Not allowed to use this team''s templates' USING ERRCODE = '42501';
  END IF;
  IF NOT (is_internal() AND (
            current_user_role() IN ('super_admin', 'admin', 'project_manager')
            OR has_feature('can_manage_projects')
            OR is_project_member(v_project))) THEN
    RAISE EXCEPTION 'Not allowed to add stages to this project' USING ERRCODE = '42501';
  END IF;

  IF v_tpl_service <> v_service THEN
    RAISE EXCEPTION 'This template builds a different service than the one selected'
      USING ERRCODE = 'P0032';
  END IF;

  RETURN QUERY SELECT * FROM copy_template_into_service(p_project_service_id, p_template_id);
END;
$$;

/* ── 2. The handoff itself ───────────────────────────────────────────────── */

-- p_services is the whole shape of the delivery side, in order:
--   [{"service_id": uuid, "template_id": uuid|null, "member_ids": [uuid, …]}, …]
-- Array order becomes project_services.order_index, so the tabs on the project
-- page read in the order the rep listed them.
CREATE OR REPLACE FUNCTION bd_handoff_to_project(
  p_lead_id      uuid,
  p_project_name text,
  p_manager_id   uuid,
  p_budget       numeric,
  p_services     jsonb,
  p_notes        text DEFAULT NULL,
  p_start_date   date DEFAULT NULL,
  p_deadline     date DEFAULT NULL
)
RETURNS TABLE (project_id uuid, client_id uuid, handoff_id uuid, stages_created integer, tasks_created integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lead        bd_leads;
  v_client      uuid;
  v_project     uuid;
  v_handoff     uuid;
  v_svc         jsonb;
  v_idx         integer := 0;
  v_ps          uuid;
  v_service_id  uuid;
  v_template    uuid;
  v_tpl_service uuid;
  v_first_slug  text;
  v_stages      integer := 0;
  v_tasks       integer := 0;
  v_copied      record;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;
  -- The one permission this function grants past: you may hand off if you run BD.
  IF NOT bd_can_manage() THEN
    RAISE EXCEPTION 'Not allowed to hand off leads' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_lead FROM bd_leads WHERE id = p_lead_id;
  IF v_lead.id IS NULL THEN
    RAISE EXCEPTION 'Lead not found' USING ERRCODE = 'P0040';
  END IF;

  IF p_project_name IS NULL OR btrim(p_project_name) = '' THEN
    RAISE EXCEPTION 'The project needs a name' USING ERRCODE = 'P0041';
  END IF;
  IF p_services IS NULL OR jsonb_array_length(p_services) = 0 THEN
    RAISE EXCEPTION 'Pick at least one service for this project' USING ERRCODE = 'P0042';
  END IF;

  -- Reuse a client with the same company name rather than creating a duplicate;
  -- a second lead from an existing account is the common case, not the rare one.
  SELECT c.id INTO v_client
    FROM clients c
   WHERE c.deleted_at IS NULL
     AND lower(btrim(c.name)) = lower(btrim(v_lead.company))
   LIMIT 1;

  IF v_client IS NULL THEN
    INSERT INTO clients (name, company, email, phone, industry, status, created_by)
    VALUES (btrim(v_lead.company), btrim(v_lead.company), NULLIF(btrim(COALESCE(v_lead.email, '')), ''),
            NULLIF(btrim(COALESCE(v_lead.phone, '')), ''), v_lead.industry, 'active', auth.uid())
    RETURNING id INTO v_client;
  END IF;

  INSERT INTO projects (name, client_id, manager_id, status, budget, start_date, deadline, description, created_by)
  VALUES (btrim(p_project_name), v_client, p_manager_id, 'todo', p_budget, p_start_date, p_deadline,
          NULLIF(btrim(COALESCE(p_notes, '')), ''), auth.uid())
  RETURNING id INTO v_project;

  FOR v_svc IN SELECT * FROM jsonb_array_elements(p_services)
  LOOP
    v_service_id := (v_svc ->> 'service_id')::uuid;
    v_template   := NULLIF(v_svc ->> 'template_id', '')::uuid;

    IF NOT EXISTS (SELECT 1 FROM services s WHERE s.id = v_service_id) THEN
      RAISE EXCEPTION 'Unknown service in the handoff' USING ERRCODE = 'P0043';
    END IF;

    INSERT INTO project_services (project_id, service_id, order_index, created_by)
    VALUES (v_project, v_service_id, v_idx, auth.uid())
    RETURNING id INTO v_ps;

    IF v_idx = 0 THEN
      SELECT s.slug INTO v_first_slug FROM services s WHERE s.id = v_service_id;
    END IF;
    v_idx := v_idx + 1;

    -- Staffing. Deactivated people are dropped rather than rejected: the picker
    -- already hides them, so a stale id here is a race, not a mistake worth
    -- failing the whole handoff over.
    INSERT INTO service_members (project_service_id, profile_id)
    SELECT v_ps, p.id
      FROM jsonb_array_elements_text(COALESCE(v_svc -> 'member_ids', '[]'::jsonb)) AS m(id)
      JOIN profiles p ON p.id = m.id::uuid
     WHERE p.is_active
    ON CONFLICT DO NOTHING;

    -- The template's team permission is deliberately not re-checked here. The
    -- picker only ever offers templates RLS already let this user read, and the
    -- authority being exercised is "may hand off", not "may edit that team's
    -- templates". The service match still is — copying a design pipeline into a
    -- development block would be silent nonsense.
    IF v_template IS NOT NULL THEN
      SELECT t.service_id INTO v_tpl_service FROM project_templates t WHERE t.id = v_template;
      IF v_tpl_service IS NULL THEN
        RAISE EXCEPTION 'Template not found' USING ERRCODE = 'P0031';
      END IF;
      IF v_tpl_service <> v_service_id THEN
        RAISE EXCEPTION 'This template builds a different service than the one selected'
          USING ERRCODE = 'P0032';
      END IF;
      SELECT * INTO v_copied FROM copy_template_into_service(v_ps, v_template);
      v_stages := v_stages + v_copied.stages_created;
      v_tasks  := v_tasks  + v_copied.tasks_created;
    END IF;
  END LOOP;

  INSERT INTO bd_handoffs (lead_id, service_slug, project_name, budget, manager_id, notes, project_id, by_id)
  VALUES (p_lead_id, v_first_slug, btrim(p_project_name), COALESCE(p_budget, 0), p_manager_id,
          NULLIF(btrim(COALESCE(p_notes, '')), ''), v_project, auth.uid())
  RETURNING id INTO v_handoff;

  project_id     := v_project;
  client_id      := v_client;
  handoff_id     := v_handoff;
  stages_created := v_stages;
  tasks_created  := v_tasks;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION bd_handoff_to_project(uuid, text, uuid, numeric, jsonb, text, date, date) FROM public;
GRANT EXECUTE ON FUNCTION bd_handoff_to_project(uuid, text, uuid, numeric, jsonb, text, date, date) TO authenticated;
