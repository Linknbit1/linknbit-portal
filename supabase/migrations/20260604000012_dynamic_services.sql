-- ════════════════════════════════════════════════════════════════════
-- Dynamic Services — services become an admin-managed table instead of a
-- hardcoded CHECK list. Each service carries its own hex accent colour.
-- service_type columns now FK to services(slug); ON DELETE RESTRICT means a
-- service in use cannot be deleted (the UI also pre-checks and explains).
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE services (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL UNIQUE,
  slug       text        NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  color      text        NOT NULL CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  is_active  boolean     NOT NULL DEFAULT true,
  created_by uuid        REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_services_select ON services FOR SELECT USING (is_internal());
CREATE POLICY p_services_write  ON services FOR ALL
  USING     (current_user_role() IN ('super_admin','admin'))
  WITH CHECK (current_user_role() IN ('super_admin','admin'));

-- Seed the three original services (slugs match the existing service_type values).
INSERT INTO services (name, slug, color) VALUES
  ('Design',      'design',      '#A78BFA'),
  ('Development', 'development', '#22D3EE'),
  ('Marketing',  'marketing',   '#FBBF24');

-- Replace the static CHECK constraints with referential integrity to services.slug.
ALTER TABLE profiles DROP CONSTRAINT profiles_service_type_check;
ALTER TABLE teams    DROP CONSTRAINT teams_service_type_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_service_type_fkey
  FOREIGN KEY (service_type) REFERENCES services(slug) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE teams
  ADD CONSTRAINT teams_service_type_fkey
  FOREIGN KEY (service_type) REFERENCES services(slug) ON UPDATE CASCADE ON DELETE RESTRICT;
