-- ════════════════════════════════════════════════════════════════════
-- GROUP REWARDS — pooled rewards that require N employees to opt in together.
--
-- A "group reward" is a normal row in `rewards` with group_size >= 2. Its
-- xp_cost is the PER-PERSON contribution, so everyone in the pool pays exactly
-- the same amount (equality guaranteed by design — no per-member override).
--
-- Flow (open pool, reserve-on-join, refund-on-cancel/expire):
--   1. An eligible employee opens a pool (reserves their share, decrements stock).
--   2. Other eligible employees opt in until the pool is full — each reserves the
--      same per-person share the moment they join.
--   3. When the pool fills, it flips to 'pending' for HR review (same governors as
--      individual redemptions). Approve → approved → fulfill; reject refunds all.
--   4. An open pool can be cancelled (by its initiator or a governor) or auto-expire;
--      either way every member's reserved LP is refunded and stock is restored.
--
-- LP moves through the immutable xp_transactions ledger (reserve = negative,
-- refund = positive), matching the existing individual redemption/refund pattern.
-- ════════════════════════════════════════════════════════════════════

-- ── 1. Mark rewards as individual (1) or group (>= 2) ───────────────────────────
-- Existing rewards default to 1 → unchanged individual behaviour.
ALTER TABLE rewards
  ADD COLUMN group_size int NOT NULL DEFAULT 1 CHECK (group_size >= 1);

COMMENT ON COLUMN rewards.group_size IS
  '1 = individual reward (redeem_reward). >= 2 = group reward: xp_cost is the per-person share, group_size people must pool together via reward_pools.';

-- ── 2. Pools + members ──────────────────────────────────────────────────────────
CREATE TABLE reward_pools (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_id     uuid        NOT NULL REFERENCES rewards(id) ON DELETE RESTRICT,
  initiated_by  uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  group_size    int         NOT NULL CHECK (group_size >= 2),   -- snapshot at open time
  per_person_lp int         NOT NULL CHECK (per_person_lp > 0), -- snapshot at open time
  status        text        NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open','pending','approved','rejected','fulfilled','cancelled','expired')),
  filled_at     timestamptz,
  expires_at    timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  reviewed_by   uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at   timestamptz,
  note          text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_reward_pools_reward ON reward_pools(reward_id, status);
CREATE INDEX idx_reward_pools_status ON reward_pools(status);

CREATE TABLE reward_pool_members (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id    uuid        NOT NULL REFERENCES reward_pools(id) ON DELETE CASCADE,
  profile_id uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lp_spent   int         NOT NULL,
  joined_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pool_id, profile_id)
);

CREATE INDEX idx_reward_pool_members_profile ON reward_pool_members(profile_id);

ALTER TABLE reward_pools        ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_pool_members ENABLE ROW LEVEL SECURITY;

-- Any internal staff can browse pools + membership (identity is public, like quest
-- claimants) so they can find pools to join and see who's in. Writes go only through
-- the SECURITY DEFINER RPCs below, so no INSERT/UPDATE/DELETE policies are granted.
CREATE POLICY p_reward_pools_select ON reward_pools FOR SELECT
  USING (is_internal());

CREATE POLICY p_reward_pool_members_select ON reward_pool_members FOR SELECT
  USING (is_internal());

-- ── 3. Block individual redemption of group rewards ─────────────────────────────
-- A group reward must never be claimable by a single person via redeem_reward.
CREATE OR REPLACE FUNCTION redeem_reward(p_profile_id uuid, p_reward_id uuid)
RETURNS uuid AS $$
DECLARE
  v_reward        rewards%ROWTYPE;
  v_lp            int;
  v_restricted    boolean;
  v_redemption_id uuid;
BEGIN
  IF p_profile_id <> auth.uid() THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT lp_balance, is_restricted INTO v_lp, v_restricted
  FROM profiles WHERE id = p_profile_id FOR UPDATE;
  IF v_restricted THEN RAISE EXCEPTION 'participation_restricted'; END IF;

  SELECT * INTO v_reward FROM rewards WHERE id = p_reward_id AND is_active = true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'reward_not_found'; END IF;
  IF v_reward.group_size > 1 THEN RAISE EXCEPTION 'group_reward_use_pool'; END IF;
  IF v_reward.quantity = 0 THEN RAISE EXCEPTION 'reward_out_of_stock'; END IF;

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

