-- ════════════════════════════════════════════════════════════════════
-- Projects + project_members. service_type FKs to services(slug) (dynamic
-- services convention). project_members satisfies the is_project_member()
-- helper declared back in the profiles migration.
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE projects (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text        NOT NULL,
  description    text,
  client_id      uuid        REFERENCES clients(id) ON DELETE SET NULL,
  service_type   text        NOT NULL
                               REFERENCES services(slug) ON UPDATE CASCADE ON DELETE RESTRICT,
  status         text        NOT NULL DEFAULT 'in_progress'
                               CHECK (status IN ('in_progress', 'blocked', 'awaiting_client', 'completed', 'on_hold')),
  manager_id     uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  team_id        uuid        REFERENCES teams(id) ON DELETE SET NULL,
  start_date     date,
  deadline       date,
  budget         numeric,
  progress       int         NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  client_visible boolean     NOT NULL DEFAULT false,
  internal_note  text,
  created_by     uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz,
  deleted_by     uuid        REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_projects_client   ON projects (client_id);
CREATE INDEX idx_projects_manager  ON projects (manager_id);
CREATE INDEX idx_projects_status   ON projects (status);
CREATE INDEX idx_projects_service  ON projects (service_type);

CREATE TRIGGER trg_projects_touch
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

CREATE TABLE project_members (
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  profile_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_in_project text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, profile_id)
);

CREATE INDEX idx_project_members_profile ON project_members (profile_id);

-- ── RLS ──────────────────────────────────────────────────────────────
ALTER TABLE projects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- Admin/PM/finance see all; other internal users see projects they belong
-- to. Soft-deleted rows only visible to admins (the "trash" view).
CREATE POLICY p_projects_internal_select ON projects FOR SELECT
  USING (
    is_internal()
    AND (deleted_at IS NULL OR current_user_role() IN ('super_admin', 'admin'))
    AND (
      current_user_role() IN ('super_admin', 'admin', 'project_manager', 'finance')
      OR is_project_member(id)
    )
  );

-- Clients see client-visible projects of their own client.
CREATE POLICY p_projects_client_select ON projects FOR SELECT
  USING (
    NOT is_internal()
    AND client_visible
    AND deleted_at IS NULL
    AND client_id IN (SELECT client_id FROM client_members WHERE profile_id = auth.uid())
  );

CREATE POLICY p_projects_insert ON projects FOR INSERT
  WITH CHECK (current_user_role() IN ('super_admin', 'admin', 'project_manager'));

CREATE POLICY p_projects_update ON projects FOR UPDATE
  USING     (current_user_role() IN ('super_admin', 'admin', 'project_manager'))
  WITH CHECK (current_user_role() IN ('super_admin', 'admin', 'project_manager'));

-- project_members: any internal user can read; admin/PM manage.
CREATE POLICY p_project_members_select ON project_members FOR SELECT
  USING (is_internal());

CREATE POLICY p_project_members_write ON project_members FOR ALL
  USING     (current_user_role() IN ('super_admin', 'admin', 'project_manager'))
  WITH CHECK (current_user_role() IN ('super_admin', 'admin', 'project_manager'));
