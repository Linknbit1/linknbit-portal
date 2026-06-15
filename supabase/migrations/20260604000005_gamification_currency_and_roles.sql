-- ════════════════════════════════════════════════════════════════════
-- GAMIFICATION REDESIGN — Part 1: Currency model & role-based access
-- Aligns the system with the "Gamified Rewards & Recognition" policy.
--   • Link Points (LP)  — monthly-resetting spendable wallet
--   • Reputation         — permanent, mirrors all earned LP, drives level
--   • Replaces gamification feature flags with role-based helpers
-- ════════════════════════════════════════════════════════════════════

-- ── Profiles: new balances + participation restriction ──────────────────────────
ALTER TABLE profiles
  ADD COLUMN lp_balance        int     NOT NULL DEFAULT 0,   -- monthly wallet (spendable, resets)
  ADD COLUMN reputation_total  int     NOT NULL DEFAULT 0,   -- permanent, never spent/reset
  ADD COLUMN is_restricted     boolean NOT NULL DEFAULT false,
  ADD COLUMN restricted_reason text,
  ADD COLUMN restricted_at     timestamptz,
  ADD COLUMN restricted_by     uuid REFERENCES profiles(id);

-- Carry legacy data: lifetime reputation = old xp_total; seed this month's wallet at the same value.
UPDATE profiles
SET reputation_total = GREATEST(xp_total, 0),
    lp_balance       = GREATEST(xp_total, 0);

-- Level now derives from permanent reputation, not the monthly wallet.
DROP TRIGGER IF EXISTS trg_profile_level_sync ON profiles;

CREATE OR REPLACE FUNCTION fn_sync_profile_level()
RETURNS TRIGGER AS $$
BEGIN
  NEW.level := (SELECT MAX(level) FROM levels WHERE xp_required <= NEW.reputation_total);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profile_level_sync
  BEFORE UPDATE OF reputation_total ON profiles
  FOR EACH ROW EXECUTE FUNCTION fn_sync_profile_level();

-- Drop the legacy column — fully replaced by lp_balance + reputation_total.
ALTER TABLE profiles DROP COLUMN xp_total;

-- ── Ledger application: every points transaction updates both balances ──────────
-- Positive amounts (earnings) credit the monthly wallet AND permanent reputation.
-- Negative amounts (redemptions) debit only the monthly wallet — reputation never drops.
CREATE OR REPLACE FUNCTION fn_apply_xp_transaction()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET lp_balance       = lp_balance + NEW.amount,
      reputation_total = reputation_total + GREATEST(NEW.amount, 0)
  WHERE id = NEW.profile_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
-- (trigger trg_apply_xp from the original migration still fires this replaced function.)

-- ── Role-based access helpers (replace gamification feature flags) ──────────────
-- Govern: HR + Admins approve, manage the catalog, grant LP, restrict participation.
CREATE OR REPLACE FUNCTION can_govern_gamification() RETURNS boolean AS $$
  SELECT current_user_role() IN ('super_admin','admin','hr')
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Recognize: Managers + Team Leads (plus governors) post tasks and give shoutouts.
CREATE OR REPLACE FUNCTION can_recognize() RETURNS boolean AS $$
  SELECT current_user_role() IN ('super_admin','admin','hr','project_manager','team_lead')
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Manual LP grants: governors only, strictly positive (no balance check needed).
DROP POLICY IF EXISTS p_xp_admin_insert ON xp_transactions;
CREATE POLICY p_xp_admin_insert ON xp_transactions FOR INSERT
  WITH CHECK (can_govern_gamification() AND amount > 0);

DROP POLICY IF EXISTS p_xp_admin_select ON xp_transactions;
CREATE POLICY p_xp_admin_select ON xp_transactions FOR SELECT
  USING (can_govern_gamification());

-- Remove gamification feature flags — access is now role-based (code + RLS).
DELETE FROM role_feature_flags
WHERE feature_key IN ('can_manage_rewards','can_grant_xp','can_manage_quests','can_give_shoutout');

-- ── Participation restriction (policy §1.11) ────────────────────────────────────
-- HR/Admin can temporarily bar an employee from claiming tasks / redeeming.
CREATE OR REPLACE FUNCTION set_participation_restriction(
  p_profile_id uuid, p_restricted boolean, p_reason text DEFAULT NULL
) RETURNS void AS $$
BEGIN
  IF NOT can_govern_gamification() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE profiles
  SET is_restricted     = p_restricted,
      restricted_reason = CASE WHEN p_restricted THEN p_reason ELSE NULL END,
      restricted_at     = CASE WHEN p_restricted THEN now()    ELSE NULL END,
      restricted_by     = CASE WHEN p_restricted THEN auth.uid() ELSE NULL END
  WHERE id = p_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
