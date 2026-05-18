-- PROFILES table
-- team_id FK to teams is added in Phase 4 migration (teams table doesn't exist yet).
-- p_profiles_client_members policy added in clients migration (needs client_members table).
CREATE TABLE profiles (
  id              uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  email           text        NOT NULL UNIQUE,
  avatar_url      text,
  role            text        NOT NULL DEFAULT 'employee'
                                CHECK (role IN (
                                  'super_admin', 'admin', 'project_manager', 'team_lead',
                                  'employee', 'hr', 'finance',
                                  'client_owner', 'client_member'
                                )),
  service_type    text        CHECK (service_type IN ('design', 'development', 'marketing')),
  team_id         uuid,
  clickup_user_id text,
  xp_total        int         NOT NULL DEFAULT 0,
  level           int         NOT NULL DEFAULT 1 REFERENCES levels(level),
  is_active       boolean     NOT NULL DEFAULT true,
  last_seen_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- RLS HELPER FUNCTIONS
-- current_user_role / is_internal: LANGUAGE sql (profiles exists, body validated now).
-- is_project_member: LANGUAGE plpgsql (project_members added in a later migration).

CREATE OR REPLACE FUNCTION current_user_role() RETURNS text AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_internal() RETURNS boolean AS $$
  SELECT role NOT IN ('client_owner', 'client_member')
  FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_project_member(p_project_id uuid) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = p_project_id AND profile_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Trigger: recompute level when xp_total changes
CREATE OR REPLACE FUNCTION fn_sync_profile_level()
RETURNS TRIGGER AS $$
BEGIN
  NEW.level := (
    SELECT MAX(level) FROM levels WHERE xp_required <= NEW.xp_total
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profile_level_sync
  BEFORE UPDATE OF xp_total ON profiles
  FOR EACH ROW EXECUTE FUNCTION fn_sync_profile_level();

-- Trigger: sync service_type from team (no-op until teams table added in Phase 4)
CREATE OR REPLACE FUNCTION fn_sync_profile_service_type()
RETURNS TRIGGER AS $$
DECLARE
  v_team_service text;
BEGIN
  IF NEW.team_id IS NOT NULL THEN
    BEGIN
      SELECT service_type INTO v_team_service FROM teams WHERE id = NEW.team_id;
      IF v_team_service IS NOT NULL AND NEW.service_type IS DISTINCT FROM v_team_service THEN
        NEW.service_type := v_team_service;
      END IF;
    EXCEPTION WHEN undefined_table THEN
      NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profile_service_type
  BEFORE INSERT OR UPDATE OF team_id, service_type ON profiles
  FOR EACH ROW EXECUTE FUNCTION fn_sync_profile_service_type();

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_profiles_own ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY p_profiles_internal ON profiles FOR SELECT
  USING (is_internal() AND role NOT IN ('client_owner', 'client_member'));

CREATE POLICY p_profiles_self_update ON profiles FOR UPDATE
  USING     (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = current_user_role());

CREATE POLICY p_profiles_admin_update ON profiles FOR UPDATE
  USING (current_user_role() IN ('super_admin', 'admin'));