-- ── 4. Shared helper: refund every member of a pool and restore one stock unit ──
-- Used by cancel / reject / expire. Assumes the pool row is already locked by the caller.
CREATE OR REPLACE FUNCTION fn_unwind_reward_pool(p_pool reward_pools, p_reward_name text)
RETURNS void AS $$
DECLARE
  v_member reward_pool_members%ROWTYPE;
BEGIN
  FOR v_member IN SELECT * FROM reward_pool_members WHERE pool_id = p_pool.id LOOP
    INSERT INTO xp_transactions (profile_id, amount, reason)
    VALUES (v_member.profile_id, v_member.lp_spent, 'Refund: ' || p_reward_name || ' (group)');
  END LOOP;
  -- Restore the stock unit this pool reserved (unlimited stock is -1 → leave alone).
  UPDATE rewards SET quantity = quantity + 1 WHERE id = p_pool.reward_id AND quantity >= 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── 5. Open a pool (initiator reserves the first share) ─────────────────────────
CREATE OR REPLACE FUNCTION open_reward_pool(p_reward_id uuid)
RETURNS uuid AS $$
DECLARE
  v_caller     uuid := auth.uid();
  v_reward     rewards%ROWTYPE;
  v_lp         int;
  v_restricted boolean;
  v_pool_id    uuid;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT lp_balance, is_restricted INTO v_lp, v_restricted
  FROM profiles WHERE id = v_caller FOR UPDATE;
  IF v_restricted THEN RAISE EXCEPTION 'participation_restricted'; END IF;

  SELECT * INTO v_reward FROM rewards WHERE id = p_reward_id AND is_active = true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'reward_not_found'; END IF;
  IF v_reward.group_size < 2 THEN RAISE EXCEPTION 'not_a_group_reward'; END IF;
  IF v_reward.quantity = 0 THEN RAISE EXCEPTION 'reward_out_of_stock'; END IF;
  IF v_lp < v_reward.xp_cost THEN RAISE EXCEPTION 'insufficient_lp'; END IF;

  -- One active pool per reward per person keeps reservations unambiguous.
  IF EXISTS (
    SELECT 1 FROM reward_pool_members m
    JOIN reward_pools rp ON rp.id = m.pool_id
    WHERE m.profile_id = v_caller AND rp.reward_id = p_reward_id AND rp.status = 'open'
  ) THEN RAISE EXCEPTION 'already_in_pool'; END IF;

  -- Reserve one stock unit for this pool (restored on cancel/reject/expire).
  IF v_reward.quantity > 0 THEN
    UPDATE rewards SET quantity = quantity - 1 WHERE id = p_reward_id;
  END IF;

  INSERT INTO reward_pools (reward_id, initiated_by, group_size, per_person_lp)
  VALUES (p_reward_id, v_caller, v_reward.group_size, v_reward.xp_cost)
  RETURNING id INTO v_pool_id;

  INSERT INTO xp_transactions (profile_id, amount, reason)
  VALUES (v_caller, -v_reward.xp_cost, 'Group redemption: ' || v_reward.name || ' (reserved)');

  INSERT INTO reward_pool_members (pool_id, profile_id, lp_spent)
  VALUES (v_pool_id, v_caller, v_reward.xp_cost);

  RETURN v_pool_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── 6. Join an open pool (reserve an equal share; fill → pending) ────────────────
