-- Private channels + role-based membership.
--
-- 1. is_private marks a channel confidential: only someone who can manage
--    channels may add people to it. (Visibility was already member-only —
--    p_channels_select has always required is_channel_member — so this closes
--    the remaining gap, which was a non-admin owner inviting people in.)
--
-- 2. channel_roles grants a channel to a whole role, Discord-style. Rather than
--    resolving roles at read time, holders are materialised into
--    channel_members. That keeps channel_members the single source of truth, so
--    last_read_at, notifications_muted, and hidden_at keep working for everyone.
--
-- 3. added_via_role records WHY someone is a member. A member added because of
--    their role is removed automatically when that role changes; someone added
--    individually (NULL) never is. Without this distinction, a stale member
--    would keep access to a confidential channel after moving teams.

ALTER TABLE channels ADD COLUMN is_private boolean NOT NULL DEFAULT false;

ALTER TABLE channel_members ADD COLUMN added_via_role text;

COMMENT ON COLUMN channel_members.added_via_role IS
  'Role that granted this membership; NULL when the person was added individually.';

CREATE TABLE channel_roles (
  channel_id uuid        NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  role       text        NOT NULL CHECK (role IN (
                           'super_admin', 'admin', 'project_manager', 'team_lead',
                           'employee', 'hr', 'finance'
                         )),
  created_by uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (channel_id, role)
);

CREATE INDEX idx_channel_roles_role ON channel_roles (role);

ALTER TABLE channel_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_channel_roles_select ON channel_roles FOR SELECT
  USING (is_channel_member(channel_id));

-- Only channel managers grant roles — this is bulk access, so it is deliberately
-- narrower than adding one person.
CREATE POLICY p_channel_roles_write ON channel_roles FOR ALL
  USING     (has_feature('can_manage_all_channels') OR is_channel_owner(channel_id))
  WITH CHECK (has_feature('can_manage_all_channels') OR is_channel_owner(channel_id));

-- ── Membership management on private channels ────────────────────────────────
-- Replaces the phase-1 policy: on a private channel, self-join and group-DM
-- growth are both disallowed, so membership is strictly curated.
DROP POLICY IF EXISTS p_channel_members_insert ON channel_members;
CREATE POLICY p_channel_members_insert ON channel_members FOR INSERT
  WITH CHECK (
    is_internal()
    AND (
      has_feature('can_manage_all_channels')
      OR is_channel_owner(channel_id)
      OR (
        NOT EXISTS (SELECT 1 FROM channels c WHERE c.id = channel_id AND c.is_private)
        AND (
          profile_id = auth.uid()
          OR (
            EXISTS (SELECT 1 FROM channels c WHERE c.id = channel_id AND c.kind = 'group_dm')
            AND is_channel_member(channel_id)
          )
        )
      )
    )
  );

-- ── Materialising a role into members ────────────────────────────────────────

-- Adds every active internal holder of p_role to the channel. Existing members
-- are left alone: a manual membership must not be downgraded to a role-derived
-- one, or removing the role later would evict someone who was invited directly.
CREATE OR REPLACE FUNCTION fn_sync_channel_role(p_channel_id uuid, p_role text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO channel_members (channel_id, profile_id, role_in_channel, added_via_role)
  SELECT p_channel_id, p.id, 'member', p_role
  FROM profiles p
  WHERE p.role = p_role
    AND p.is_active
    AND p.role NOT IN ('client_owner', 'client_member')
  ON CONFLICT (channel_id, profile_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION fn_add_channel_role(p_channel_id uuid, p_role text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (has_feature('can_manage_all_channels') OR is_channel_owner(p_channel_id)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  INSERT INTO channel_roles (channel_id, role, created_by)
  VALUES (p_channel_id, p_role, auth.uid())
  ON CONFLICT (channel_id, role) DO NOTHING;

  PERFORM fn_sync_channel_role(p_channel_id, p_role);
END;
$$;

-- Removing a role evicts only the members it brought in, never anyone added by
-- hand (added_via_role IS NULL).
CREATE OR REPLACE FUNCTION fn_remove_channel_role(p_channel_id uuid, p_role text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (has_feature('can_manage_all_channels') OR is_channel_owner(p_channel_id)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  DELETE FROM channel_roles WHERE channel_id = p_channel_id AND role = p_role;

  DELETE FROM channel_members
  WHERE channel_id = p_channel_id
    AND added_via_role = p_role
    AND role_in_channel <> 'owner';
END;
$$;

-- ── Keeping role-derived membership honest ───────────────────────────────────
-- When someone's role changes they gain the channels their new role grants and
-- lose the ones they only had through the old role. Deactivating an account
-- removes its role-derived memberships too.
CREATE OR REPLACE FUNCTION fn_sync_member_channel_roles() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role OR NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    -- Drop memberships granted by a role this person no longer holds.
    DELETE FROM channel_members cm
    WHERE cm.profile_id = NEW.id
      AND cm.added_via_role IS NOT NULL
      AND cm.role_in_channel <> 'owner'
      AND (NOT NEW.is_active OR cm.added_via_role IS DISTINCT FROM NEW.role);

    IF NEW.is_active AND NEW.role NOT IN ('client_owner', 'client_member') THEN
      INSERT INTO channel_members (channel_id, profile_id, role_in_channel, added_via_role)
      SELECT cr.channel_id, NEW.id, 'member', cr.role
      FROM channel_roles cr
      WHERE cr.role = NEW.role
      ON CONFLICT (channel_id, profile_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_member_channel_roles ON profiles;
CREATE TRIGGER trg_sync_member_channel_roles
  AFTER UPDATE OF role, is_active ON profiles
  FOR EACH ROW EXECUTE FUNCTION fn_sync_member_channel_roles();

REVOKE ALL ON FUNCTION fn_add_channel_role(uuid, text) FROM public, anon;
REVOKE ALL ON FUNCTION fn_remove_channel_role(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION fn_add_channel_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_remove_channel_role(uuid, text) TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE channel_roles;
