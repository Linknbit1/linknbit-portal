-- ════════════════════════════════════════════════════════════════════
-- CHAT DELETIONS → AUDIT LOG (new `chat` module)
--
-- Chat was the one destructive surface with no trail: a message could be
-- removed and nothing recorded who removed it or what it said. Two events are
-- captured here:
--   • messages.deleted_at flipping null → not null  (the app's only delete path)
--   • a whole channel being deleted for everyone     (destroys the history)
--
-- Dedicated capture functions rather than arms inside fn_audit_capture(): the
-- fact that matters here — whose message was it, and was the deleter its author
-- — has no analogue in the generic heuristics, and the message body needs
-- truncating before it reaches the log.
--
-- Deliberately NOT audited:
--   • hard DELETEs on messages. There is no DELETE policy on the table, so the
--     only way rows disappear is the channels cascade — a row-level trigger
--     there would write one audit entry per message and bury the log.
--   • hideChannel / leaving a conversation. Both are per-user list changes;
--     no history is lost, so there is nothing to answer for.
-- ════════════════════════════════════════════════════════════════════

-- ── Message deleted ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_audit_message_delete()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor        uuid := auth.uid();
  v_actor_kind   text := 'user';
  v_actor_name   text;
  v_actor_role   text;
  v_subject      uuid := OLD.author_id;
  v_subject_name text;
  v_kind         text;
  v_name         text;
  v_members      text;
  v_target       text;
  v_body         text;
  v_preview      text;
  v_action       text;
  v_severity     text;
  v_flagged      boolean := false;
  v_flag_reason  text;
  v_summary      text;
BEGIN
  SELECT c.kind, c.name INTO v_kind, v_name FROM channels c WHERE c.id = NEW.channel_id;

  -- Where it happened. DMs carry no name, so they are labelled by participants —
  -- "who was in the room" is the part an admin needs to make sense of the entry.
  IF v_kind <> 'channel' THEN
    SELECT string_agg(p.name, ' & ' ORDER BY p.name)
      INTO v_members
      FROM channel_members cm
      JOIN profiles p ON p.id = cm.profile_id
     WHERE cm.channel_id = NEW.channel_id;
  END IF;

  v_target := CASE
    WHEN v_kind = 'channel'   THEN '#' || COALESCE(v_name, 'channel')
    WHEN v_kind = 'group_dm'  THEN 'Group: ' || COALESCE(NULLIF(v_name, ''), v_members, 'group chat')
    ELSE 'DM: ' || COALESCE(v_members, 'direct message')
  END;

  -- Enough of the body to identify the message, never the whole thread's worth.
  v_body := regexp_replace(COALESCE(OLD.body_text, ''), '\s+', ' ', 'g');
  v_preview := CASE
    WHEN length(v_body) > 160 THEN left(v_body, 160) || '…'
    ELSE NULLIF(v_body, '')
  END;

  IF v_actor IS NULL THEN
    v_actor_kind := 'system';
    v_action := 'message.deleted';
    v_severity := 'warning';
  ELSIF v_actor = v_subject THEN
    v_action := 'message.deleted';
    -- Pulling back a typo seconds after sending is not an event worth an amber
    -- row; deleting your own older message — one people have already read and
    -- acted on — is. Same noise problem the task tables hit.
    v_severity := CASE
      WHEN now() - OLD.created_at <= interval '5 minutes' THEN 'info'
      ELSE 'warning'
    END;
  ELSE
    -- Only a can_delete_any_message holder can reach this branch: someone
    -- erasing another person's words. Always flagged, always alerted.
    v_action := 'message.deleted_by_moderator';
    v_severity := 'danger';
    v_flagged := true;
  END IF;

  IF v_actor IS NOT NULL THEN
    SELECT p.name, p.role INTO v_actor_name, v_actor_role FROM profiles p WHERE p.id = v_actor;
  END IF;
  v_actor_name := COALESCE(v_actor_name, 'System');
  v_actor_role := COALESCE(v_actor_role, 'system');

  IF v_subject IS NOT NULL THEN
    SELECT p.name INTO v_subject_name FROM profiles p WHERE p.id = v_subject;
  END IF;

  IF v_flagged THEN
    v_flag_reason := format('%s deleted a message written by %s in %s.',
      v_actor_name, COALESCE(v_subject_name, 'someone else'), v_target);
  END IF;

  v_summary := CASE
    WHEN v_subject IS NULL OR v_actor = v_subject
      THEN format('%s deleted their own message in %s', v_actor_name, v_target)
    ELSE format('%s deleted a message from %s in %s',
      v_actor_name, COALESCE(v_subject_name, 'someone'), v_target)
  END;

  INSERT INTO audit_log(
    module, table_name, record_id, operation, action, severity,
    actor_id, actor_name, actor_role, actor_kind,
    subject_id, subject_name, target_name, summary,
    old_values, new_values, changed_fields, flagged, flag_reason, context)
  VALUES (
    'chat', 'messages', OLD.id, 'UPDATE', v_action, v_severity,
    v_actor, v_actor_name, v_actor_role, v_actor_kind,
    v_subject, v_subject_name, v_target, v_summary,
    -- body_doc is the rich-text mirror of body_text: large, and redundant here.
    to_jsonb(OLD) - 'body_doc', to_jsonb(NEW) - 'body_doc', ARRAY['deleted_at'],
    v_flagged, v_flag_reason,
    jsonb_build_object(
      'channel_id',      NEW.channel_id,
      'conversation',    v_target,
      'message_sent_at', OLD.created_at,
      'deleted_text',    v_preview));

  IF v_severity = 'danger' THEN
    PERFORM fn_notify(
      p.id, 'audit_alert',
      'Message deleted by someone else',
      v_flag_reason,
      'audit_alert', OLD.id::text, v_actor)
    FROM profiles p
    WHERE p.is_active AND p.role IN ('super_admin', 'admin');
  END IF;

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION fn_audit_message_delete() IS
  'Writes a chat-module audit_log row when a message is soft-deleted; danger + admin alert when the deleter is not the author.';

DROP TRIGGER IF EXISTS trg_audit_message_delete ON messages;
CREATE TRIGGER trg_audit_message_delete
  AFTER UPDATE OF deleted_at ON messages
  FOR EACH ROW
  WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
  EXECUTE FUNCTION fn_audit_message_delete();

-- ── Channel deleted for everyone ────────────────────────────────────────────────
-- BEFORE DELETE, not AFTER: the message count has to be read while the cascade
-- still has rows to delete.
CREATE OR REPLACE FUNCTION fn_audit_channel_delete()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor       uuid := auth.uid();
  v_actor_kind  text := 'user';
  v_actor_name  text;
  v_actor_role  text;
  v_members     text;
  v_member_cnt  int;
  v_target      text;
  v_messages    int;
  v_summary     text;
  v_flag_reason text;
BEGIN
  SELECT count(*) INTO v_messages FROM messages m WHERE m.channel_id = OLD.id;

  SELECT string_agg(p.name, ', ' ORDER BY p.name), count(*)
    INTO v_members, v_member_cnt
    FROM channel_members cm
    JOIN profiles p ON p.id = cm.profile_id
   WHERE cm.channel_id = OLD.id;

  v_target := CASE
    WHEN OLD.kind = 'channel' THEN '#' || COALESCE(OLD.name, 'channel')
    ELSE COALESCE(NULLIF(OLD.name, ''), v_members, 'a conversation')
  END;

  IF v_actor IS NOT NULL THEN
    SELECT p.name, p.role INTO v_actor_name, v_actor_role FROM profiles p WHERE p.id = v_actor;
  ELSE
    v_actor_kind := 'system';
  END IF;
  v_actor_name := COALESCE(v_actor_name, 'System');
  v_actor_role := COALESCE(v_actor_role, 'system');

  v_summary := format('%s deleted %s for everyone (%s message(s) destroyed)',
    v_actor_name, v_target, v_messages);
  v_flag_reason := format(
    'A whole conversation was permanently deleted: %s message(s) and their attachments are gone for all %s member(s).',
    v_messages, COALESCE(v_member_cnt, 0));

  INSERT INTO audit_log(
    module, table_name, record_id, operation, action, severity,
    actor_id, actor_name, actor_role, actor_kind,
    target_name, summary, old_values, flagged, flag_reason, context)
  VALUES (
    'chat', 'channels', OLD.id, 'DELETE', 'channel.deleted', 'danger',
    v_actor, v_actor_name, v_actor_role, v_actor_kind,
    v_target, v_summary, to_jsonb(OLD), true, v_flag_reason,
    jsonb_build_object(
      'channel_kind',  OLD.kind,
      'members',       COALESCE(v_members, '—'),
      'messages_lost', v_messages));

  PERFORM fn_notify(
    p.id, 'audit_alert',
    'Conversation deleted for everyone',
    v_summary,
    'audit_alert', OLD.id::text, v_actor)
  FROM profiles p
  WHERE p.is_active AND p.role IN ('super_admin', 'admin');

  RETURN OLD;
END;
$$;

COMMENT ON FUNCTION fn_audit_channel_delete() IS
  'Writes one chat-module audit_log row when a channel is hard-deleted, recording how much history went with it.';

DROP TRIGGER IF EXISTS trg_audit_channel_delete ON channels;
CREATE TRIGGER trg_audit_channel_delete
  BEFORE DELETE ON channels
  FOR EACH ROW EXECUTE FUNCTION fn_audit_channel_delete();
