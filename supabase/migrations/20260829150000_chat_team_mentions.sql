-- Tagging a team, and a permission deciding who may.
--
-- @everyone already works by putting a sentinel uuid in the mention list, so
-- team tags need no new mechanism at all: a team's own id IS a uuid, it belongs
-- to no profile, and fn_extract_mention_ids already returns anything uuid-shaped.
-- The notifier just has to recognise one and expand it to that team's people.
--
-- Narrower than @everyone by construction: a team tag only ever reaches members
-- of that team who are also in the conversation. It is still loud enough to want
-- a gate, because like every tag it gets past a muted conversation, so it takes
-- its own permission rather than riding on can_administer_channels. Someone who
-- runs a team should be able to call that team without being handed the power to
-- ring every channel in the portal.
--
-- Anyone without the permission still SEES "@development" in their message. It
-- simply notifies nobody, exactly as an unauthorised @everyone already behaves.

INSERT INTO permissions (key, label, description, category, sort_order, is_hidden)
VALUES ('can_mention_teams', 'Mention teams in chat',
        'Tag a whole team with @team-name, notifying its members even in a muted conversation.',
        'Chat', 20, false)
ON CONFLICT (key) DO NOTHING;

-- The roles that already answer for groups of people.
INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, 'can_mention_teams'
  FROM roles r
 WHERE r.slug IN ('super_admin', 'admin', 'hr', 'project_manager', 'team_lead')
ON CONFLICT DO NOTHING;

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

  -- Any tagged ids that are teams rather than people. Only resolved when the
  -- author is allowed to tag a team; otherwise the ids stay unmatched and the
  -- message is ordinary text mentioning nobody.
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

  -- Being tagged always reaches you, muted conversation or not, whether the tag
  -- named you, your team, or the whole room.
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
    AND (v_everyone
         OR cm.profile_id = ANY (v_mentioned)
         OR cm.profile_id = ANY (v_team_people))
    AND cm.profile_id IS DISTINCT FROM NEW.author_id;

  IF v_replied IS NOT NULL
     AND NOT v_everyone
     AND NOT (v_replied = ANY (coalesce(v_mentioned, ARRAY[]::uuid[])))
     AND NOT (v_replied = ANY (v_team_people)) THEN
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
    AND NOT (cm.profile_id = ANY (v_team_people))
    AND cm.profile_id IS DISTINCT FROM v_replied;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION fn_notify_new_message() FROM public, anon, authenticated;
