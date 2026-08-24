-- BD projects become team-scoped: you see a campaign if you are on it.
--
-- Until now `p_bd_projects_select` was `bd_can_view()` — every BD project, to
-- everyone in BD. `BdProjectsPage` carried a filter that looked like it fixed
-- this ("a rep sees the campaigns they own or are a member of"), but it was
-- bypassed by `canSeeAll`, which is `can_manage_bd` — a permission every BD rep
-- holds. So it never applied, and it was client-side regardless: the rows still
-- reached the browser.
--
-- ── Why a new permission ────────────────────────────────────────────────────
-- BD Manager and Business Development hold *identical* permission sets
-- (can_manage_bd + can_view_bd), so no existing check can tell a BD lead from a
-- rep — `bd_can_manage()` as an override would leave every rep seeing
-- everything, which is the bug. `can_view_all_bd_projects` is the first thing
-- that separates them. Super Admin picks it up through `administrator`
-- (has_feature treats that as a wildcard); Admin does not hold `administrator`,
-- so it is granted explicitly.

INSERT INTO permissions (key, label, description, category, sort_order, is_hidden)
VALUES (
  'can_view_all_bd_projects',
  'View all BD projects',
  'See every BD campaign, not only the ones you are on. Without it a person sees a campaign only if they own it, created it, or were added to its team.',
  'Business Development', 27, false
)
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, 'can_view_all_bd_projects' FROM roles r WHERE r.slug IN ('bd_manager', 'admin')
ON CONFLICT DO NOTHING;

/* ── The visibility rule, in one place ───────────────────────────────────── */

