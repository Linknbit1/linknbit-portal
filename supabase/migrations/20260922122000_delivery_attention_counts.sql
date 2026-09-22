-- What is stuck, counted only for somebody who can unstick it.
--
-- CLAUDE.md has always specified warning counts on the Projects and Tasks nav
-- rows. They were never built, so 80 overdue and 10 blocked tasks sat in the
-- portal with nothing anywhere saying so.
--
-- Scoped like every other badge here: only what THIS viewer can act on. A number
-- you cannot drive to zero is noise, and an employee seeing the company's overdue
-- count would be exactly that.
--
--   overdue          past due, not done, and you are on it
--   blocked          blocked, and you are on it or you manage the project
--   review_no_owner  in review with no reviewer named. Only for whoever could
--                    assign one — this is how the 13 pre-existing ones surface.

CREATE OR REPLACE FUNCTION public.delivery_attention_counts()
RETURNS TABLE(overdue integer, blocked integer, review_no_owner integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH mine AS (
    SELECT t.*,
           EXISTS (SELECT 1 FROM task_assignees ta
                    WHERE ta.task_id = t.id AND ta.profile_id = auth.uid()) AS is_mine,
           (has_feature('can_manage_projects') OR is_project_manager(t.project_id)) AS i_manage
      FROM tasks t
     WHERE t.deleted_at IS NULL
       AND is_internal()
       AND NOT EXISTS (SELECT 1 FROM task_statuses ts WHERE ts.key = t.status AND ts.is_done)
  )
  SELECT
    COUNT(*) FILTER (WHERE due_date IS NOT NULL AND due_date < now() AND is_mine)::int,
    COUNT(*) FILTER (WHERE status = 'blocked' AND (is_mine OR i_manage))::int,
    COUNT(*) FILTER (
      WHERE i_manage
        AND EXISTS (SELECT 1 FROM task_statuses ts WHERE ts.key = mine.status AND ts.is_review)
        AND NOT EXISTS (SELECT 1 FROM task_reviewers tr WHERE tr.task_id = mine.id)
    )::int
  FROM mine;
$function$;

REVOKE EXECUTE ON FUNCTION public.delivery_attention_counts() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.delivery_attention_counts() TO authenticated;