CREATE OR REPLACE FUNCTION join_reward_pool(p_pool_id uuid)
RETURNS void AS $$
DECLARE
  v_caller     uuid := auth.uid();
  v_pool       reward_pools%ROWTYPE;
  v_reward     rewards%ROWTYPE;
  v_lp         int;
  v_restricted boolean;
  v_count      int;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT * INTO v_pool FROM reward_pools WHERE id = p_pool_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'pool_not_found'; END IF;
  IF v_pool.status <> 'open' THEN RAISE EXCEPTION 'pool_not_open'; END IF;
  IF v_pool.expires_at <= now() THEN RAISE EXCEPTION 'pool_expired'; END IF;

  SELECT lp_balance, is_restricted INTO v_lp, v_restricted
  FROM profiles WHERE id = v_caller FOR UPDATE;
  IF v_restricted THEN RAISE EXCEPTION 'participation_restricted'; END IF;

  IF EXISTS (SELECT 1 FROM reward_pool_members WHERE pool_id = p_pool_id AND profile_id = v_caller) THEN
    RAISE EXCEPTION 'already_joined';
  END IF;

  SELECT * INTO v_reward FROM rewards WHERE id = v_pool.reward_id;

  -- Guard against being in two open pools for the same reward at once.
  IF EXISTS (
    SELECT 1 FROM reward_pool_members m
    JOIN reward_pools rp ON rp.id = m.pool_id
    WHERE m.profile_id = v_caller AND rp.reward_id = v_pool.reward_id AND rp.status = 'open'
  ) THEN RAISE EXCEPTION 'already_in_pool'; END IF;

  SELECT count(*) INTO v_count FROM reward_pool_members WHERE pool_id = p_pool_id;
  IF v_count >= v_pool.group_size THEN RAISE EXCEPTION 'pool_full'; END IF;
  IF v_lp < v_pool.per_person_lp THEN RAISE EXCEPTION 'insufficient_lp'; END IF;

  INSERT INTO xp_transactions (profile_id, amount, reason)
  VALUES (v_caller, -v_pool.per_person_lp, 'Group redemption: ' || v_reward.name || ' (reserved)');

  INSERT INTO reward_pool_members (pool_id, profile_id, lp_spent)
  VALUES (p_pool_id, v_caller, v_pool.per_person_lp);

  -- Full? Send to HR review.
  IF v_count + 1 >= v_pool.group_size THEN
    UPDATE reward_pools SET status = 'pending', filled_at = now() WHERE id = p_pool_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── 7. Leave an open pool ───────────────────────────────────────────────────────
-- A non-initiator just withdraws (refunded). If the initiator leaves, the whole
-- pool is cancelled and everyone is refunded.
CREATE OR REPLACE FUNCTION leave_reward_pool(p_pool_id uuid)
RETURNS void AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_pool   reward_pools%ROWTYPE;
  v_reward rewards%ROWTYPE;
  v_spent  int;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT * INTO v_pool FROM reward_pools WHERE id = p_pool_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'pool_not_found'; END IF;
  IF v_pool.status <> 'open' THEN RAISE EXCEPTION 'pool_not_open'; END IF;

  SELECT lp_spent INTO v_spent FROM reward_pool_members WHERE pool_id = p_pool_id AND profile_id = v_caller;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_a_member'; END IF;

  SELECT * INTO v_reward FROM rewards WHERE id = v_pool.reward_id;

  IF v_caller = v_pool.initiated_by THEN
    -- Initiator withdrawal collapses the pool: refund everyone, restore stock.
    PERFORM fn_unwind_reward_pool(v_pool, v_reward.name);
    UPDATE reward_pools SET status = 'cancelled', note = 'Initiator left' WHERE id = p_pool_id;
  ELSE
    INSERT INTO xp_transactions (profile_id, amount, reason)
    VALUES (v_caller, v_spent, 'Refund: ' || v_reward.name || ' (group)');
    DELETE FROM reward_pool_members WHERE pool_id = p_pool_id AND profile_id = v_caller;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── 8. Cancel an open pool (initiator or governor) ──────────────────────────────
CREATE OR REPLACE FUNCTION cancel_reward_pool(p_pool_id uuid, p_note text DEFAULT NULL)
RETURNS void AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_pool   reward_pools%ROWTYPE;
  v_reward rewards%ROWTYPE;
BEGIN
  SELECT * INTO v_pool FROM reward_pools WHERE id = p_pool_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'pool_not_found'; END IF;
  IF v_caller <> v_pool.initiated_by AND NOT can_govern_gamification() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF v_pool.status <> 'open' THEN RAISE EXCEPTION 'pool_not_open'; END IF;

  SELECT * INTO v_reward FROM rewards WHERE id = v_pool.reward_id;
  PERFORM fn_unwind_reward_pool(v_pool, v_reward.name);
  UPDATE reward_pools SET status = 'cancelled', note = p_note WHERE id = p_pool_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── 9. Governor review of a filled pool (approve / reject+refund / fulfill) ──────
CREATE OR REPLACE FUNCTION review_reward_pool(p_pool_id uuid, p_action text, p_note text DEFAULT NULL)
RETURNS void AS $$
DECLARE
  v_pool   reward_pools%ROWTYPE;
  v_reward rewards%ROWTYPE;
  v_member reward_pool_members%ROWTYPE;
