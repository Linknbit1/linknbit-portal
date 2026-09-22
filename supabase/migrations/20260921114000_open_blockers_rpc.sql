-- Give a blocker somewhere to go.
--
-- standup_entries.blocker has existed since the standup module shipped and had
-- been filled in ZERO times across 576 entries. Not because nobody is ever
-- blocked: because it was an optional box on a form with nothing downstream of
-- it. Raising one changed nothing, nobody was told, and so nobody bothered. The
-- same shape as estimated_minutes sitting at 10% — a field nothing reads is a
-- field nobody fills.
--
-- This is the downstream. open_blockers() returns blockers raised in the last few
-- days, scoped exactly as standups are: your own always, everybody's with
-- can_view_standups, your team's with can_view_team_standups. It drives a panel at
-- the top of My Day that is invisible when nothing is stuck, so it costs nothing
-- on an ordinary day and is impossible to miss on a bad one.
--
-- p_days is clamped to 60 so a caller cannot turn this into a full history scan.

CREATE OR REPLACE FUNCTION public.open_blockers(p_days integer DEFAULT 7)
RETURNS TABLE(
  entry_id uuid,
  profile_id uuid,
  profile_name text,
  avatar_url text,
  standup_date date,
  project_name text,
  task_name text,
  blocker text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    se.id, p.id, p.name, p.avatar_url, s.standup_date,
    COALESCE(se.project_name, pr.name),
    COALESCE(se.task_name, se.title),
    se.blocker
  FROM standup_entries se
  JOIN standups s  ON s.id = se.standup_id
  JOIN profiles p  ON p.id = s.profile_id
  LEFT JOIN projects pr ON pr.id = se.project_id
  WHERE se.blocker IS NOT NULL
    AND btrim(se.blocker) <> ''
    AND s.standup_date >= CURRENT_DATE - GREATEST(0, LEAST(p_days, 60))
    AND is_internal()
    AND (
      s.profile_id = auth.uid()
      OR has_feature('can_view_standups')
      OR (has_feature('can_view_team_standups') AND shares_team_with(s.profile_id))
    )
  ORDER BY s.standup_date DESC, p.name;
$function$;

REVOKE EXECUTE ON FUNCTION public.open_blockers(integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.open_blockers(integer) TO authenticated;
