-- Creating a lead or a campaign for someone else was impossible: the INSERT
-- policies only accepted a row whose owner_id was the caller, so a rep who
-- picked a teammate in the Owner field got
-- "new row violates row-level security policy for table bd_projects".
-- Meetings and tasks already treat created_by as a second steward; leads and
-- projects were the two that missed it. Bring them in line, so the person who
-- files the record keeps the rights they need to finish filing it — the member
-- list is written in the same save, and that write is owner-gated too.

-- created_by is what those rights hang on, and saveBdProject/saveBdMeeting are
-- upserts that resend it on every edit — without this the last editor would
-- quietly become the creator and the real creator would lose the row.
-- COALESCE, not a flat OLD, so a legacy row with a NULL creator can still be
-- backfilled once.
CREATE OR REPLACE FUNCTION fn_bd_freeze_created_by() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.created_by := COALESCE(OLD.created_by, NEW.created_by);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bd_leads_freeze_creator    BEFORE UPDATE ON bd_leads    FOR EACH ROW EXECUTE FUNCTION fn_bd_freeze_created_by();
CREATE TRIGGER trg_bd_projects_freeze_creator BEFORE UPDATE ON bd_projects FOR EACH ROW EXECUTE FUNCTION fn_bd_freeze_created_by();
CREATE TRIGGER trg_bd_meetings_freeze_creator BEFORE UPDATE ON bd_meetings FOR EACH ROW EXECUTE FUNCTION fn_bd_freeze_created_by();

-- ── Leads ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS p_bd_leads_insert ON bd_leads;
CREATE POLICY p_bd_leads_insert ON bd_leads FOR INSERT
  WITH CHECK (bd_can_view() AND (bd_can_manage() OR owner_id = auth.uid() OR created_by = auth.uid()));

DROP POLICY IF EXISTS p_bd_leads_update ON bd_leads;
CREATE POLICY p_bd_leads_update ON bd_leads FOR UPDATE
  USING      (bd_can_manage() OR owner_id = auth.uid() OR created_by = auth.uid())
  WITH CHECK (bd_can_manage() OR owner_id = auth.uid() OR created_by = auth.uid());

DROP POLICY IF EXISTS p_bd_leads_delete ON bd_leads;
CREATE POLICY p_bd_leads_delete ON bd_leads FOR DELETE
  USING (bd_can_manage() OR owner_id = auth.uid() OR created_by = auth.uid());

-- ── Projects ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS p_bd_projects_insert ON bd_projects;
CREATE POLICY p_bd_projects_insert ON bd_projects FOR INSERT
  WITH CHECK (bd_can_view() AND (bd_can_manage() OR owner_id = auth.uid() OR created_by = auth.uid()));

DROP POLICY IF EXISTS p_bd_projects_update ON bd_projects;
CREATE POLICY p_bd_projects_update ON bd_projects FOR UPDATE
  USING      (bd_can_manage() OR owner_id = auth.uid() OR created_by = auth.uid())
  WITH CHECK (bd_can_manage() OR owner_id = auth.uid() OR created_by = auth.uid());

DROP POLICY IF EXISTS p_bd_projects_delete ON bd_projects;
CREATE POLICY p_bd_projects_delete ON bd_projects FOR DELETE
  USING (bd_can_manage() OR owner_id = auth.uid() OR created_by = auth.uid());

-- The campaign's member list is replaced in the same save as the campaign, so
-- it has to accept the creator too or the create still half-fails.
DROP POLICY IF EXISTS p_bd_project_members_write ON bd_project_members;
CREATE POLICY p_bd_project_members_write ON bd_project_members FOR ALL
  USING (
    bd_can_manage()
    OR EXISTS (SELECT 1 FROM bd_projects p WHERE p.id = project_id AND (p.owner_id = auth.uid() OR p.created_by = auth.uid()))
  )
  WITH CHECK (
    bd_can_manage()
    OR EXISTS (SELECT 1 FROM bd_projects p WHERE p.id = project_id AND (p.owner_id = auth.uid() OR p.created_by = auth.uid()))
  );
