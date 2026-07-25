-- Chat, phase 2: files and links shared in a conversation.
--
-- message_id is nullable on purpose: the composer uploads a dropped file
-- immediately (so progress/preview appear at once, like Discord/Slack) and
-- only links it to a message on send. Access is therefore always decided by
-- channel_id, never by walking up to a message row that may not exist yet —
-- which is also why channel_id is denormalised here rather than joined.

CREATE TABLE message_attachments (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id    uuid        REFERENCES messages(id) ON DELETE CASCADE,
  channel_id    uuid        NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  uploader_id   uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  kind          text        NOT NULL DEFAULT 'file' CHECK (kind IN ('file', 'link')),
  file_name     text        NOT NULL,
  file_size     bigint,
  mime_type     text,
  storage_path  text,
  link_url      text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT message_attachments_payload CHECK (
    (kind = 'file' AND storage_path IS NOT NULL)
    OR (kind = 'link' AND link_url IS NOT NULL)
  )
);

CREATE INDEX idx_message_attachments_message ON message_attachments (message_id);
CREATE INDEX idx_message_attachments_channel ON message_attachments (channel_id, created_at DESC);

ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_message_attachments_select ON message_attachments FOR SELECT
  USING (is_channel_member(channel_id));

CREATE POLICY p_message_attachments_insert ON message_attachments FOR INSERT
  WITH CHECK (uploader_id = auth.uid() AND is_internal() AND is_channel_member(channel_id));

-- Only ever used to attach a freshly-uploaded row to the message being sent.
CREATE POLICY p_message_attachments_update ON message_attachments FOR UPDATE
  USING     (uploader_id = auth.uid() AND is_channel_member(channel_id))
  WITH CHECK (uploader_id = auth.uid() AND is_channel_member(channel_id));

CREATE POLICY p_message_attachments_delete ON message_attachments FOR DELETE
  USING (uploader_id = auth.uid() OR has_feature('can_delete_any_message'));
