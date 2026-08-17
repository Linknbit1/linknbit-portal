-- Corrects 20260817105542_bd_function_hardening.sql, which revoked from the
-- wrong grantee and therefore changed nothing.
--
-- Postgres grants EXECUTE on every newly created function to PUBLIC. `anon` and
-- `authenticated` are members of PUBLIC, so `REVOKE ... FROM anon` removes a
-- grant they never held individually and leaves the inherited one intact —
-- has_function_privilege('anon', …) still came back true afterwards.
--
-- The revoke has to name PUBLIC, and anything that should stay reachable then
-- has to be granted back explicitly. That is why bd_people() and
-- my_bd_meetings() already behave correctly: both were written with
-- `REVOKE ALL … FROM public` followed by `GRANT EXECUTE … TO authenticated`.
--
-- Verify with:
--   SELECT proname, has_function_privilege('anon', oid, 'EXECUTE')
--   FROM pg_proc WHERE proname LIKE '%bd%';

-- ── Trigger functions: reachable by nobody over REST ─────────────────────────
-- Safe to revoke wholesale. Postgres checks EXECUTE on a trigger function at
-- CREATE TRIGGER time, not on each fire, so the triggers keep working.
REVOKE ALL ON FUNCTION fn_bd_touch_updated_at()       FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION fn_bd_stamp_closed_at()        FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION fn_bd_stamp_closed_at_insert() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION fn_bd_notify_task_assignee()   FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION fn_bd_notify_lead_owner()      FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION fn_bd_notify_mention()         FROM public, anon, authenticated;

-- ── Policy helpers: signed-in only ───────────────────────────────────────────
-- `authenticated` must keep EXECUTE. A policy's USING clause is evaluated as the
-- calling role, so without it every BD user loses every BD table.
REVOKE ALL ON FUNCTION bd_can_view()   FROM public, anon;
REVOKE ALL ON FUNCTION bd_can_manage() FROM public, anon;
GRANT EXECUTE ON FUNCTION bd_can_view()   TO authenticated;
GRANT EXECUTE ON FUNCTION bd_can_manage() TO authenticated;
