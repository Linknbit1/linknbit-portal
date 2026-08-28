-- Deleting a chat message left its files behind.
--
-- A message is soft-deleted: `deleted_at` is stamped and the row stays, so the
-- thread can show "This message was deleted". Nothing cascades from an UPDATE,
-- so message_attachments kept pointing at it and the files stayed in the bucket
-- and in the channel's Files panel.
--
-- There is an api/messageAttachments.ts:purgeMessageAttachments() written for
-- exactly this, and nothing has ever called it. That is the argument for doing
-- it here instead of wiring it up: a rule that has to be remembered at every
-- call site is a rule that gets missed at one of them. In the database it also
-- covers the paths the client is not involved in, like moderation.
CREATE OR REPLACE FUNCTION fn_purge_attachments_on_message_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Only on the transition. A later edit of an already-deleted message must not
  -- re-run this, and un-deleting is not a thing the portal offers.
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    -- The row delete fires trg_message_attachments_queue_cleanup, which is what
    -- actually queues each file for the janitor.
    DELETE FROM message_attachments WHERE message_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_messages_purge_attachments ON messages;
CREATE TRIGGER trg_messages_purge_attachments
  AFTER UPDATE OF deleted_at ON messages
  FOR EACH ROW EXECUTE FUNCTION fn_purge_attachments_on_message_delete();

-- Historical soft-deleted messages whose files were never cleaned up. Same
-- delete, so the same trigger queues them.
DELETE FROM message_attachments ma
 USING messages m
 WHERE m.id = ma.message_id
   AND m.deleted_at IS NOT NULL;
