-- Budget behind its own boundary.
--
-- can_view_budget was a UI-only gate: two screens hid the field, but
-- projects.budget shipped in the payload of every fetchProjects() call, so anybody
-- who could open a project could read it from the network tab or straight off the
-- REST endpoint. RLS is row-level and cannot withhold one column, which is why the
-- permission had nowhere to live.
--
-- This is the EXPAND step. project_budgets holds the number behind a policy that
-- actually tests can_view_budget. projects.budget stays, mirrored, because the
-- deployed bundle still selects it — dropping it now would break every tab open at
-- deploy time. The CONTRACT migration that drops the column comes once the front
-- end reading this table is live, per CLAUDE.md.
--
-- Until then the leak is narrowed, not closed: 20260922118000 shuts the other way
-- out, which was the reports RPC.

CREATE TABLE IF NOT EXISTS public.project_budgets (
  project_id uuid PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  amount     numeric,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.project_budgets (project_id, amount)
SELECT id, budget FROM public.projects WHERE budget IS NOT NULL
ON CONFLICT (project_id) DO NOTHING;

ALTER TABLE public.project_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_project_budgets_select ON public.project_budgets
  FOR SELECT
  USING (is_internal() AND has_feature('can_view_budget'));

CREATE POLICY p_project_budgets_write ON public.project_budgets
  FOR ALL
  USING (is_internal() AND has_feature('can_view_budget') AND has_feature('can_manage_projects'))
  WITH CHECK (is_internal() AND has_feature('can_view_budget') AND has_feature('can_manage_projects'));

-- Keeps the old column true while it still exists, so an unreloaded tab shows the
-- same number as a fresh one. Removed by the contract migration.
CREATE OR REPLACE FUNCTION public.fn_mirror_project_budget()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE projects SET budget = NULL WHERE id = OLD.project_id;
    RETURN OLD;
  END IF;
  NEW.updated_at := now();
  IF NEW.updated_by IS NULL THEN NEW.updated_by := auth.uid(); END IF;
  UPDATE projects SET budget = NEW.amount WHERE id = NEW.project_id;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_project_budgets_mirror ON public.project_budgets;
CREATE TRIGGER trg_project_budgets_mirror
  BEFORE INSERT OR UPDATE OR DELETE ON public.project_budgets
  FOR EACH ROW EXECUTE FUNCTION fn_mirror_project_budget();

CREATE INDEX IF NOT EXISTS idx_project_budgets_updated_by ON public.project_budgets (updated_by);
