-- ════════════════════════════════════════════════════════════════════
-- Clients — minimal CRM for the Projects module. A project belongs to a
-- client. client_members links client-portal users (client_owner /
-- client_member) to a client for client-visibility RLS (portal wiring
-- deferred, but the schema + policies are ready).
-- ════════════════════════════════════════════════════════════════════

-- Shared updated_at trigger, reused by all Projects-module tables.
CREATE OR REPLACE FUNCTION fn_touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE clients (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name               text        NOT NULL,
  company            text,
  email              text,
  phone              text,
  industry           text,
  account_manager_id uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  status             text        NOT NULL DEFAULT 'active'
                                   CHECK (status IN ('active', 'inactive', 'on_hold')),
  internal_note      text,
  created_by         uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  deleted_at         timestamptz,
  deleted_by         uuid        REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_clients_account_manager ON clients (account_manager_id);

CREATE TRIGGER trg_clients_touch
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

CREATE TABLE client_members (
  client_id  uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (client_id, profile_id)
);

-- ── RLS ──────────────────────────────────────────────────────────────
ALTER TABLE clients        ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_members ENABLE ROW LEVEL SECURITY;

-- Internal users see all clients; soft-deleted only visible to admins.
CREATE POLICY p_clients_internal_select ON clients FOR SELECT
  USING (
    is_internal()
    AND (deleted_at IS NULL OR current_user_role() IN ('super_admin', 'admin'))
  );

-- Client-portal users see only their own client record.
CREATE POLICY p_clients_client_select ON clients FOR SELECT
  USING (
    NOT is_internal()
    AND id IN (SELECT client_id FROM client_members WHERE profile_id = auth.uid())
  );

CREATE POLICY p_clients_insert ON clients FOR INSERT
  WITH CHECK (current_user_role() IN ('super_admin', 'admin', 'project_manager'));

CREATE POLICY p_clients_update ON clients FOR UPDATE
  USING     (current_user_role() IN ('super_admin', 'admin', 'project_manager'))
  WITH CHECK (current_user_role() IN ('super_admin', 'admin', 'project_manager'));

-- client_members: internal manage, members can read their own linkage.
CREATE POLICY p_client_members_select ON client_members FOR SELECT
  USING (is_internal() OR profile_id = auth.uid());

CREATE POLICY p_client_members_write ON client_members FOR ALL
  USING     (current_user_role() IN ('super_admin', 'admin', 'project_manager'))
  WITH CHECK (current_user_role() IN ('super_admin', 'admin', 'project_manager'));
