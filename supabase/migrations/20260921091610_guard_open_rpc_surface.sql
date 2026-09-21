-- Phase 2 of the RPC lockdown: guard what `authenticated` may walk through.
--
-- 20260917054230 shut the anonymous door and said so explicitly: "Guarding those
-- 230 functions with has_feature() is the follow-up pass, not this migration."
-- This is that pass, for the subset that actually needs it.
--
-- A SECURITY DEFINER function runs as its owner, so RLS does not apply inside it.
-- The guard therefore has to be in the body, or the function must not be reachable
-- over PostgREST at all. Of the 145 non-trigger SECURITY DEFINER functions still
-- executable by `authenticated`, 13 had neither. `authenticated` is ANY account —
-- every employee, and every future client-portal user.
--
-- What an ordinary employee could do before this migration, with the anon key and
-- their own session, from curl:
--   fn_monthly_lp_reset()            -> zero every employee's lp_balance
--   fn_mark_absent_for_date(date)    -> write 'absent' rows for the whole company
--   fn_sync_channel_role(uuid,text)  -> add every holder of a role to ANY channel,
--                                       private ones included, themselves included
--   fn_notify(...)                   -> forge an in-portal notification to anyone,
--                                       arbitrary title and body, and fire a push
--   fn_auto_checkout_missing()       -> force-check-out everyone with an open row
--   fn_purge_old_notifications()     -> delete every notification over 60 days old
--   fn_award_badges(uuid)            -> award badges to any profile
--   fn_makeup_balance(...)           -> read anyone's attendance make-up balance
--   fn_unpaid_exception_minutes(...) -> read anyone's unpaid exception minutes
--   fn_standup_suggestions(...)      -> read anyone's standup suggestions
--   fn_all_internal_staff()          -> enumerate every active staff id
--   fn_recalc_project_progress(uuid) -> force a recompute on any project
--   service_member_task_load(...)    -> read anyone's workload on any service block
--
-- Two treatments, chosen per function by who legitimately calls it.
--
-- Verified against the live schema before writing:
--   * None of the twelve revoked below appears in any RLS policy expression
--     (0 of 427), so no policy can start failing with "permission denied". This is
--     the one thing that makes a REVOKE dangerous and it does not apply here.
--   * None is called by a SECURITY INVOKER function, so no call chain loses rights
--     mid-flight. Their real callers are triggers and SECURITY DEFINER functions,
--     both of which run as the owner and need no grant on the callee.
--   * None is called from src/ or from an edge function. The only one of the
--     thirteen with a live front-end caller is service_member_task_load, which is
--     therefore guarded rather than revoked.
--   * postgres and service_role keep explicit EXECUTE, so pg_cron and the 20 edge
--     functions are untouched.

-- ── 1. Jobs and internals: not endpoints at all ───────────────────────────────
--
-- These are called by cron, by triggers, or by other SECURITY DEFINER functions.
-- None has any business being reachable over HTTP by a logged-in user, so the
-- grant goes rather than a guard going in. A guard would still leave them
-- published at /rest/v1/rpc/<name>, advertising machinery nobody should aim at.

REVOKE EXECUTE ON FUNCTION public.fn_monthly_lp_reset()                              FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_mark_absent_for_date(date)                      FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_auto_checkout_missing()                         FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_purge_old_notifications()                       FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_recalc_project_progress(uuid)                   FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_award_badges(uuid)                              FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_sync_channel_role(uuid, text)                   FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_notify(uuid, text, text, text, text, text, uuid) FROM authenticated;

-- ── 2. Helpers that read one person's attendance or roster ────────────────────
--
-- Same treatment, different reason: these are building blocks for the roster and
-- report RPCs, which already scope themselves through fn_can_report_on(). Exposing
-- the raw helper hands out per-person attendance detail with no scope test at all.

REVOKE EXECUTE ON FUNCTION public.fn_makeup_balance(uuid, date, date)   FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_unpaid_exception_minutes(uuid, date) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_standup_suggestions(uuid, date)    FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_all_internal_staff()               FROM authenticated;

-- ── 3. The one with a live caller: guard it, keep it ──────────────────────────
--
-- fetchServiceMemberTaskLoad() in src/api/projectServices.ts calls this to show
-- "you are about to unstaff someone still holding N tasks" before the unstaff
-- confirm. The guard therefore mirrors the action it precedes —
-- unstaff_service_member()'s own is_internal() AND can_manage_projects — so the
-- warning and the button it guards are visible to exactly the same people. Any
-- wider and this becomes a workload oracle for the whole company again.

CREATE OR REPLACE FUNCTION public.service_member_task_load(
  p_project_service_id uuid,
  p_profile_id uuid
)
RETURNS TABLE(assigned integer, reviewing integer, tasks integer)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (is_internal() AND has_feature('can_manage_projects')) THEN
    RAISE EXCEPTION 'Not allowed to read project staffing';
  END IF;

  RETURN QUERY
  WITH held AS (
    SELECT
      t.id,
      (
        t.assignee_id = p_profile_id
        OR EXISTS (
          SELECT 1 FROM task_assignees ta
           WHERE ta.task_id = t.id AND ta.profile_id = p_profile_id
        )
      ) AS is_assignee,
      EXISTS (
        SELECT 1 FROM task_reviewers tr
         WHERE tr.task_id = t.id AND tr.profile_id = p_profile_id
      ) AS is_reviewer
    FROM tasks t
    WHERE t.project_service_id = p_project_service_id
      AND t.deleted_at IS NULL
  )
  SELECT
    COUNT(*) FILTER (WHERE is_assignee)::int,
    COUNT(*) FILTER (WHERE is_reviewer)::int,
    COUNT(*) FILTER (WHERE is_assignee OR is_reviewer)::int
  FROM held;
END;
$function$;

-- CREATE OR REPLACE resets the grant to the schema default, which 20260917054230
-- set to "nothing". Put back exactly what the front end needs and no more.
REVOKE EXECUTE ON FUNCTION public.service_member_task_load(uuid, uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.service_member_task_load(uuid, uuid) TO authenticated;
