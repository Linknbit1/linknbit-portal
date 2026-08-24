-- Corrective: make the two bd_handoff_to_project overloads impossible to confuse.
--
-- 20260824140000 left the 10-argument version with defaults on its last three
-- parameters, so it also accepted an 8-argument positional call — exactly the
-- shape the deprecated 8-argument wrapper takes. Postgres then refuses both:
--   ERROR 42725: function bd_handoff_to_project(...) is not unique
--
-- PostgREST calls RPCs with *named* arguments, where the two overloads are
-- already distinguishable (the new one's p_client_id / p_client_name have no
-- defaults, so an old bundle's call can only match the wrapper). But leaving a
-- positionally ambiguous pair behind is a trap for anything calling this from
-- SQL, so the defaults come off: the new function now takes exactly 10
-- arguments, the wrapper 5 to 8, and the ranges no longer overlap.
--
-- The app always sends all ten, so this changes no caller.
--
-- Postgres refuses to drop parameter defaults through CREATE OR REPLACE, so the
-- 10-argument version is dropped and recreated. Safe: it was introduced minutes
-- earlier in 20260824140000 and no deployed bundle calls it yet. The wrapper —
-- the one an old bundle *does* reach — is untouched.

DROP FUNCTION IF EXISTS bd_handoff_to_project(uuid, text, uuid, numeric, jsonb, uuid, text, text, date, date);

CREATE FUNCTION bd_handoff_to_project(
  p_lead_id      uuid,
  p_project_name text,
  p_manager_id   uuid,
  p_budget       numeric,
  p_services     jsonb,
  p_client_id    uuid,
  p_client_name  text,
  p_notes        text,
  p_start_date   date,
  p_deadline     date
)
RETURNS TABLE (project_id uuid, client_id uuid, handoff_id uuid, stages_created integer, tasks_created integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lead        bd_leads;
  v_client      uuid;
  v_name        text;
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

  /* ── The client ──────────────────────────────────────────────────────────
     Three ways in, in order of how much the rep told us:
       1. they picked an existing client   → use it
       2. they named one                   → match that name, else create it
       3. neither (the old 8-arg wrapper)  → fall back to the lead's company  */
  IF p_client_id IS NOT NULL THEN
    SELECT c.id INTO v_client FROM clients c WHERE c.id = p_client_id AND c.deleted_at IS NULL;
    IF v_client IS NULL THEN
      RAISE EXCEPTION 'That client no longer exists' USING ERRCODE = 'P0044';
    END IF;
  ELSE
    v_name := btrim(COALESCE(NULLIF(btrim(COALESCE(p_client_name, '')), ''), v_lead.company));
    IF v_name = '' THEN
      RAISE EXCEPTION 'The client needs a name' USING ERRCODE = 'P0045';
    END IF;

    SELECT c.id INTO v_client
      FROM clients c
     WHERE c.deleted_at IS NULL AND lower(btrim(c.name)) = lower(v_name)
     LIMIT 1;

    IF v_client IS NULL THEN
      INSERT INTO clients (name, company, email, phone, industry, status, created_by)
      VALUES (v_name, NULLIF(btrim(COALESCE(v_lead.company, '')), ''),
              NULLIF(btrim(COALESCE(v_lead.email, '')), ''),
              NULLIF(btrim(COALESCE(v_lead.phone, '')), ''),
              v_lead.industry, 'active', auth.uid())
      RETURNING id INTO v_client;
    END IF;
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

    INSERT INTO service_members (project_service_id, profile_id)
    SELECT v_ps, p.id
      FROM jsonb_array_elements_text(COALESCE(v_svc -> 'member_ids', '[]'::jsonb)) AS m(id)
      JOIN profiles p ON p.id = m.id::uuid
     WHERE p.is_active
    ON CONFLICT DO NOTHING;

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

REVOKE ALL ON FUNCTION bd_handoff_to_project(uuid, text, uuid, numeric, jsonb, uuid, text, text, date, date) FROM public;
GRANT EXECUTE ON FUNCTION bd_handoff_to_project(uuid, text, uuid, numeric, jsonb, uuid, text, text, date, date) TO authenticated;
