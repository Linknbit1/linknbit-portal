-- Notify a conversation's members when a new message arrives.
--
-- Reuses the existing pipeline rather than building a parallel one: fn_notify()
-- writes the bell row, fn_notifications_gate() drops it for anyone who turned
-- the 'chat_message' type off, and trg_push_notification then fires web push.
-- So the bell, the preferences screen, and push all work with no extra wiring.
--
-- Two mute levels, deliberately: notification_preferences turns chat off
-- everywhere, while channel_members.notifications_muted silences one noisy
-- conversation — the column existed unused until now.

CREATE OR REPLACE FUNCTION fn_notify_new_message() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_author  text;
  v_kind    text;
  v_name    text;
  v_title   text;
  v_body    text;
BEGIN
  -- Nothing to announce for a message that arrives already deleted.
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
    AND NOT cm.notifications_muted;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_message ON messages;
CREATE TRIGGER trg_notify_new_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION fn_notify_new_message();

-- Lets a member silence a single conversation without touching their global
-- chat preference.
CREATE OR REPLACE FUNCTION fn_set_channel_muted(p_channel_id uuid, p_muted boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE channel_members
  SET notifications_muted = p_muted
  WHERE channel_id = p_channel_id AND profile_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION fn_set_channel_muted(uuid, boolean) FROM public;
REVOKE ALL ON FUNCTION fn_set_channel_muted(uuid, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION fn_set_channel_muted(uuid, boolean) TO authenticated;
