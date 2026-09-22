-- Realtime on the tables where somebody else's action changes your screen.
--
-- 19 tables were published; the ones people actually wait on were not. Approving
-- leave, WFH, an exception or overtime changed nothing for a colleague looking at
-- the same queue until their cache went stale — up to five minutes in which two
-- people can decide the same request.
--
-- Realtime is a SIGNAL, never a data source: the client invalidates and refetches
-- through RLS, so the payload is never trusted and nobody sees a row they could
-- not have fetched themselves.
--
-- Deliberately not published: notifications (already covered), audit_log (nobody
-- watches it live), and the reference tables, which change once a quarter.
--
-- For later: postgres_changes runs one authorisation check per subscriber per
-- change, single-threaded, so throughput scales with subscriber count rather than
-- write rate. Fine at 21 people. Supabase's own advice is realtime.broadcast_changes()
-- above roughly 3,000 concurrent subscribers, and that move is cheaper before the
-- channels multiply.

ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leave_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wfh_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.overtime_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_exceptions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.standups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_assignees;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_reviewers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.subtasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_allocations;
