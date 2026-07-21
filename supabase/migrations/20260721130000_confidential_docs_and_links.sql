-- Confidential documents + external document links (Google Docs / Sheets / Drive).
--
-- Two additions to `attachments`:
--   1. kind='link' rows carry a link_url instead of a storage_path, so a Google Doc
--      lives alongside uploaded files in the same Files tab (one list, one RLS story).
--   2. is_confidential rows are visible ONLY to roles holding can_view_confidential,
--      enforced in RLS — not just hidden in the UI. Clients never see them at all.
--
-- can_view_confidential is seeded identically to can_view_budget (every internal role
-- except employee) so it matches today's "budget-level" expectation, but it is a
-- separate switch: "sees money" and "sees secret documents" can diverge later.

-- ── The flag ──────────────────────────────────────────────────────────────────
INSERT INTO role_feature_flags (role, feature_key, enabled) VALUES
  ('super_admin',     'can_view_confidential', true),
  ('admin',           'can_view_confidential', true),
  ('hr',              'can_view_confidential', true),
  ('project_manager', 'can_view_confidential', true),
  ('team_lead',       'can_view_confidential', true),
  ('finance',         'can_view_confidential', true),
  ('employee',        'can_view_confidential', false)
ON CONFLICT (role, feature_key) DO UPDATE SET enabled = EXCLUDED.enabled;

-- ── Schema ────────────────────────────────────────────────────────────────────
ALTER TABLE attachments
  ADD COLUMN IF NOT EXISTS kind            text    NOT NULL DEFAULT 'file',
  ADD COLUMN IF NOT EXISTS link_url        text,
  ADD COLUMN IF NOT EXISTS is_confidential boolean NOT NULL DEFAULT false;

-- Link rows have no object in storage, so storage_path can no longer be mandatory.
ALTER TABLE attachments ALTER COLUMN storage_path DROP NOT NULL;

ALTER TABLE attachments DROP CONSTRAINT IF EXISTS attachments_kind_check;
ALTER TABLE attachments ADD CONSTRAINT attachments_kind_check
  CHECK (kind IN ('file', 'link'));

-- Exactly one payload: a file has a storage_path, a link has a link_url.
ALTER TABLE attachments DROP CONSTRAINT IF EXISTS attachments_payload_check;
ALTER TABLE attachments ADD CONSTRAINT attachments_payload_check CHECK (
  (kind = 'file' AND storage_path IS NOT NULL)
  OR (kind = 'link' AND link_url IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_attachments_project_kind ON attachments (project_id, kind);

-- ── RLS: confidential rows require the capability ─────────────────────────────
-- was: is_internal() AND (role IN (...) OR is_project_member(project_id))
DROP POLICY IF EXISTS p_attachments_internal_select ON attachments;
CREATE POLICY p_attachments_internal_select ON attachments FOR SELECT
  USING (
    is_internal()
    AND (
      current_user_role() = ANY (ARRAY['super_admin','admin','project_manager','finance'])
      OR is_project_member(project_id)
    )
    AND (NOT is_confidential OR has_feature('can_view_confidential'))
  );

-- Clients must never see a confidential item, regardless of client_visible.
DROP POLICY IF EXISTS p_attachments_client_select ON attachments;
CREATE POLICY p_attachments_client_select ON attachments FOR SELECT
  USING (
    (NOT is_internal())
    AND client_visible
    AND NOT is_confidential
    AND EXISTS (
      SELECT 1 FROM projects p
       WHERE p.id = attachments.project_id
         AND p.client_visible
         AND p.client_id IN (
           SELECT client_members.client_id FROM client_members
            WHERE client_members.profile_id = auth.uid()
         )
    )
  );

-- Marking something confidential (or un-marking it) requires the capability too,
-- otherwise anyone with edit rights could quietly declassify a document.
CREATE OR REPLACE FUNCTION fn_guard_attachment_confidential()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_confidential AND NOT has_feature('can_view_confidential') THEN
      RAISE EXCEPTION 'forbidden_confidential';
    END IF;
  ELSIF NEW.is_confidential IS DISTINCT FROM OLD.is_confidential
        AND NOT has_feature('can_view_confidential') THEN
    RAISE EXCEPTION 'forbidden_confidential';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_attachment_confidential ON attachments;
CREATE TRIGGER trg_guard_attachment_confidential
  BEFORE INSERT OR UPDATE ON attachments
  FOR EACH ROW EXECUTE FUNCTION fn_guard_attachment_confidential();
