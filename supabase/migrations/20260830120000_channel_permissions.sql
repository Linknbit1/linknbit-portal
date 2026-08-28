-- Channel permissions, and the end of "owner".
--
-- Owning a channel was a role stored on one membership row, and it decided three
-- unrelated things: who may rename the channel, who may move it between
-- categories, and who may set the room ringing with @everyone. It also meant a
-- channel could end up with nobody able to edit it once its creator left, and it
-- read as ownership of a conversation, which is not a thing a conversation has.
--
-- Replaced by two ideas, kept deliberately small. Discord has dozens of
-- overwrites; the ones that matter here are "who may post" and "who may change
-- the channel".
--
--   channels.post_policy          everyone, or managers only (an announcement
--                                 channel). DMs are always 'everyone'.
--   channel_members.can_manage    rename it, recategorise it, add and remove
--                                 people, change the policy, use @everyone.
--
-- Everyone who was an owner becomes a manager, so nobody loses anything today.

ALTER TABLE channels
  ADD COLUMN IF NOT EXISTS post_policy text NOT NULL DEFAULT 'everyone';

ALTER TABLE channels DROP CONSTRAINT IF EXISTS channels_post_policy_check;
ALTER TABLE channels
  ADD CONSTRAINT channels_post_policy_check CHECK (post_policy IN ('everyone', 'managers'));

COMMENT ON COLUMN channels.post_policy IS
  'Who may send: everyone in the channel, or only its managers. Ignored for DMs.';

ALTER TABLE channel_members
  ADD COLUMN IF NOT EXISTS can_manage boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN channel_members.can_manage IS
  'May rename the channel, move it between categories, manage members and set its posting policy. Replaces role_in_channel = owner.';

-- Nobody loses a power they had this morning.
UPDATE channel_members SET can_manage = true
 WHERE role_in_channel = 'owner' AND NOT can_manage;

