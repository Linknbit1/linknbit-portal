-- Register phase-1 chat tables for Supabase Realtime. Done here in a
-- migration (not by hand in the dashboard) so it's reproducible — unlike
-- `comments`/`tasks`, which appear to have been added outside migrations.
ALTER PUBLICATION supabase_realtime ADD TABLE channels;
ALTER PUBLICATION supabase_realtime ADD TABLE channel_members;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
