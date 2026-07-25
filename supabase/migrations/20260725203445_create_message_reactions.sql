-- Chat, phase 3: emoji reactions. `emoji` stores the unicode grapheme itself
-- (no shortcode indirection), and channel_id is denormalised so both RLS and
-- the Realtime `channel_id=eq.…` filter work without joining through messages.
-- A trigger fills channel_id from the parent message, so clients can't set it
-- to a channel they aren't in.

CREATE TABLE message_reactions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id  uuid        NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  channel_id  uuid        NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  profile_id  uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji       text        NOT NULL CHECK (length(emoji) BETWEEN 1 AND 16),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, profile_id, emoji)
);

CREATE INDEX idx_message_reactions_message ON message_reactions (message_id);
CREATE INDEX idx_message_reactions_channel ON message_reactions (channel_id);

-- Derive channel_id from the message rather than trusting the client.
CREATE OR REPLACE FUNCTION fn_set_reaction_channel() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  SELECT channel_id INTO NEW.channel_id FROM messages WHERE id = NEW.message_id;
  IF NEW.channel_id IS NULL THEN
    RAISE EXCEPTION 'unknown_message';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_reaction_channel
  BEFORE INSERT ON message_reactions
  FOR EACH ROW EXECUTE FUNCTION fn_set_reaction_channel();

ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_message_reactions_select ON message_reactions FOR SELECT
  USING (is_channel_member(channel_id));

CREATE POLICY p_message_reactions_insert ON message_reactions FOR INSERT
  WITH CHECK (
    profile_id = auth.uid()
    AND is_internal()
    AND EXISTS (SELECT 1 FROM messages m WHERE m.id = message_id AND is_channel_member(m.channel_id))
  );

-- You can only ever take back your own reaction — no moderator override needed.
CREATE POLICY p_message_reactions_delete ON message_reactions FOR DELETE
  USING (profile_id = auth.uid());
