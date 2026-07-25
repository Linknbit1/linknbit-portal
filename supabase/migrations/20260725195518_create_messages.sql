-- Chat, phase 1: messages. Mirrors comments' dual-column doc/text convention
-- (body_doc jsonb + body_text plain-text mirror) so the existing
-- toDbDoc/fromDbDoc/docToPlainText helpers in src/lib/richText.ts work
-- unchanged. Soft delete only (deleted_at) — no DELETE policy — so a
-- moderated/removed message still preserves thread integrity.

CREATE TABLE messages (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id  uuid        NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  author_id   uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  body_doc    jsonb,
  body_text   text        NOT NULL DEFAULT '',
  edited_at   timestamptz,
  deleted_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_channel_created ON messages (channel_id, created_at DESC);
CREATE INDEX idx_messages_author ON messages (author_id);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_messages_select ON messages FOR SELECT
  USING (is_channel_member(channel_id));

CREATE POLICY p_messages_insert ON messages FOR INSERT
  WITH CHECK (author_id = auth.uid() AND is_internal() AND is_channel_member(channel_id));

-- Row-level: the author, or a moderator (can_delete_any_message) — the
-- latter is meant only to set deleted_at, never rewrite content. That
-- narrower rule is enforced by the trigger below, which only fires when
-- body_doc/body_text are actually part of the UPDATE.
CREATE POLICY p_messages_update ON messages FOR UPDATE
  USING     (author_id = auth.uid() OR has_feature('can_delete_any_message'))
  WITH CHECK (author_id = auth.uid() OR has_feature('can_delete_any_message'));

CREATE OR REPLACE FUNCTION fn_guard_message_edit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.author_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'forbidden_message_edit';
  END IF;
  NEW.edited_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_message_edit
  BEFORE UPDATE OF body_doc, body_text ON messages
  FOR EACH ROW EXECUTE FUNCTION fn_guard_message_edit();
