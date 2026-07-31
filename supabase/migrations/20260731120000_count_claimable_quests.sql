-- Sidebar badge: number of quests a member can actually claim right now.
--
-- quest_tasks.status is never auto-closed — it stays 'open' forever unless an
-- admin edits it — so counting status='open' inflates the badge with expired and
-- full quests. This mirrors the availability logic in claim_quest_task():
--   open  AND  not past deadline  AND  live claims < max_claims
-- where a live claim is one in ('claimed','submitted','approved').
--
-- SECURITY DEFINER because quest_task_claims is RLS-private (owner + reviewers).
-- Counting claims client-side would let a regular member see only their own
-- claims and undercount, so a full quest would wrongly look claimable to them.
-- Returns a single int, so the always-mounted sidebar fetches almost nothing.

CREATE OR REPLACE FUNCTION public.count_open_claimable_quests()
RETURNS integer
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT count(*)::int
  FROM quest_tasks q
  WHERE auth.uid() IS NOT NULL
    AND q.status = 'open'
    AND (q.deadline IS NULL OR q.deadline > now())
    AND (
      SELECT count(*)
      FROM quest_task_claims c
      WHERE c.task_id = q.id
        AND c.status IN ('claimed', 'submitted', 'approved')
    ) < q.max_claims;
$$;

REVOKE ALL ON FUNCTION public.count_open_claimable_quests() FROM anon;
