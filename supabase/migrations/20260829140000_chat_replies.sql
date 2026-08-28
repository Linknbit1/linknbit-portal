-- Replying to a specific message.
--
-- A busy channel is several conversations interleaved, and without a reply the
-- only way to say which one you are answering is to quote it by hand or hope
-- the timing is obvious. One nullable column carries it.
--
-- ON DELETE SET NULL rather than CASCADE: deleting the message somebody
-- answered must not delete the answer. The reply survives and simply stops
-- pointing anywhere, which the UI renders as "the original was deleted".
--
-- Read receipts need nothing here. channel_members.last_read_at already records
-- how far each member has read, and members can already read each other's rows,
-- so "who has seen this" is a comparison the client can make with data it holds.
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages (reply_to_id)
  WHERE reply_to_id IS NOT NULL;

COMMENT ON COLUMN messages.reply_to_id IS
  'The message this one answers. Null when it stands alone, or when the original was deleted.';

-- ── A reply to you reaches you ───────────────────────────────────────────────
-- Answering someone is as direct as tagging them, so it goes through the same
-- door: past a muted conversation, and only once. Everything else here is the
-- live function unchanged, @everyone broadcast handling included.
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

  -- Who may set the room ringing.
  v_everyone := '00000000-0000-0000-0000-000000000000'::uuid = ANY (v_mentioned);
  IF v_everyone THEN
    SELECT has_feature('can_administer_channels')
           OR EXISTS (SELECT 1 FROM channel_members cm
                       WHERE cm.channel_id = NEW.channel_id
                         AND cm.profile_id = NEW.author_id
                         AND cm.role_in_channel = 'owner')
      INTO v_may_broadcast;
    v_everyone := coalesce(v_may_broadcast, false);
  END IF;

  -- Who wrote the message being answered, when this is a reply and they are not
  -- following up on their own message.
  IF NEW.reply_to_id IS NOT NULL THEN
    SELECT m.author_id INTO v_replied
      FROM messages m
     WHERE m.id = NEW.reply_to_id
       AND m.author_id IS DISTINCT FROM NEW.author_id;
  END IF;

  -- Being tagged always reaches you, muted conversation or not. @everyone from
  -- someone entitled to it counts as tagging each member.
  PERFORM fn_notify(
    cm.profile_id,
    'chat_mention',
    CASE WHEN v_kind = 'channel'
         THEN v_author || ' mentioned you in #' || coalesce(v_name, 'channel')
         ELSE v_author || ' mentioned you' END,
    v_body,
    'channel',
    NEW.channel_id::text,
    NEW.author_id
  )
  FROM channel_members cm
  WHERE cm.channel_id = NEW.channel_id
    AND (v_everyone OR cm.profile_id = ANY (v_mentioned))
    AND cm.profile_id IS DISTINCT FROM NEW.author_id;

  -- The reply itself, unless they were tagged in it too and have already heard.
  IF v_replied IS NOT NULL
     AND NOT v_everyone
     AND NOT (v_replied = ANY (coalesce(v_mentioned, ARRAY[]::uuid[]))) THEN
    PERFORM fn_notify(
      cm.profile_id,
      'chat_reply',
      CASE WHEN v_kind = 'channel'
           THEN v_author || ' replied to you in #' || coalesce(v_name, 'channel')
           ELSE v_author || ' replied to you' END,
      v_body,
      'channel',
      NEW.channel_id::text,
      NEW.author_id
    )
    FROM channel_members cm
    WHERE cm.channel_id = NEW.channel_id
      AND cm.profile_id = v_replied;
  END IF;

  -- Everyone else in the room who still wants the chatter. Nobody is left here
  -- when @everyone fired, so a tag never lands twice.
  PERFORM fn_notify(
    cm.profile_id,
    'chat_message',
    v_title,
    v_body,
    'channel',
    NEW.channel_id::text,
    NEW.author_id
  )
  FROM channel_members cm
  WHERE cm.channel_id = NEW.channel_id
    AND cm.profile_id IS DISTINCT FROM NEW.author_id
    AND NOT cm.notifications_muted
    AND NOT v_everyone
    AND NOT (cm.profile_id = ANY (v_mentioned))
    AND cm.profile_id IS DISTINCT FROM v_replied;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION fn_notify_new_message() FROM public, anon, authenticated;

-- ── Marking a conversation unread ────────────────────────────────────────────
-- The counterpart to fn_mark_channel_read: winds last_read_at back to just
-- before a message so the conversation shows as unread again. For the common
-- "I cannot deal with this now" case, which otherwise means leaving it open.
CREATE OR REPLACE FUNCTION public.fn_mark_channel_unread(p_channel_id uuid, p_before_message_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_at timestamptz;
BEGIN
  IF NOT is_channel_member(p_channel_id) THEN
    RAISE EXCEPTION 'Not a member of this conversation';
  END IF;

  IF p_before_message_id IS NULL THEN
    -- No anchor: unread from the newest message in the room.
    SELECT max(created_at) INTO v_at FROM messages
     WHERE channel_id = p_channel_id AND deleted_at IS NULL;
  ELSE
    SELECT created_at INTO v_at FROM messages WHERE id = p_before_message_id;
  END IF;

  IF v_at IS NULL THEN RETURN; END IF;

  UPDATE channel_members
     SET last_read_at = v_at - interval '1 millisecond'
   WHERE channel_id = p_channel_id
     AND profile_id = auth.uid();
END;
$$;

COMMENT ON FUNCTION public.fn_mark_channel_unread(uuid, uuid) IS
  'Winds the caller''s read marker back so a conversation shows unread again, from a given message or from the latest.';

REVOKE ALL ON FUNCTION public.fn_mark_channel_unread(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.fn_mark_channel_unread(uuid, uuid) TO authenticated;
