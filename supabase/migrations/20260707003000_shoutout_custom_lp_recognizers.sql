-- ════════════════════════════════════════════════════════════════════
-- GAMIFICATION — Shoutouts: open custom LP amount to all recognizers
-- Previously custom LP was governors-only; widen to any recognizer
-- (managers, team leads, HR, admins). Still capped 1–500 and still
-- enters as 'pending' for HR review before LP is awarded.
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION give_shoutout(
  p_to_profile_id uuid, p_category text, p_message text,
  p_impact text DEFAULT 'standard', p_lp_value int DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_lp       int;
  v_impact   text;
  v_to_role  text;
  v_id       uuid;
BEGIN
  IF NOT can_recognize() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_to_profile_id = auth.uid() THEN RAISE EXCEPTION 'cannot_shoutout_self'; END IF;
  IF char_length(coalesce(p_message,'')) < 10 THEN RAISE EXCEPTION 'justification_required'; END IF;

  SELECT role INTO v_to_role FROM profiles WHERE id = p_to_profile_id;
  IF v_to_role IS NULL OR v_to_role IN ('client_owner','client_member') THEN
    RAISE EXCEPTION 'invalid_recipient';
  END IF;

  IF p_lp_value IS NOT NULL THEN
    -- Custom LP amount: any recognizer, bounded to avoid typos. HR review still gates the award.
    IF NOT can_recognize() THEN RAISE EXCEPTION 'custom_lp_forbidden'; END IF;
    IF p_lp_value < 1 OR p_lp_value > 500 THEN RAISE EXCEPTION 'lp_out_of_range'; END IF;
    v_lp     := p_lp_value;
    v_impact := CASE WHEN p_lp_value > 150 THEN 'high' ELSE 'standard' END;
  ELSE
    v_lp     := CASE WHEN p_impact = 'high' THEN 150 ELSE 100 END;
    v_impact := CASE WHEN p_impact = 'high' THEN 'high' ELSE 'standard' END;
  END IF;

  INSERT INTO shoutouts (from_profile_id, to_profile_id, category, message, impact, lp_value)
  VALUES (auth.uid(), p_to_profile_id, p_category, p_message, v_impact, v_lp)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
