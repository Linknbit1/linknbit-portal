-- Register attachments and reactions for Realtime so both appear live for
-- everyone in the conversation, same as messages.
ALTER PUBLICATION supabase_realtime ADD TABLE message_attachments;
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
