-- Chat, phase 1: channels + channel_members. A "channel" and a "dm" are the
-- same underlying row shape (see `kind`) so messages/reactions/attachments/
-- mentions/unread-tracking/realtime all work identically for both — only
-- creation rules and membership-growth rules differ, enforced below.

CREATE TABLE channels (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  kind          text        NOT NULL CHECK (kind IN ('channel', 'dm', 'group_dm')),
  name          text,
  description   text,
  is_archived   boolean     NOT NULL DEFAULT false,
  created_by    uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT channels_named_kind CHECK (kind <> 'channel' OR name IS NOT NULL)
);

CREATE TRIGGER trg_channels_touch
  BEFORE UPDATE ON channels
  FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

CREATE TABLE channel_members (
  channel_id           uuid        NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  profile_id           uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_in_channel      text        NOT NULL DEFAULT 'member' CHECK (role_in_channel IN ('owner', 'member')),
  last_read_at         timestamptz NOT NULL DEFAULT now(),
  notifications_muted  boolean     NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (channel_id, profile_id)
);

CREATE INDEX idx_channel_members_profile ON channel_members (profile_id);

-- ── RLS helper functions ─────────────────────────────────────────────
-- Both wrap their same-table existence check inside a function (rather than
-- inlining an EXISTS(...) directly in a channel_members policy) so the
-- bare column references inside the function body can't collide with the
-- calling policy's implicit row context.

CREATE OR REPLACE FUNCTION is_channel_member(p_channel_id uuid) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM channel_members
    WHERE channel_id = p_channel_id AND profile_id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION is_channel_owner(p_channel_id uuid) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM channel_members
    WHERE channel_id = p_channel_id AND profile_id = auth.uid() AND role_in_channel = 'owner'
  );
END;
$$;

REVOKE ALL ON FUNCTION is_channel_member(uuid) FROM public;
REVOKE ALL ON FUNCTION is_channel_member(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION is_channel_member(uuid) TO authenticated;

REVOKE ALL ON FUNCTION is_channel_owner(uuid) FROM public;
REVOKE ALL ON FUNCTION is_channel_owner(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION is_channel_owner(uuid) TO authenticated;

-- ── RLS: channels ────────────────────────────────────────────────────
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_channels_select ON channels FOR SELECT
  USING (is_channel_member(id));

-- Anyone internal may start a dm/group_dm; only can_create_channels roles
-- may create a real (named) channel.
CREATE POLICY p_channels_insert ON channels FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND is_internal()
    AND (kind <> 'channel' OR has_feature('can_create_channels'))
  );

-- Rename/archive: the channel's own owner, or an admin who can manage any channel.
CREATE POLICY p_channels_update ON channels FOR UPDATE
  USING     (has_feature('can_manage_all_channels') OR is_channel_owner(id))
  WITH CHECK (has_feature('can_manage_all_channels') OR is_channel_owner(id));

-- Hard delete is admin-only; owners can archive (an UPDATE) but never hard-delete
-- history.
CREATE POLICY p_channels_delete ON channels FOR DELETE
  USING (has_feature('can_manage_all_channels'));

-- ── RLS: channel_members ─────────────────────────────────────────────
ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_channel_members_select ON channel_members FOR SELECT
  USING (is_channel_member(channel_id));

-- Self-join always allowed (accepting your own membership row on create);
-- owners/admins can add others; group_dm members can grow the group
-- (Discord-style); a plain 1:1 dm never grows past its original 2 members.
CREATE POLICY p_channel_members_insert ON channel_members FOR INSERT
  WITH CHECK (
    is_internal()
    AND (
      profile_id = auth.uid()
      OR has_feature('can_manage_all_channels')
      OR is_channel_owner(channel_id)
      OR (
        EXISTS (SELECT 1 FROM channels c WHERE c.id = channel_id AND c.kind = 'group_dm')
        AND is_channel_member(channel_id)
      )
    )
  );

-- Row-level: broad enough to allow self-service columns (last_read_at,
-- notifications_muted) for yourself, or owner/admin management of anyone's
-- row. Column-level: a trigger below blocks role_in_channel changes unless
-- privileged, since RLS alone can't restrict specific columns.
CREATE POLICY p_channel_members_update ON channel_members FOR UPDATE
  USING (
    profile_id = auth.uid()
    OR has_feature('can_manage_all_channels')
    OR is_channel_owner(channel_id)
  )
  WITH CHECK (
    profile_id = auth.uid()
    OR has_feature('can_manage_all_channels')
    OR is_channel_owner(channel_id)
  );

-- Leave (self) or be removed (owner/admin).
CREATE POLICY p_channel_members_delete ON channel_members FOR DELETE
  USING (
    profile_id = auth.uid()
    OR has_feature('can_manage_all_channels')
    OR is_channel_owner(channel_id)
  );

CREATE OR REPLACE FUNCTION fn_guard_channel_member_role() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role_in_channel IS DISTINCT FROM OLD.role_in_channel
     AND NOT (has_feature('can_manage_all_channels') OR is_channel_owner(OLD.channel_id)) THEN
    RAISE EXCEPTION 'forbidden_channel_role_change';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_channel_member_role
  BEFORE UPDATE OF role_in_channel ON channel_members
  FOR EACH ROW EXECUTE FUNCTION fn_guard_channel_member_role();
