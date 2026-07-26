-- "Delete conversation" for a DM removes it from your own list without
-- destroying the other person's copy or the history. A later message brings
-- the thread back (the list compares hidden_at against the newest message),
-- which is how WhatsApp/Discord behave — leaving is the wrong verb for a DM,
-- since a 1:1 thread you left could never be rejoined cleanly.
--
-- No policy changes needed: p_channel_members_update already lets a member
-- write their own row, and the role guard trigger only fires on
-- role_in_channel.
ALTER TABLE channel_members ADD COLUMN hidden_at timestamptz;

CREATE OR REPLACE FUNCTION fn_hide_channel(p_channel_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE channel_members
  SET hidden_at = now()
  WHERE channel_id = p_channel_id AND profile_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION fn_hide_channel(uuid) FROM public;
REVOKE ALL ON FUNCTION fn_hide_channel(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION fn_hide_channel(uuid) TO authenticated;
