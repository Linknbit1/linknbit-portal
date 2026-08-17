-- Close two gaps the database linter flagged on the BD functions.
--
-- ── 1. Pin search_path on the trigger functions ──────────────────────────────
--
-- The three below were created without `SET search_path`, so they resolve
-- unqualified names against whatever the caller's search_path happens to be. On
-- a SECURITY DEFINER function that is the classic privilege-escalation route;
-- these three are INVOKER, so the exposure is smaller — but a trigger that can
-- be pointed at a different `profiles` is not something to leave lying around,
-- and every other function in this schema already pins it.
--
-- ── 2. Stop the trigger functions being callable over the REST API ───────────
--
-- Supabase's default privileges GRANT EXECUTE on every new function to `anon`
-- and `authenticated`, which publishes each one at /rest/v1/rpc/<name>. A
-- trigger function called that way has no NEW/OLD record and simply errors, so
-- nothing is exploitable today — but fn_bd_notify_* are SECURITY DEFINER, and a
-- SECURITY DEFINER function reachable by an unauthenticated caller is a standing
-- invitation that has no reason to exist.
--
-- Revoking is safe: Postgres checks EXECUTE on a trigger function when the
-- trigger is CREATEd, not each time it fires.
--
-- Note the earlier REVOKE ... FROM public on bd_people() and my_bd_meetings()
-- did NOT cover this. Those grants are held by `anon` and `authenticated`
-- directly, not inherited from PUBLIC, so they have to be named.

-- ── Trigger functions: pin search_path ───────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_bd_touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION fn_bd_stamp_closed_at() RETURNS trigger AS $$
BEGIN
  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    IF NEW.stage IN ('won', 'lost', 'unqualified') THEN
      -- Only on the transition *into* a closed stage: won → lost keeps the
      -- original close date (that is a correction), while re-closing a reopened
      -- lead re-stamps it (that genuinely is a new close).
      IF OLD.stage NOT IN ('won', 'lost', 'unqualified') THEN
        NEW.closed_at := now();
      END IF;
    ELSE
      NEW.closed_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION fn_bd_stamp_closed_at_insert() RETURNS trigger AS $$
BEGIN
  IF NEW.stage IN ('won', 'lost', 'unqualified') AND NEW.closed_at IS NULL THEN
    NEW.closed_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ── Trigger functions: not RPC endpoints ─────────────────────────────────────

REVOKE EXECUTE ON FUNCTION fn_bd_touch_updated_at()        FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION fn_bd_stamp_closed_at()         FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION fn_bd_stamp_closed_at_insert()  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION fn_bd_notify_task_assignee()    FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION fn_bd_notify_lead_owner()       FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION fn_bd_notify_mention()          FROM anon, authenticated;

-- ── The readable RPCs: signed-in only ────────────────────────────────────────
--
-- `authenticated` keeps EXECUTE on bd_can_view/bd_can_manage: a policy's USING
-- clause is evaluated as the *calling* role, so revoking it there would lock
-- every BD user out of every BD table. Both already return false for a caller
-- with no auth.uid(), so anon loses nothing but the endpoint.

REVOKE EXECUTE ON FUNCTION bd_can_view()     FROM anon;
REVOKE EXECUTE ON FUNCTION bd_can_manage()   FROM anon;
REVOKE EXECUTE ON FUNCTION bd_people()       FROM anon;
REVOKE EXECUTE ON FUNCTION my_bd_meetings()  FROM anon;
