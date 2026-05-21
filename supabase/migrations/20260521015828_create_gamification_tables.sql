-- ─────────────────────────────────────────
-- XP TRANSACTIONS  (immutable ledger)
-- ─────────────────────────────────────────
CREATE TABLE xp_transactions (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount     int         NOT NULL,   -- positive = earned, negative = spent
  reason     text        NOT NULL,
  task_id    uuid,                   -- FK to tasks added in Phase 5 (tasks table doesn't exist yet)
  granted_by uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
  -- Immutable ledger: no updated_at, no soft-delete. Corrections via reversal entries.
);

ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_xp_own_select ON xp_transactions FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY p_xp_admin_select ON xp_transactions FOR SELECT
  USING (current_user_role() IN ('super_admin', 'admin'));

-- No INSERT/UPDATE/DELETE: only via SECURITY DEFINER functions (fn_apply_xp_transaction, redeem_reward)

-- ─────────────────────────────────────────
-- REWARDS
-- ─────────────────────────────────────────
CREATE TABLE rewards (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  description text,
  xp_cost     int         NOT NULL CHECK (xp_cost > 0),
  quantity    int         DEFAULT -1 CHECK (quantity >= -1),  -- -1 = unlimited
  image_url   text,
  is_active   boolean     NOT NULL DEFAULT true,
  created_by  uuid        REFERENCES profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_rewards_select ON rewards FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY p_rewards_write ON rewards FOR ALL
  USING     (current_user_role() IN ('super_admin', 'admin'))
  WITH CHECK (current_user_role() IN ('super_admin', 'admin'));

-- ─────────────────────────────────────────
-- REWARD REDEMPTIONS
-- ─────────────────────────────────────────
CREATE TABLE reward_redemptions (
  id          uuid               PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid               NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reward_id   uuid               NOT NULL REFERENCES rewards(id) ON DELETE RESTRICT,
  xp_spent    int                NOT NULL,
  status      redemption_status  NOT NULL DEFAULT 'pending',
  reviewed_by uuid               REFERENCES profiles(id),
  reviewed_at timestamptz,
  note        text,
  created_at  timestamptz        NOT NULL DEFAULT now()
);

ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_redemptions_own ON reward_redemptions FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY p_redemptions_admin ON reward_redemptions FOR SELECT
  USING (current_user_role() IN ('super_admin', 'admin'));

CREATE POLICY p_redemptions_admin_update ON reward_redemptions FOR UPDATE
  USING (current_user_role() IN ('super_admin', 'admin'));

-- No INSERT: only via redeem_reward() SECURITY DEFINER function.
-- Direct INSERT bypasses the FOR UPDATE row locks and XP balance check.

-- ─────────────────────────────────────────
-- QUESTS
-- ─────────────────────────────────────────
CREATE TABLE quests (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text        NOT NULL,
  description     text,
  xp_reward       int         NOT NULL CHECK (xp_reward > 0),
  condition_type  text        NOT NULL
                    CHECK (condition_type IN ('tasks_completed','on_time_streak','comments_added','tasks_reviewed')),
  condition_value jsonb       NOT NULL,
  is_active       boolean     NOT NULL DEFAULT true,
  repeatable      boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_quests_select ON quests FOR SELECT
  USING (is_internal() AND is_active = true);

CREATE POLICY p_quests_admin_write ON quests FOR ALL
  USING     (current_user_role() IN ('super_admin', 'admin'))
  WITH CHECK (current_user_role() IN ('super_admin', 'admin'));

-- ─────────────────────────────────────────
-- QUEST PROGRESS
-- ─────────────────────────────────────────
CREATE TABLE quest_progress (
  profile_id   uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quest_id     uuid        NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  progress     int         NOT NULL DEFAULT 0,
  completed    boolean     NOT NULL DEFAULT false,
  completed_at timestamptz,
  PRIMARY KEY (profile_id, quest_id)
);

ALTER TABLE quest_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_quest_progress_own ON quest_progress FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY p_quest_progress_admin ON quest_progress FOR SELECT
  USING (current_user_role() IN ('super_admin', 'admin'));

-- No INSERT/UPDATE: managed exclusively by SECURITY DEFINER trigger functions

-- ─────────────────────────────────────────
-- ATOMIC REWARD REDEMPTION FUNCTION
-- Locks profile and reward rows to prevent race conditions.
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION redeem_reward(p_profile_id uuid, p_reward_id uuid)
RETURNS uuid AS $$
DECLARE
  v_reward         rewards%ROWTYPE;
  v_xp_total       int;
  v_redemption_id  uuid;
BEGIN
  SELECT * INTO v_reward FROM rewards
  WHERE id = p_reward_id AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'reward_not_found';
  END IF;

  IF v_reward.quantity = 0 THEN
    RAISE EXCEPTION 'reward_out_of_stock';
  END IF;

  SELECT xp_total INTO v_xp_total FROM profiles
  WHERE id = p_profile_id
  FOR UPDATE;

  IF v_xp_total < v_reward.xp_cost THEN
    RAISE EXCEPTION 'insufficient_xp';
  END IF;

  IF v_reward.quantity > 0 THEN
    UPDATE rewards SET quantity = quantity - 1 WHERE id = p_reward_id;
  END IF;

  INSERT INTO xp_transactions (profile_id, amount, reason)
  VALUES (p_profile_id, -v_reward.xp_cost, 'Reward redemption: ' || v_reward.name);

  INSERT INTO reward_redemptions (profile_id, reward_id, xp_spent)
  VALUES (p_profile_id, p_reward_id, v_reward.xp_cost)
  RETURNING id INTO v_redemption_id;

  RETURN v_redemption_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
