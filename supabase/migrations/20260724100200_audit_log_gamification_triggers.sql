-- ════════════════════════════════════════════════════════════════════
-- AUDIT LOG — Part 3 of 4: gamification module triggers.
--
-- The xp_transactions ledger is the choke point: every value-moving action
-- (RPC or the direct grantLp() insert) lands here, so one trigger catches
-- the whole economy. Status-transition tables (shoutouts, redemptions, pools,
-- quest claims) log approvals; catalogue tables log create/edit/delete. The
-- profiles trigger is column-scoped to is_restricted only.
-- ════════════════════════════════════════════════════════════════════

CREATE TRIGGER trg_audit_xp_transactions
  AFTER INSERT ON xp_transactions
  FOR EACH ROW EXECUTE FUNCTION fn_audit_capture('gamification');

CREATE TRIGGER trg_audit_shoutouts
  AFTER INSERT OR UPDATE ON shoutouts
  FOR EACH ROW EXECUTE FUNCTION fn_audit_capture('gamification');

CREATE TRIGGER trg_audit_reward_redemptions
  AFTER INSERT OR UPDATE ON reward_redemptions
  FOR EACH ROW EXECUTE FUNCTION fn_audit_capture('gamification');

CREATE TRIGGER trg_audit_reward_pools
  AFTER INSERT OR UPDATE ON reward_pools
  FOR EACH ROW EXECUTE FUNCTION fn_audit_capture('gamification');

CREATE TRIGGER trg_audit_quest_task_claims
  AFTER UPDATE ON quest_task_claims
  FOR EACH ROW EXECUTE FUNCTION fn_audit_capture('gamification');

CREATE TRIGGER trg_audit_badge_awards
  AFTER INSERT OR DELETE ON badge_awards
  FOR EACH ROW EXECUTE FUNCTION fn_audit_capture('gamification');

CREATE TRIGGER trg_audit_employee_of_the_month
  AFTER INSERT OR DELETE ON employee_of_the_month
  FOR EACH ROW EXECUTE FUNCTION fn_audit_capture('gamification');

CREATE TRIGGER trg_audit_rewards
  AFTER INSERT OR UPDATE OR DELETE ON rewards
  FOR EACH ROW EXECUTE FUNCTION fn_audit_capture('gamification');

CREATE TRIGGER trg_audit_quest_tasks
  AFTER INSERT OR UPDATE OR DELETE ON quest_tasks
  FOR EACH ROW EXECUTE FUNCTION fn_audit_capture('gamification');

-- Participation restriction only — balances/reputation churn on every ledger row.
CREATE TRIGGER trg_audit_profiles_restriction
  AFTER UPDATE OF is_restricted ON profiles
  FOR EACH ROW EXECUTE FUNCTION fn_audit_capture('gamification');
