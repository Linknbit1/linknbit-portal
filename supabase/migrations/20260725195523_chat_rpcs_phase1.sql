-- Chat, phase 1 RPCs. These write to channels/channel_members directly (as
-- SECURITY DEFINER), so each enforces its own authorization manually rather
-- than relying on the calling table's RLS.

-- Find the existing 1:1 dm between the caller and p_other_profile_id, or
-- create it. Both members are plain 'member' — a 2-person dm has nothing
-- to "own"/manage, unlike a real channel or a group_dm.
CREATE OR REPLACE FUNCTION fn_get_or_create_dm(p_other_profile_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_channel_id uuid;
  v_me         uuid := auth.uid();
BEGIN
  IF NOT is_internal() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_other_profile_id IS NULL OR p_other_profile_id = v_me THEN
    RAISE EXCEPTION 'invalid_dm_target';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_other_profile_id AND role NOT IN ('client_owner', 'client_member')
  ) THEN
    RAISE EXCEPTION 'invalid_dm_target';
  END IF;

  SELECT cm1.channel_id INTO v_channel_id
  FROM channel_members cm1
  JOIN channel_members cm2 ON cm2.channel_id = cm1.channel_id
  JOIN channels c ON c.id = cm1.channel_id
  WHERE c.kind = 'dm'
    AND cm1.profile_id = v_me
    AND cm2.profile_id = p_other_profile_id
  LIMIT 1;

  IF v_channel_id IS NOT NULL THEN
    RETURN v_channel_id;
  END IF;

  INSERT INTO channels (kind, created_by) VALUES ('dm', v_me) RETURNING id INTO v_channel_id;
  INSERT INTO channel_members (channel_id, profile_id, role_in_channel) VALUES
    (v_channel_id, v_me, 'member'),
    (v_channel_id, p_other_profile_id, 'member');

  RETURN v_channel_id;
END;
$$;

-- Bumps the caller's own last_read_at for a channel — the basis for unread
-- counts (Slack-style; no per-message read receipts).
CREATE OR REPLACE FUNCTION fn_mark_channel_read(p_channel_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE channel_members
  SET last_read_at = now()
  WHERE channel_id = p_channel_id AND profile_id = auth.uid();
END;
$$;

-- One round trip for every channel the caller belongs to with unread
-- messages — feeds both the nav badge total and per-conversation badges.
CREATE OR REPLACE FUNCTION fn_chat_unread_counts()
RETURNS TABLE (channel_id uuid, unread_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.channel_id, count(*)::bigint AS unread_count
  FROM messages m
  JOIN channel_members cm ON cm.channel_id = m.channel_id AND cm.profile_id = auth.uid()
  WHERE m.created_at > cm.last_read_at
    AND m.author_id IS DISTINCT FROM auth.uid()
    AND m.deleted_at IS NULL
  GROUP BY m.channel_id;
$$;

REVOKE ALL ON FUNCTION fn_get_or_create_dm(uuid) FROM public;
REVOKE ALL ON FUNCTION fn_get_or_create_dm(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION fn_get_or_create_dm(uuid) TO authenticated;

REVOKE ALL ON FUNCTION fn_mark_channel_read(uuid) FROM public;
REVOKE ALL ON FUNCTION fn_mark_channel_read(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION fn_mark_channel_read(uuid) TO authenticated;

REVOKE ALL ON FUNCTION fn_chat_unread_counts() FROM public;
REVOKE ALL ON FUNCTION fn_chat_unread_counts() FROM anon;
GRANT EXECUTE ON FUNCTION fn_chat_unread_counts() TO authenticated;
