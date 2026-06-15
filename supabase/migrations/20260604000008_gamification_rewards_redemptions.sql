-- ════════════════════════════════════════════════════════════════════
-- GAMIFICATION REDESIGN — Part 4: Rewards catalog & redemption review
-- Re-seeds the policy reward catalog (LP prices), adds premium/cash tiers,
-- and wires redemption against the monthly LP wallet with HR approval,
-- cash eligibility gate (≥500 LP), refund-on-reject, and finance payout.
-- NOTE: rewards.xp_cost now holds the LP cost (1 LP = PKR 10).
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE rewards
  ADD COLUMN tier    text    NOT NULL DEFAULT 'standard' CHECK (tier IN ('standard','premium')),
  ADD COLUMN is_cash boolean NOT NULL DEFAULT false;

-- Governors (HR/Admin) manage the catalog (was super_admin/admin only).
DROP POLICY IF EXISTS p_rewards_write ON rewards;
CREATE POLICY p_rewards_write ON rewards FOR ALL
  USING (can_govern_gamification()) WITH CHECK (can_govern_gamification());

-- Replace the placeholder catalog with the policy's reward list (LP prices).
DELETE FROM rewards WHERE id NOT IN (SELECT DISTINCT reward_id FROM reward_redemptions);

INSERT INTO rewards (name, description, xp_cost, quantity, tier, is_cash, is_active) VALUES
  ('Team Lunch',          'Team lunch on the company — your choice of restaurant.',       120, -1, 'standard', false, true),
  ('Early Leave (Friday)','Leave early this Friday. Valid for one use.',                  150, -1, 'standard', false, true),
  ('Extra Casual Leave',  'One extra paid casual leave day, subject to team capacity.',   200, -1, 'standard', false, true),
  ('Birthday Leave',      'A paid day off to celebrate your birthday.',                   200, -1, 'standard', false, true),
  ('Fuel Reimbursement',  'PKR 2,000 fuel reimbursement.',                               250, -1, 'standard', false, true),
  ('Learning Budget',     'PKR 3,000 added to your learning & development budget.',       300, -1, 'standard', false, true),
  ('Cash Bonus',          'Cash bonus (min 500 LP this month, HR-verified eligibility).', 500, -1, 'premium',  true,  true),
  ('Weekend Getaway',     'Sponsored weekend getaway for top performers.',                700,  5, 'premium',  false, true),
  ('Laptop Contribution', 'Company contribution toward a personal laptop.',               800,  3, 'premium',  false, true);

-- ── Atomic redemption against the monthly LP wallet ─────────────────────────────
-- Deducts LP immediately (locks the points); HR approves/rejects, reject refunds.
CREATE OR REPLACE FUNCTION redeem_reward(p_profile_id uuid, p_reward_id uuid)
RETURNS uuid AS $$
DECLARE
  v_reward        rewards%ROWTYPE;
  v_lp            int;
  v_restricted    boolean;
  v_redemption_id uuid;
BEGIN
  -- Only the holder may redeem their own points.
  IF p_profile_id <> auth.uid() THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT lp_balance, is_restricted INTO v_lp, v_restricted
  FROM profiles WHERE id = p_profile_id FOR UPDATE;
  IF v_restricted THEN RAISE EXCEPTION 'participation_restricted'; END IF;

  SELECT * INTO v_reward FROM rewards WHERE id = p_reward_id AND is_active = true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'reward_not_found'; END IF;
  IF v_reward.quantity = 0 THEN RAISE EXCEPTION 'reward_out_of_stock'; END IF;

  -- Cash rewards require ≥500 LP this month (policy §1.8); behaviour is HR-verified on approval.
  IF v_reward.is_cash AND v_lp < 500 THEN RAISE EXCEPTION 'cash_threshold_not_met'; END IF;
  IF v_lp < v_reward.xp_cost THEN RAISE EXCEPTION 'insufficient_lp'; END IF;

  IF v_reward.quantity > 0 THEN
    UPDATE rewards SET quantity = quantity - 1 WHERE id = p_reward_id;
  END IF;

  INSERT INTO xp_transactions (profile_id, amount, reason)
  VALUES (p_profile_id, -v_reward.xp_cost, 'Redemption: ' || v_reward.name);

  INSERT INTO reward_redemptions (profile_id, reward_id, xp_spent)
  VALUES (p_profile_id, p_reward_id, v_reward.xp_cost)
  RETURNING id INTO v_redemption_id;

  RETURN v_redemption_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── Redemption queue visibility: add HR + finance ───────────────────────────────
