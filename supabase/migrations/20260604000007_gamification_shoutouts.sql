-- ════════════════════════════════════════════════════════════════════
-- GAMIFICATION REDESIGN — Part 3: Shoutouts (performance recognition)
-- Managers/Team Leads/HR issue shoutouts with written justification;
-- HR reviews before LP is awarded (policy §1.4.2).
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE shoutouts (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  from_profile_id uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_profile_id   uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category        text        NOT NULL,
  message         text        NOT NULL CHECK (char_length(message) >= 10),
  impact          text        NOT NULL DEFAULT 'standard' CHECK (impact IN ('standard','high')),
  lp_value        int         NOT NULL CHECK (lp_value > 0),
  status          text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by     uuid        REFERENCES profiles(id),
  reviewed_at     timestamptz,
  review_note     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (from_profile_id <> to_profile_id)
);

CREATE INDEX idx_shoutouts_to     ON shoutouts(to_profile_id, status);
CREATE INDEX idx_shoutouts_status ON shoutouts(status, created_at DESC);

ALTER TABLE shoutouts ENABLE ROW LEVEL SECURITY;

-- Approved shoutouts are a public recognition feed for internal staff.
CREATE POLICY p_shoutouts_approved ON shoutouts FOR SELECT
  USING (is_internal() AND status = 'approved');
-- Authors see their own (incl. pending/rejected); governors see everything for review.
CREATE POLICY p_shoutouts_own ON shoutouts FOR SELECT
  USING (from_profile_id = auth.uid() OR to_profile_id = auth.uid());
CREATE POLICY p_shoutouts_admin ON shoutouts FOR SELECT
  USING (can_govern_gamification());
-- All writes go through the SECURITY DEFINER RPCs below.

-- ── RPC: give a shoutout (creates a pending entry, no LP yet) ────────────────────
CREATE OR REPLACE FUNCTION give_shoutout(
  p_to_profile_id uuid, p_category text, p_message text, p_impact text DEFAULT 'standard'
) RETURNS uuid AS $$
DECLARE
  v_lp       int;
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

  v_lp := CASE WHEN p_impact = 'high' THEN 150 ELSE 100 END;

  INSERT INTO shoutouts (from_profile_id, to_profile_id, category, message, impact, lp_value)
  VALUES (auth.uid(), p_to_profile_id, p_category, p_message, p_impact, v_lp)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── RPC: HR reviews a shoutout (approve = award LP to recipient) ─────────────────
CREATE OR REPLACE FUNCTION review_shoutout(
  p_id uuid, p_approve boolean, p_note text DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_shout shoutouts%ROWTYPE;
BEGIN
  IF NOT can_govern_gamification() THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT * INTO v_shout FROM shoutouts WHERE id = p_id FOR UPDATE;
  IF NOT FOUND OR v_shout.status <> 'pending' THEN RAISE EXCEPTION 'shoutout_not_reviewable'; END IF;

  IF p_approve THEN
    UPDATE shoutouts SET status = 'approved', reviewed_by = auth.uid(),
           reviewed_at = now(), review_note = p_note WHERE id = p_id;

    INSERT INTO xp_transactions (profile_id, amount, reason, granted_by)
    VALUES (v_shout.to_profile_id, v_shout.lp_value,
            'Shoutout: ' || v_shout.category, auth.uid());

    INSERT INTO notifications (profile_id, title, body, resource_type, resource_id)
    VALUES (v_shout.to_profile_id, 'You got a Shoutout! 🌟',
            'You were recognized for "' || v_shout.category || '" — +' || v_shout.lp_value || ' LP.',
            'shoutout', v_shout.id::text);
  ELSE
    UPDATE shoutouts SET status = 'rejected', reviewed_by = auth.uid(),
           reviewed_at = now(), review_note = p_note WHERE id = p_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
