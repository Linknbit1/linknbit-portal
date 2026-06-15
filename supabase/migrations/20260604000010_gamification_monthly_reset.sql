-- ════════════════════════════════════════════════════════════════════
-- GAMIFICATION REDESIGN — Part 6: Monthly LP reset + history (policy §1.5)
-- On the 1st of each month: snapshot every employee's final monthly LP
-- (with rank, for cash-reward eligibility), then zero the wallet.
-- Reputation is permanent and untouched.
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE monthly_lp_history (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period     date        NOT NULL,            -- first day of the closed month
  lp_final   int         NOT NULL,
  rank       int,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, period)
);

CREATE INDEX idx_mlh_period ON monthly_lp_history(period, rank);

ALTER TABLE monthly_lp_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_mlh_own ON monthly_lp_history FOR SELECT
  USING (profile_id = auth.uid());
CREATE POLICY p_mlh_admin ON monthly_lp_history FOR SELECT
  USING (can_govern_gamification() OR current_user_role() = 'finance');

-- ── Reset routine ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_monthly_lp_reset()
RETURNS void AS $$
DECLARE
  -- When run on the 1st, "yesterday" lands in the month we are closing.
  v_period date := date_trunc('month', ((now() AT TIME ZONE 'Asia/Karachi')::date - 1))::date;
BEGIN
  INSERT INTO monthly_lp_history (profile_id, period, lp_final, rank)
  SELECT p.id, v_period, p.lp_balance,
         rank() OVER (ORDER BY p.lp_balance DESC)
  FROM profiles p
  WHERE p.is_active AND p.role NOT IN ('client_owner','client_member')
  ON CONFLICT (profile_id, period) DO NOTHING;

  UPDATE profiles SET lp_balance = 0
  WHERE role NOT IN ('client_owner','client_member');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Manual trigger for admins (testing / off-cycle close).
CREATE OR REPLACE FUNCTION admin_run_monthly_reset()
RETURNS void AS $$
BEGIN
  IF current_user_role() NOT IN ('super_admin','admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  PERFORM fn_monthly_lp_reset();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Schedule: 00:05 on the 1st of every month (pg_cron enabled in an earlier migration).
SELECT cron.schedule('monthly-lp-reset', '5 0 1 * *', $$SELECT fn_monthly_lp_reset();$$);