DROP POLICY IF EXISTS p_redemptions_admin ON reward_redemptions;
CREATE POLICY p_redemptions_admin ON reward_redemptions FOR SELECT
  USING (can_govern_gamification() OR current_user_role() = 'finance');

-- ── RPC: review a redemption (approve / reject+refund / fulfill payout) ──────────
CREATE OR REPLACE FUNCTION review_redemption(
  p_id uuid, p_action text, p_note text DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_red    reward_redemptions%ROWTYPE;
  v_reward rewards%ROWTYPE;
BEGIN
  SELECT * INTO v_red FROM reward_redemptions WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'redemption_not_found'; END IF;
  SELECT * INTO v_reward FROM rewards WHERE id = v_red.reward_id;

  IF p_action = 'approve' THEN
    IF NOT can_govern_gamification() THEN RAISE EXCEPTION 'forbidden'; END IF;
    IF v_red.status <> 'pending' THEN RAISE EXCEPTION 'invalid_state'; END IF;
    UPDATE reward_redemptions SET status = 'approved', reviewed_by = auth.uid(),
           reviewed_at = now(), note = p_note WHERE id = p_id;
    INSERT INTO notifications (profile_id, title, body, resource_type, resource_id)
    VALUES (v_red.profile_id, 'Redemption Approved',
            'Your "' || v_reward.name || '" redemption was approved.', 'redemption', p_id::text);

  ELSIF p_action = 'fulfill' THEN
    -- Finance may mark cash payouts fulfilled; governors may fulfill anything.
    IF NOT (can_govern_gamification() OR current_user_role() = 'finance') THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
    IF v_red.status <> 'approved' THEN RAISE EXCEPTION 'invalid_state'; END IF;
    UPDATE reward_redemptions SET status = 'fulfilled', note = p_note WHERE id = p_id;
    INSERT INTO notifications (profile_id, title, body, resource_type, resource_id)
    VALUES (v_red.profile_id, 'Reward Fulfilled',
            'Your "' || v_reward.name || '" reward has been fulfilled.', 'redemption', p_id::text);

  ELSIF p_action = 'reject' THEN
    IF NOT can_govern_gamification() THEN RAISE EXCEPTION 'forbidden'; END IF;
    IF v_red.status NOT IN ('pending','approved') THEN RAISE EXCEPTION 'invalid_state'; END IF;
    UPDATE reward_redemptions SET status = 'rejected', reviewed_by = auth.uid(),
           reviewed_at = now(), note = p_note WHERE id = p_id;
    -- Refund the LP and restore stock.
    INSERT INTO xp_transactions (profile_id, amount, reason)
    VALUES (v_red.profile_id, v_red.xp_spent, 'Refund: ' || v_reward.name);
    IF v_reward.quantity >= 0 THEN
      UPDATE rewards SET quantity = quantity + 1 WHERE id = v_red.reward_id;
    END IF;
    INSERT INTO notifications (profile_id, title, body, resource_type, resource_id)
    VALUES (v_red.profile_id, 'Redemption Declined',
            'Your "' || v_reward.name || '" redemption was declined and ' || v_red.xp_spent
            || ' LP refunded.', 'redemption', p_id::text);
  ELSE
    RAISE EXCEPTION 'unknown_action';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
