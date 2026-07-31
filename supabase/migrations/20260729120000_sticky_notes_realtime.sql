-- Live sticky-note board.
--
-- Publishing the table is what lets a second session see notes appear, move and
-- fill in as they happen. RLS still decides who receives what: sticky_notes is
-- owner-only, so a subscriber is only ever sent rows from their own board.
ALTER PUBLICATION supabase_realtime ADD TABLE sticky_notes;

-- REPLICA IDENTITY FULL puts the whole previous row in the WAL rather than just
-- the primary key. Realtime needs those old values to evaluate the row's RLS
-- policy on UPDATE and DELETE — without it, a deleted note is not delivered to
-- the other session and it lingers on their board until they reload.
ALTER TABLE sticky_notes REPLICA IDENTITY FULL;
