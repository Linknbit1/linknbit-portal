-- Chat: one "Channel administrator" permission, and admin oversight of channels.
--
-- 1. can_create_channels + can_delete_any_message collapse into
--    can_administer_channels. They were two keys for one job — running the
--    chat — and they disagreed about who holds it (create had five roles,
--    delete had three). Now it is one row in the catalogue that the Permissions
--    screen can hand to whichever roles you want.
--
-- 2. Channels, their members and their messages become visible to holders of
--    can_manage_all_channels (Admin, Super Admin) even where they are not a
--    member. Until now every read was gated on is_channel_member() alone, so an
--    admin simply could not see a channel they had not joined.
--
--    1:1 DMs are deliberately excluded. Two people's direct messages stay
--    between them — the same reason a third member cannot be inserted into a DM
--    (fn_guard_dm_membership). Named channels and group chats are workplace
--    conversations and are in scope; a private DM is not.
--
--    Non-members without the permission see nothing new: the membership test is
--    still the first branch of every policy.

-- ── 1. The merged permission ────────────────────────────────────────────────
INSERT INTO permissions (key, label, description, category, sort_order)
VALUES (
  'can_administer_channels',
  'Channel administrator',
  'Create channels and delete anyone''s message. The chat moderation role.',
  'Chat',
  (SELECT COALESCE(MIN(sort_order), 10) FROM permissions WHERE key IN ('can_create_channels','can_delete_any_message'))
)
ON CONFLICT (key) DO UPDATE
SET label = EXCLUDED.label, description = EXCLUDED.description, category = EXCLUDED.category;

-- Every role that held either of the old keys keeps the capability.
INSERT INTO role_permissions (role_id, permission_key)
SELECT DISTINCT rp.role_id, 'can_administer_channels'
  FROM role_permissions rp
 WHERE rp.permission_key IN ('can_create_channels', 'can_delete_any_message')
ON CONFLICT (role_id, permission_key) DO NOTHING;

-- Named explicitly too, so the intended five hold it even on a fresh database.
INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, 'can_administer_channels'
  FROM roles r
 WHERE r.name IN ('Super Admin', 'Admin', 'HR', 'Project Manager', 'Team Lead')
ON CONFLICT (role_id, permission_key) DO NOTHING;

-- ── 2. Repoint the policies that used the old keys ──────────────────────────
DROP POLICY IF EXISTS p_channels_insert ON channels;
CREATE POLICY p_channels_insert ON channels FOR INSERT
  WITH CHECK (is_internal() AND has_feature('can_administer_channels'));

-- Author edits their own text; a channel administrator may only soft-delete
-- (the body-column trigger fn_guard_message_edit still blocks rewrites).
DROP POLICY IF EXISTS p_messages_update ON messages;
CREATE POLICY p_messages_update ON messages FOR UPDATE
  USING     (author_id = auth.uid() OR has_feature('can_administer_channels'))
  WITH CHECK (author_id = auth.uid() OR has_feature('can_administer_channels'));

DROP POLICY IF EXISTS p_message_attachments_delete ON message_attachments;
CREATE POLICY p_message_attachments_delete ON message_attachments FOR DELETE
  USING (uploader_id = auth.uid() OR has_feature('can_administer_channels'));

-- ── 3. Admin oversight of channels (never 1:1 DMs) ──────────────────────────
-- One helper so the three policies cannot drift apart.
CREATE OR REPLACE FUNCTION public.can_oversee_channel(p_channel_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT has_feature('can_manage_all_channels')
     AND EXISTS (SELECT 1 FROM channels c WHERE c.id = p_channel_id AND c.kind <> 'dm');
$$;

COMMENT ON FUNCTION public.can_oversee_channel(uuid) IS
  'True when the caller may read a channel they are not in: channel admins, on anything except a 1:1 DM.';

DROP POLICY IF EXISTS p_channels_select ON channels;
CREATE POLICY p_channels_select ON channels FOR SELECT
  USING (is_channel_member(id) OR can_oversee_channel(id));

DROP POLICY IF EXISTS p_channel_members_select ON channel_members;
CREATE POLICY p_channel_members_select ON channel_members FOR SELECT
  USING (is_channel_member(channel_id) OR can_oversee_channel(channel_id));

DROP POLICY IF EXISTS p_messages_select ON messages;
CREATE POLICY p_messages_select ON messages FOR SELECT
  USING (is_channel_member(channel_id) OR can_oversee_channel(channel_id));

-- fn_create_channel is SECURITY DEFINER and checks the key itself, so dropping
-- the old one without this would refuse every channel creation. Patched in
-- place by name rather than retyped, so no other branch can drift.
DO $patch$
DECLARE v_def text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_def
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'fn_create_channel';

  IF v_def IS NULL OR position('can_create_channels' in v_def) = 0 THEN
    RAISE EXCEPTION 'fn_create_channel not found, or no longer checks can_create_channels';
  END IF;

  EXECUTE replace(v_def, 'can_create_channels', 'can_administer_channels');
END
$patch$;

-- ── 4. Retire the old keys ──────────────────────────────────────────────────
DELETE FROM role_permissions WHERE permission_key IN ('can_create_channels', 'can_delete_any_message');
DELETE FROM permissions      WHERE key            IN ('can_create_channels', 'can_delete_any_message');
