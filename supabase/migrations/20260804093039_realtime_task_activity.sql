-- Publish the tables the task drawer watches, so its activity feed, comments and
-- board state update as things happen rather than on the next remount.
--
-- tasks and comments already had subscribers — useRealtimeTasks() and
-- useRealtimeComments() — but were never added to supabase_realtime, so those
-- channels subscribed successfully and then received nothing. Publishing them
-- makes the existing hooks do what they always intended.
--
-- RLS still applies to realtime delivery: a subscriber only receives rows the
-- SELECT policy would have handed them anyway.

ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE task_time_entries;

-- DELETE events otherwise carry only the primary key, which a
-- `task_id=eq.<id>` filter can never match — so removing an entry would leave
-- the open drawer showing stale totals. FULL keeps the old row on the wire.
ALTER TABLE task_time_entries REPLICA IDENTITY FULL;
