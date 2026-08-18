-- @everyone: one mention that tags the whole channel.
--
-- It rides the existing mention plumbing rather than adding a parallel path.
-- The editor inserts a normal mention node whose id is the all-zero UUID, which
-- fn_extract_mention_ids already accepts (it filters on UUID shape, so a literal
-- 'everyone' would have been silently dropped — hence a sentinel that looks like
-- a uuid and can belong to no profile).
--
-- Consequence, deliberately matching Discord: an @everyone reaches people who
-- muted the conversation, because a tag always gets through. That makes it loud,
-- so it is limited to the people who run the channel — its owner, or a channel
-- administrator. Anyone else typing it gets an ordinary message: the text still
-- reads "@everyone", nobody is force-notified.

CREATE OR REPLACE FUNCTION public.fn_notify_new_message()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_author      text;
  v_kind        text;
  v_name        text;
  v_title       text;
  v_body        text;
  v_mentioned   uuid[];
  v_everyone    boolean;
  v_may_broadcast boolean;
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
    AND NOT (cm.profile_id = ANY (v_mentioned));

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fn_notify_new_message() IS
  'Notifies a channel about a new message. @everyone (the all-zero mention id) tags every member, but only from a channel owner or administrator.';
