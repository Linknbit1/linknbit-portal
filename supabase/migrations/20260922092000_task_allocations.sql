-- The plan: one row per person per task per day.
--
-- This is the record the portal has never had. Work could say "10 hours, due
-- Friday" and a person could say "I work Mon-Fri" and nothing joined the two, so
-- no screen could answer "what is Ahmad doing on Tuesday, and is Tuesday full?"
-- That is not a missing screen, it is a missing table.
--
-- One row per DAY rather than a date range with a total. A range row saves
-- storage and costs arithmetic on every single read; at this scale rows are free
-- and clarity is not. It also makes the interactions trivial: dragging a task to
-- another day is one UPDATE, over-allocation is one SUM against
-- fn_available_minutes, and "move Tuesday's work to Wednesday" does not have to
-- split anything.
--
-- Three separate things now exist per person per day, and they must never be
-- added together:
--   task_allocations  what somebody intends        (this table)
--   task_time_entries what the clock measured
--   standup_entries   what the person reported
-- A useful report is the variance between them, which is also the only thing that
-- tells you whether estimates are getting better.
--
-- Writing is for whoever plans the work: can_manage_projects, or the project's
-- own manager. Reading is wider — the person whose day it is, plus anybody who
-- can already see the task, so somebody can see their own week without being
-- able to rewrite it.

CREATE TABLE IF NOT EXISTS public.task_allocations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         uuid NOT NULL REFERENCES public.tasks(id)    ON DELETE CASCADE,
  profile_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day             date NOT NULL,
  planned_minutes integer NOT NULL,
  start_time      time,
  end_time        time,
  note            text,
  created_by      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT task_allocations_one_per_task_person_day UNIQUE (task_id, profile_id, day),
  CONSTRAINT task_allocations_minutes_sane CHECK (planned_minutes > 0 AND planned_minutes <= 1440),
  CONSTRAINT task_allocations_times_consistent CHECK (
    (start_time IS NULL AND end_time IS NULL) OR
    (start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
  )
);

CREATE INDEX IF NOT EXISTS idx_task_allocations_profile_day ON public.task_allocations (profile_id, day);
CREATE INDEX IF NOT EXISTS idx_task_allocations_task        ON public.task_allocations (task_id);
CREATE INDEX IF NOT EXISTS idx_task_allocations_created_by  ON public.task_allocations (created_by);

ALTER TABLE public.task_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_task_allocations_select ON public.task_allocations
  FOR SELECT
  USING (
    is_internal()
    AND (profile_id = (select auth.uid()) OR can_access_task(task_id))
  );

CREATE POLICY p_task_allocations_write ON public.task_allocations
  FOR ALL
  USING (
    is_internal()
    AND (
      has_feature('can_manage_projects')
      OR EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_allocations.task_id AND is_project_manager(t.project_id))
    )
  )
  WITH CHECK (
    is_internal()
    AND (
      has_feature('can_manage_projects')
      OR EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_allocations.task_id AND is_project_manager(t.project_id))
    )
  );

CREATE OR REPLACE FUNCTION public.fn_touch_task_allocation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at := now();
  IF TG_OP = 'INSERT' AND NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_task_allocations_touch ON public.task_allocations;
CREATE TRIGGER trg_task_allocations_touch
  BEFORE INSERT OR UPDATE ON public.task_allocations
  FOR EACH ROW EXECUTE FUNCTION fn_touch_task_allocation();

COMMENT ON TABLE public.task_allocations IS
  'One row per person per task per day: the plan. Distinct from task_time_entries (what the clock measured) and standup_entries (what the person reported).';
