-- ════════════════════════════════════════════════════════════════════
-- Quest Board: let every internal staff member see who claimed a quest.
--
-- The quest_task_claims table keeps full-row RLS (owner + reviewers only)
-- so proof URLs / notes stay private. This SECURITY DEFINER function
-- exposes ONLY claimant identity (name, avatar, status) for active claims
-- to any internal user, powering the "claimed by" UI on the quest board.
--
-- Purely additive — no tables or rows are touched.
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_quest_claimants()
RETURNS TABLE (
  claim_id   uuid,
  task_id    uuid,
  profile_id uuid,
  name       text,
  avatar_url text,
  status     text,
  claimed_at timestamptz
) AS $$
  SELECT c.id, c.task_id, c.profile_id, p.name, p.avatar_url, c.status, c.claimed_at
  FROM quest_task_claims c
  JOIN profiles p ON p.id = c.profile_id
  WHERE is_internal()
    AND c.status IN ('claimed', 'submitted', 'approved')
  ORDER BY c.claimed_at;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
