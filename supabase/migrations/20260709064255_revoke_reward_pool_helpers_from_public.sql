-- ════════════════════════════════════════════════════════════════════
-- Fix: the previous migration revoked EXECUTE from anon/authenticated only,
-- but Postgres grants function EXECUTE to PUBLIC by default and those roles
-- inherit it via PUBLIC — so they could still reach fn_unwind_reward_pool and
-- expire_reward_pools over /rest/v1/rpc. Revoke from PUBLIC to actually close
-- the API surface. pg_cron (runs as the owning superuser) and internal PERFORM
-- calls from other SECURITY DEFINER functions (run as the definer) are
-- unaffected, so the expiry sweep and pool unwinding keep working.
-- ════════════════════════════════════════════════════════════════════

REVOKE EXECUTE ON FUNCTION fn_unwind_reward_pool(reward_pools, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION expire_reward_pools()                     FROM PUBLIC;