-- SECURITY DEFINER matters twice here: it reads `bd_project_members` and
-- `bd_projects`, both of which are themselves protected by policies that call
-- this function. Running as the owner bypasses those policies and so avoids
-- infinite recursion — the same reason delivery's `is_project_member` is
-- defined this way.
CREATE OR REPLACE FUNCTION can_view_bd_project(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p_project_id IS NOT NULL AND (
    has_feature('can_view_all_bd_projects')
    OR EXISTS (
      SELECT 1 FROM bd_projects p
       WHERE p.id = p_project_id
         AND (p.owner_id = auth.uid() OR p.created_by = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM bd_project_members m
       WHERE m.project_id = p_project_id AND m.profile_id = auth.uid()
    )
  );
$$;

REVOKE ALL ON FUNCTION can_view_bd_project(uuid) FROM public;
-- Policy helpers must keep EXECUTE for authenticated: a USING clause is
-- evaluated as the calling role, and a revoked helper locks the table shut.
GRANT EXECUTE ON FUNCTION can_view_bd_project(uuid) TO authenticated;

/* ── The creator is always on the team ───────────────────────────────────── */

-- Stated as a rule rather than left to the form, so a campaign created by any
-- route — the modal, a script, a future import — cannot end up invisible to the
-- person who just made it. The owner is added for the same reason: handing a
-- campaign to someone must not require remembering to add them as well.
CREATE OR REPLACE FUNCTION bd_project_seed_members()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO bd_project_members (project_id, profile_id)
  SELECT NEW.id, pid
    FROM (VALUES (NEW.created_by), (NEW.owner_id)) AS v(pid)
   WHERE pid IS NOT NULL
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bd_project_seed_members ON bd_projects;
CREATE TRIGGER trg_bd_project_seed_members
AFTER INSERT ON bd_projects
FOR EACH ROW EXECUTE FUNCTION bd_project_seed_members();

-- Same rule when a campaign changes hands.
CREATE OR REPLACE FUNCTION bd_project_owner_joins()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.owner_id IS NOT NULL AND NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    INSERT INTO bd_project_members (project_id, profile_id)
    VALUES (NEW.id, NEW.owner_id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bd_project_owner_joins ON bd_projects;
CREATE TRIGGER trg_bd_project_owner_joins
AFTER UPDATE OF owner_id ON bd_projects
FOR EACH ROW EXECUTE FUNCTION bd_project_owner_joins();

/* ── Policies ────────────────────────────────────────────────────────────── */

DROP POLICY IF EXISTS p_bd_projects_select ON bd_projects;
CREATE POLICY p_bd_projects_select ON bd_projects
FOR SELECT USING (bd_can_view() AND can_view_bd_project(id));

-- Writing still needs the same standing as before, but you can no longer edit or
-- delete a campaign you are not allowed to see.
DROP POLICY IF EXISTS p_bd_projects_update ON bd_projects;
CREATE POLICY p_bd_projects_update ON bd_projects
FOR UPDATE USING (can_view_bd_project(id) AND (bd_can_manage() OR owner_id = auth.uid() OR created_by = auth.uid()))
WITH CHECK (bd_can_manage() OR owner_id = auth.uid() OR created_by = auth.uid());

DROP POLICY IF EXISTS p_bd_projects_delete ON bd_projects;
CREATE POLICY p_bd_projects_delete ON bd_projects
FOR DELETE USING (can_view_bd_project(id) AND (bd_can_manage() OR owner_id = auth.uid() OR created_by = auth.uid()));

-- The roster of a campaign you cannot see is part of what you cannot see.
DROP POLICY IF EXISTS p_bd_project_members_select ON bd_project_members;
CREATE POLICY p_bd_project_members_select ON bd_project_members
FOR SELECT USING (bd_can_view() AND can_view_bd_project(project_id));

-- Tasks follow their campaign, so the Tasks board stops listing work from
-- campaigns someone was deliberately left off — naming them in the process.
-- Two deliberate exceptions: a task on no campaign is department work and stays
-- visible, and a task assigned to you, or raised by you, is always yours to see
-- even if you were never added to the campaign it belongs to.
DROP POLICY IF EXISTS p_bd_tasks_select ON bd_tasks;
CREATE POLICY p_bd_tasks_select ON bd_tasks
FOR SELECT USING (
  bd_can_view() AND (
    project_id IS NULL
    OR can_view_bd_project(project_id)
    OR assignee_id = auth.uid()
    OR created_by = auth.uid()
  )
);

/* ── The FOR ALL trap ────────────────────────────────────────────────────── */

-- `p_bd_project_members_write` was declared FOR ALL, and FOR ALL includes
-- SELECT. Policies are OR'd, so its `bd_can_manage()` arm handed every BD rep
-- read access to every roster no matter what the SELECT policy above says — the
-- scoping tested as working for projects and tasks while silently doing nothing
-- here. Split into the three verbs it was actually meant to cover, so read is
-- governed only by the read policy.
DROP POLICY IF EXISTS p_bd_project_members_write ON bd_project_members;

CREATE POLICY p_bd_project_members_insert ON bd_project_members
FOR INSERT WITH CHECK (
  bd_can_manage() OR EXISTS (
    SELECT 1 FROM bd_projects p
     WHERE p.id = bd_project_members.project_id
       AND (p.owner_id = auth.uid() OR p.created_by = auth.uid())
  )
);

CREATE POLICY p_bd_project_members_update ON bd_project_members
FOR UPDATE USING (
  can_view_bd_project(project_id) AND (
    bd_can_manage() OR EXISTS (
      SELECT 1 FROM bd_projects p
       WHERE p.id = bd_project_members.project_id
         AND (p.owner_id = auth.uid() OR p.created_by = auth.uid())
    )
  )
);

CREATE POLICY p_bd_project_members_delete ON bd_project_members
FOR DELETE USING (
  can_view_bd_project(project_id) AND (
    bd_can_manage() OR EXISTS (
      SELECT 1 FROM bd_projects p
       WHERE p.id = bd_project_members.project_id
         AND (p.owner_id = auth.uid() OR p.created_by = auth.uid())
    )
  )
);

/* ── created_by is authorship, not "last editor" ─────────────────────────── */

-- `saveBdProject` upserts with `created_by: actorId`, which on an *edit* rewrote
-- authorship to whoever pressed Save. Harmless while everyone saw everything;
-- now that visibility keys partly off `created_by`, it would let an editor grant
-- themselves permanent access to a campaign and strip it from the person who
-- made it. Pinned here rather than only in the client, because the column means
-- "who created this" and no caller should be able to say otherwise.
CREATE OR REPLACE FUNCTION bd_project_pin_created_by()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.created_by := OLD.created_by;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bd_project_pin_created_by ON bd_projects;
CREATE TRIGGER trg_bd_project_pin_created_by
BEFORE UPDATE ON bd_projects
FOR EACH ROW EXECUTE FUNCTION bd_project_pin_created_by();
