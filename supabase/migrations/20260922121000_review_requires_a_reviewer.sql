-- A task could enter Review with nobody reviewing it.
--
-- 13 of the 30 tasks in Review had no task_reviewers row, so they were waiting on
-- nobody. They sit 11 days on average, worst 34: what a queue with no owner looks
-- like.
--
-- Reads task_statuses.is_review rather than the literal 'review', for the same
-- reason the done-set now reads is_done: a status is a row, not a keyword.
--
-- Existing rows are left alone. A reviewer cannot be invented for thirteen tasks,
-- and rejecting the next save on work somebody is mid-way through is worse than
-- the state they are in. The rule binds from now; the thirteen are surfaced on the
-- Projects nav badge instead, so somebody assigns them.

CREATE OR REPLACE FUNCTION public.fn_guard_review_has_reviewer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status
     AND EXISTS (SELECT 1 FROM task_statuses ts WHERE ts.key = NEW.status AND ts.is_review)
     AND NOT EXISTS (SELECT 1 FROM task_reviewers tr WHERE tr.task_id = NEW.id) THEN
    RAISE EXCEPTION 'reviewer_required'
      USING HINT = 'Name at least one reviewer before moving this into review.';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_tasks_review_needs_reviewer ON public.tasks;
CREATE TRIGGER trg_tasks_review_needs_reviewer
  BEFORE UPDATE OF status ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION fn_guard_review_has_reviewer();
