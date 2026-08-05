-- Chat: @mentions and "you were added to a channel".
--
-- Two gaps this closes:
--   1. The composer has had @-mention UI since the chat launch, but nothing ever
--      notified the person tagged — mentions only existed for project comments.
--   2. Muting a conversation silenced it completely, including mentions of you.
--      A mute now means "stop the chatter", not "hide my name".
--
-- Mentions are read server-side out of messages.body_doc (the TipTap document)
-- rather than trusted from the client, so the notification can't be spoofed or
-- skipped by a caller that writes the row directly.

-- ── Pull mention node ids out of a rich-text document ───────────────────────────
-- TipTap stores them as { "type": "mention", "attrs": { "id": "<uuid>" } } at any
-- depth. The uuid filter guards against a malformed or hand-written doc.
CREATE OR REPLACE FUNCTION fn_extract_mention_ids(p_doc jsonb) RETURNS uuid[]
LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE(array_agg(DISTINCT x.v::uuid), '{}'::uuid[])
  FROM (
    SELECT jsonb_array_elements_text(
             jsonb_path_query_array(p_doc, '$.** ? (@.type == "mention").attrs.id')
           ) AS v
  ) x
  WHERE x.v ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
$$;

-- ── New message: mentions first, then everyone else who hasn't muted ────────────
CREATE OR REPLACE FUNCTION fn_notify_new_message() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_author    text;
  v_kind      text;
  v_name      text;
  v_title     text;
  v_body      text;
  v_mentioned uuid[];
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT kind, name INTO v_kind, v_name FROM channels WHERE id = NEW.channel_id;
  SELECT name INTO v_author FROM profiles WHERE id = NEW.author_id;
  v_author := coalesce(v_author, 'Someone');

  -- In a channel the room matters as much as the sender; in a DM it doesn't.
  IF v_kind = 'channel' THEN
    v_title := v_author || ' in #' || coalesce(v_name, 'channel');
  ELSE
    v_title := v_author;
  END IF;

  -- body_text is the plain-text mirror of the rich body, so it's already safe
  -- to show in a push notification.
  v_body := trim(coalesce(NEW.body_text, ''));
  IF v_body = '' THEN
    v_body := 'Sent an attachment';
  ELSIF length(v_body) > 140 THEN
    v_body := left(v_body, 139) || '…';
  END IF;

  v_mentioned := fn_extract_mention_ids(NEW.body_doc);

  -- Being tagged always reaches you, muted conversation or not.
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
    AND cm.profile_id = ANY (v_mentioned)
    AND cm.profile_id IS DISTINCT FROM NEW.author_id;

  -- Everyone else in the room who still wants the chatter. Mentioned people are
  -- excluded so a tag never lands twice.
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
    AND NOT (cm.profile_id = ANY (v_mentioned));

  RETURN NEW;
END;
$$;

-- ── Added to a channel ──────────────────────────────────────────────────────────
-- Skips 1:1 DMs: both members are written at creation, and the first message is
-- the real signal there. Named channels and group DMs are a genuine invitation.
CREATE OR REPLACE FUNCTION fn_notify_channel_member_added() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_actor    text;
  v_kind     text;
  v_name     text;
  v_label    text;
BEGIN
  SELECT kind, name INTO v_kind, v_name FROM channels WHERE id = NEW.channel_id;
  IF v_kind = 'dm' THEN RETURN NULL; END IF;

  SELECT name INTO v_actor FROM profiles WHERE id = v_actor_id;
  v_actor := coalesce(v_actor, 'Someone');
  v_label := CASE WHEN v_kind = 'channel' THEN '#' || coalesce(v_name, 'a channel')
                  ELSE coalesce(v_name, 'a group chat') END;

  PERFORM fn_notify(
    NEW.profile_id,
    'chat_added',
    'Added to ' || v_label,
    v_actor || ' added you to ' || v_label,
    'channel',
    NEW.channel_id::text,
    v_actor_id
  );

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_channel_member_added ON channel_members;
CREATE TRIGGER trg_notify_channel_member_added
  AFTER INSERT ON channel_members
  FOR EACH ROW EXECUTE FUNCTION fn_notify_channel_member_added();