BEGIN
  SELECT * INTO v_pool FROM reward_pools WHERE id = p_pool_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'pool_not_found'; END IF;
  SELECT * INTO v_reward FROM rewards WHERE id = v_pool.reward_id;

  IF p_action = 'approve' THEN
    IF NOT can_govern_gamification() THEN RAISE EXCEPTION 'forbidden'; END IF;
    IF v_pool.status <> 'pending' THEN RAISE EXCEPTION 'invalid_state'; END IF;
    UPDATE reward_pools SET status = 'approved', reviewed_by = auth.uid(),
           reviewed_at = now(), note = p_note WHERE id = p_pool_id;
    FOR v_member IN SELECT * FROM reward_pool_members WHERE pool_id = p_pool_id LOOP
      INSERT INTO notifications (profile_id, title, body, resource_type, resource_id)
      VALUES (v_member.profile_id, 'Group Reward Approved',
              'Your group "' || v_reward.name || '" redemption was approved.', 'reward_pool', p_pool_id::text);
    END LOOP;

  ELSIF p_action = 'fulfill' THEN
    IF NOT (can_govern_gamification() OR current_user_role() = 'finance') THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
    IF v_pool.status <> 'approved' THEN RAISE EXCEPTION 'invalid_state'; END IF;
    UPDATE reward_pools SET status = 'fulfilled', note = p_note WHERE id = p_pool_id;
    FOR v_member IN SELECT * FROM reward_pool_members WHERE pool_id = p_pool_id LOOP
      INSERT INTO notifications (profile_id, title, body, resource_type, resource_id)
      VALUES (v_member.profile_id, 'Group Reward Fulfilled',
              'Your group "' || v_reward.name || '" reward has been fulfilled.', 'reward_pool', p_pool_id::text);
    END LOOP;

  ELSIF p_action = 'reject' THEN
    IF NOT can_govern_gamification() THEN RAISE EXCEPTION 'forbidden'; END IF;
    IF v_pool.status NOT IN ('pending','approved') THEN RAISE EXCEPTION 'invalid_state'; END IF;
    PERFORM fn_unwind_reward_pool(v_pool, v_reward.name);
    UPDATE reward_pools SET status = 'rejected', reviewed_by = auth.uid(),
           reviewed_at = now(), note = p_note WHERE id = p_pool_id;
    FOR v_member IN SELECT * FROM reward_pool_members WHERE pool_id = p_pool_id LOOP
      INSERT INTO notifications (profile_id, title, body, resource_type, resource_id)
      VALUES (v_member.profile_id, 'Group Reward Declined',
              'Your group "' || v_reward.name || '" redemption was declined and '
              || v_member.lp_spent || ' LP refunded.', 'reward_pool', p_pool_id::text);
    END LOOP;
  ELSE
    RAISE EXCEPTION 'unknown_action';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── 10. Auto-expire unfilled pools (cron) ───────────────────────────────────────
CREATE OR REPLACE FUNCTION expire_reward_pools()
RETURNS void AS $$
DECLARE
  v_pool   reward_pools%ROWTYPE;
  v_reward rewards%ROWTYPE;
  v_member reward_pool_members%ROWTYPE;
BEGIN
  FOR v_pool IN
    SELECT * FROM reward_pools WHERE status = 'open' AND expires_at <= now() FOR UPDATE
  LOOP
    SELECT * INTO v_reward FROM rewards WHERE id = v_pool.reward_id;
    PERFORM fn_unwind_reward_pool(v_pool, v_reward.name);
    UPDATE reward_pools SET status = 'expired' WHERE id = v_pool.id;
    FOR v_member IN SELECT * FROM reward_pool_members WHERE pool_id = v_pool.id LOOP
      INSERT INTO notifications (profile_id, title, body, resource_type, resource_id)
      VALUES (v_member.profile_id, 'Group Reward Expired',
              'The group pool for "' || v_reward.name || '" expired unfilled and '
              || v_member.lp_spent || ' LP was refunded.', 'reward_pool', v_pool.id::text);
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Sweep every 30 minutes so reserved LP isn't held long after expiry.
SELECT cron.schedule('expire-reward-pools', '*/30 * * * *', $$SELECT expire_reward_pools();$$);