-- ── The one question, in one place ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_channel_manager(p_channel_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT has_feature('can_manage_all_channels')
      OR EXISTS (
        SELECT 1 FROM channel_members cm
         WHERE cm.channel_id = p_channel_id
           AND cm.profile_id = auth.uid()
           AND cm.can_manage
      );
$$;

COMMENT ON FUNCTION public.is_channel_manager(uuid) IS
  'May the current user change this channel? Replaces is_channel_owner.';

REVOKE ALL ON FUNCTION public.is_channel_manager(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_channel_manager(uuid) TO authenticated;

-- is_channel_owner is kept as a thin alias for one release rather than dropped:
-- a deployed browser still has policies compiled against nothing, but any
-- migration or function referring to it keeps working while the front end moves.
CREATE OR REPLACE FUNCTION public.is_channel_owner(p_channel_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT is_channel_manager(p_channel_id);
$$;

-- ── Editing a channel ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS p_channels_update ON channels;
CREATE POLICY p_channels_update ON channels FOR UPDATE
  USING (is_channel_manager(id))
  WITH CHECK (is_channel_manager(id));

-- ── Posting ──────────────────────────────────────────────────────────────────
-- A DM has no managers and no announcements: both people always post.
DROP POLICY IF EXISTS p_messages_insert ON messages;
CREATE POLICY p_messages_insert ON messages FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND is_internal()
    AND is_channel_member(channel_id)
    AND (
      EXISTS (SELECT 1 FROM channels c
               WHERE c.id = channel_id
                 AND (c.kind = 'dm' OR c.post_policy = 'everyone'))
      OR is_channel_manager(channel_id)
    )
  );

-- ── Membership ───────────────────────────────────────────────────────────────
-- Was: yourself, can_manage_all_channels, or the owner.
DROP POLICY IF EXISTS p_channel_members_update ON channel_members;
CREATE POLICY p_channel_members_update ON channel_members FOR UPDATE
  USING (profile_id = auth.uid() OR is_channel_manager(channel_id))
  WITH CHECK (profile_id = auth.uid() OR is_channel_manager(channel_id));

DROP POLICY IF EXISTS p_channel_members_delete ON channel_members;
CREATE POLICY p_channel_members_delete ON channel_members FOR DELETE
  USING (profile_id = auth.uid() OR is_channel_manager(channel_id));

-- ── @everyone follows the manager flag ──────────────────────────────────────
-- Same function otherwise; only the owner test changes.
CREATE OR REPLACE FUNCTION fn_notify_new_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_author        text;
  v_kind          text;
  v_name          text;
  v_title         text;
  v_body          text;
  v_mentioned     uuid[];
  v_everyone      boolean;
  v_may_broadcast boolean;
  v_replied       uuid;
  v_team_ids      uuid[];
  v_team_people   uuid[];
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT kind, name INTO v_kind, v_name FROM channels WHERE id = NEW.channel_id;
  SELECT name INTO v_author FROM profiles WHERE id = NEW.author_id;
  v_author := coalesce(v_author, 'Someone');

  IF v_kind = 'channel' THEN
    v_title := v_author || ' in #' || coalesce(v_name, 'channel');
  ELSE
    v_title := v_author;
  END IF;

  v_body := trim(coalesce(NEW.body_text, ''));
  IF v_body = '' THEN
    v_body := 'Sent an attachment';
  ELSIF length(v_body) > 140 THEN
    v_body := left(v_body, 139) || '…';
  END IF;

  v_mentioned := fn_extract_mention_ids(NEW.body_doc);

  v_everyone := '00000000-0000-0000-0000-000000000000'::uuid = ANY (v_mentioned);
  IF v_everyone THEN
    SELECT has_feature('can_administer_channels')
           OR EXISTS (SELECT 1 FROM channel_members cm
                       WHERE cm.channel_id = NEW.channel_id
                         AND cm.profile_id = NEW.author_id
                         AND cm.can_manage)
      INTO v_may_broadcast;
    v_everyone := coalesce(v_may_broadcast, false);
  END IF;

  IF has_feature('can_mention_teams') THEN
    SELECT array_agg(t.id) INTO v_team_ids
      FROM teams t WHERE t.id = ANY (v_mentioned);
  END IF;

  IF v_team_ids IS NOT NULL AND array_length(v_team_ids, 1) > 0 THEN
    SELECT array_agg(DISTINCT tm.profile_id) INTO v_team_people
      FROM team_members tm
     WHERE tm.team_id = ANY (v_team_ids);
  END IF;
  v_team_people := coalesce(v_team_people, ARRAY[]::uuid[]);

  IF NEW.reply_to_id IS NOT NULL THEN
    SELECT m.author_id INTO v_replied
      FROM messages m
     WHERE m.id = NEW.reply_to_id
       AND m.author_id IS DISTINCT FROM NEW.author_id;
  END IF;

  PERFORM fn_notify(
    cm.profile_id, 'chat_mention',
    CASE WHEN v_kind = 'channel'
         THEN v_author || ' mentioned you in #' || coalesce(v_name, 'channel')
         ELSE v_author || ' mentioned you' END,
    v_body, 'channel', NEW.channel_id::text, NEW.author_id
  )
  FROM channel_members cm
  WHERE cm.channel_id = NEW.channel_id
    AND (v_everyone OR cm.profile_id = ANY (v_mentioned) OR cm.profile_id = ANY (v_team_people))
    AND cm.profile_id IS DISTINCT FROM NEW.author_id;

  IF v_replied IS NOT NULL
     AND NOT v_everyone
     AND NOT (v_replied = ANY (coalesce(v_mentioned, ARRAY[]::uuid[])))
     AND NOT (v_replied = ANY (v_team_people)) THEN
    PERFORM fn_notify(
      cm.profile_id, 'chat_reply',
      CASE WHEN v_kind = 'channel'
           THEN v_author || ' replied to you in #' || coalesce(v_name, 'channel')
           ELSE v_author || ' replied to you' END,
      v_body, 'channel', NEW.channel_id::text, NEW.author_id
    )
    FROM channel_members cm
    WHERE cm.channel_id = NEW.channel_id AND cm.profile_id = v_replied;
  END IF;

  PERFORM fn_notify(
    cm.profile_id, 'chat_message', v_title, v_body,
    'channel', NEW.channel_id::text, NEW.author_id
  )
  FROM channel_members cm
  WHERE cm.channel_id = NEW.channel_id
    AND cm.profile_id IS DISTINCT FROM NEW.author_id
    AND NOT cm.notifications_muted
    AND NOT v_everyone
    AND NOT (cm.profile_id = ANY (v_mentioned))
    AND NOT (cm.profile_id = ANY (v_team_people))
    AND cm.profile_id IS DISTINCT FROM v_replied;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION fn_notify_new_message() FROM public, anon, authenticated;
