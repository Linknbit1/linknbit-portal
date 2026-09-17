-- Close the anonymous RPC surface.
--
-- Postgres grants EXECUTE on a new function to PUBLIC by default, and PostgREST
-- publishes every function in `public` at /rest/v1/rpc/<name>. Together those two
-- defaults mean every function this portal has ever defined became an endpoint
-- reachable by anyone holding the anon key — which ships in the browser bundle and
-- is public by design. SECURITY DEFINER functions run as their owner, so RLS does
-- not apply to them: the 427 policies that protect every table protect none of this.
--
-- Before this migration, 97 non-trigger SECURITY DEFINER functions were callable by
-- `anon`, 36 of them with no auth.uid()/has_feature()/is_internal() guard of any
-- kind. fn_all_internal_staff() returned the full staff roster to an unauthenticated
-- curl. fn_mark_absent_for_date(date) wrote attendance rows. fn_notify(...) sent an
-- in-portal notification to any user with a forged actor. fn_purge_old_notifications()
-- deleted. None of that required a login.
--
-- The portal calls no RPC before a session exists — auth runs through the
-- auth-signin / auth-refresh edge functions on service_role — so `anon` needs
-- exactly nothing here.
--
-- Safe by construction, verified against the live schema before writing:
--   * postgres and service_role hold explicit EXECUTE on all 259 functions, so the
--     20 edge functions are untouched.
--   * authenticated holds 230 explicit grants, a strict superset of PUBLIC's 172,
--     so no logged-in path loses access. All 77 RPCs called from src/ survive.
--   * Trigger functions need no EXECUTE grant at run time; it is checked when the
--     trigger is created, so revoking from them changes nothing.
--
-- This shuts the door but does not audit who may walk through it once logged in:
-- `authenticated` is any account, including client-portal users. Guarding those 230
-- functions with has_feature() is the follow-up pass, not this migration.

-- 1. Nothing anonymous, ever.
REVOKE EXECUTE ON ALL ROUTINES IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL ROUTINES IN SCHEMA public FROM PUBLIC;

-- 2. Stop it growing back. Without this, the next `CREATE FUNCTION` re-opens the hole
--    silently, which is exactly how 169 of them got here.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON ROUTINES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON ROUTINES FROM PUBLIC;

-- 3. Pin search_path on the SECURITY DEFINER functions that left it mutable.
--    A definer function that resolves an unqualified name through a caller-controlled
--    search_path can be made to run the caller's table or operator as its owner.
--    Looped rather than listed so overloads are all caught.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace AND n.nspname = 'public'
    WHERE p.proname IN (
      'fn_exception_label','fn_sync_profile_level','fn_holiday_backfill_attendance',
      'fn_holiday_revert_attendance','fn_fmt_day','fn_touch_updated_at',
      'fn_task_status_label','fn_fmt_minutes','fn_clamped_minutes','fn_extract_mention_ids'
    )
      AND NOT EXISTS (
        SELECT 1 FROM unnest(coalesce(p.proconfig, '{}')) c WHERE c LIKE 'search\_path=%'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', r.sig);
  END LOOP;
END $$;

-- 4. storage_cleanup_queue has RLS on and no policies. That is deliberate and already
--    correct — it is drained by the storage-janitor edge function on service_role,
--    which bypasses RLS. No policy means no client of any kind can read it. Recorded
--    here so the advisor's INFO line is not "fixed" later by adding a policy.
COMMENT ON TABLE public.storage_cleanup_queue IS
  'Service-role only. RLS enabled with zero policies on purpose: drained by the storage-janitor edge function, never readable by a client.';

-- 5. Fail the migration rather than report success if anything is still open.
DO $$
DECLARE v_open int;
BEGIN
  SELECT count(*) INTO v_open
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace AND n.nspname = 'public'
  WHERE has_function_privilege('anon', p.oid, 'EXECUTE');

  IF v_open > 0 THEN
    RAISE EXCEPTION 'anon can still execute % function(s) in public', v_open;
  END IF;
END $$;
