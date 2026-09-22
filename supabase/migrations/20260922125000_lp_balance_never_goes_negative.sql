-- A points balance is a wallet, and wallets do not go negative.
--
-- fn_apply_xp_transaction added the amount straight onto lp_balance with no
-- floor. Nothing had ever tested it, because nothing wrote a negative amount
-- until 20260922124000's reversal did — and the very first correction pushed a
-- departed employee's balance to -3.
--
-- reputation_total already ignored negatives and is left alone: reputation
-- records what somebody earned, not what they can spend, so undoing a day's
-- points should not erase the history of having earned them.

CREATE OR REPLACE FUNCTION public.fn_apply_xp_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE profiles
  SET lp_balance       = GREATEST(0, lp_balance + NEW.amount),
      reputation_total = reputation_total + GREATEST(NEW.amount, 0)
  WHERE id = NEW.profile_id;
  RETURN NEW;
END;
$function$;

UPDATE profiles SET lp_balance = 0 WHERE lp_balance < 0;
