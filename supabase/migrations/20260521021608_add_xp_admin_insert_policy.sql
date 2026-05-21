-- Admins can directly INSERT positive XP transactions (for manual XP grants).
-- The trigger fn_apply_xp_transaction fires on insert and updates profiles.xp_total.
-- No balance check needed since grants are strictly positive — unlike redeem_reward
-- which deducts and needs row-locking. Only admins and super_admins can grant.
CREATE POLICY p_xp_admin_insert ON xp_transactions FOR INSERT
  WITH CHECK (
    current_user_role() IN ('super_admin', 'admin')
    AND amount > 0
  );
