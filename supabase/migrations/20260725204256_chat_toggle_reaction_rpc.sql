-- Add/remove a reaction in one atomic call. Doing this client-side would need
-- a select-then-write round trip (racy on double-click) and would force the
-- caller to supply channel_id, which is server-derived. Membership is checked
-- explicitly here because SECURITY DEFINER bypasses the table's RLS.

CREATE OR REPLACE FUNCTION fn_toggle_reaction(p_message_id uuid, p_emoji text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me         uuid := auth.uid();
  v_channel_id uuid;
  v_deleted    int;
BEGIN
  IF p_emoji IS NULL OR length(p_emoji) < 1 OR length(p_emoji) > 16 THEN
    RAISE EXCEPTION 'invalid_emoji';
  END IF;

  SELECT channel_id INTO v_channel_id FROM messages WHERE id = p_message_id AND deleted_at IS NULL;
  IF v_channel_id IS NULL THEN
    RAISE EXCEPTION 'unknown_message';
  END IF;

  IF NOT is_channel_member(v_channel_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  DELETE FROM message_reactions
  WHERE message_id = p_message_id AND profile_id = v_me AND emoji = p_emoji;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted > 0 THEN
    RETURN false; -- reaction removed
  END IF;

  INSERT INTO message_reactions (message_id, channel_id, profile_id, emoji)
  VALUES (p_message_id, v_channel_id, v_me, p_emoji);
  RETURN true; -- reaction added
END;
$$;

REVOKE ALL ON FUNCTION fn_toggle_reaction(uuid, text) FROM public;
REVOKE ALL ON FUNCTION fn_toggle_reaction(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION fn_toggle_reaction(uuid, text) TO authenticated;
