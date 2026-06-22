-- ════════════════════════════════════════════════════════════════════
-- Designations — an admin/HR-managed list of employee job designations
-- (e.g. "Software Engineer", "SEO Specialist"). Mirrors the dynamic
-- `services` table shape, minus the accent colour. Each employee gets one
-- designation (profiles.designation_id, added in the next migration).
-- Unlike services (super_admin/admin only), HR may also manage designations.
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE designations (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL UNIQUE,
  slug       text        NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  is_active  boolean     NOT NULL DEFAULT true,
  created_by uuid        REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE designations ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_designations_select ON designations FOR SELECT USING (is_internal());
CREATE POLICY p_designations_write  ON designations FOR ALL
  USING     (current_user_role() IN ('super_admin','admin','hr'))
  WITH CHECK (current_user_role() IN ('super_admin','admin','hr'));

-- Starter designations so the panel isn't empty.
INSERT INTO designations (name, slug) VALUES
  ('Software Engineer',     'software-engineer'),
  ('Designer',             'designer'),
  ('Marketing Specialist', 'marketing-specialist'),
  ('SEO Specialist',       'seo-specialist');
