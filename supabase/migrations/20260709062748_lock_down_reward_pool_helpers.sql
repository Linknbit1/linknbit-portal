-- ════════════════════════════════════════════════════════════════════
-- Harden the two group-reward functions that carry no internal auth check:
--   • fn_unwind_reward_pool — internal helper that writes refund ledger rows
--     and restores stock; must never be reachable directly via the REST API.
--   • expire_reward_pools   — cron-only sweeper.
-- Both are invoked either by pg_cron (runs as the object owner, unaffected by
-- these grants) or by other SECURITY DEFINER functions via PERFORM (also
-- unaffected). Revoking EXECUTE from the API roles removes their /rest/v1/rpc
-- exposure without breaking those internal call paths.
-- The user-facing pool RPCs (open/join/leave/cancel/review) keep their grants:
-- each already guards on auth.uid()/governance, matching the existing pattern.
-- ════════════════════════════════════════════════════════════════════

REVOKE EXECUTE ON FUNCTION fn_unwind_reward_pool(reward_pools, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION expire_reward_pools()                     FROM anon, authenticated;
