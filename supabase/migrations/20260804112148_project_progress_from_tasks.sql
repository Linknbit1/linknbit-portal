-- projects.progress has always been a plain column that nothing wrote, so every
-- project rendered a 0% bar regardless of how much work was finished. This keeps
-- it maintained from the tasks that belong to the project.
--
-- Counts only top-level, live tasks (parent_task_id IS NULL, deleted_at IS NULL)
-- so the number matches the task lists the UI actually shows. 'approved' counts
-- as done alongside 'completed' — the board's Done column groups both.
--
-- The IS DISTINCT FROM guard matters: without it every task write would touch
-- the project row and hand fn_audit_capture() a fresh "projects.updated" entry
-- even when the percentage had not moved.

CREATE OR REPLACE FUNCTION fn_recalc_project_progress(p_project uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pct int;
BEGIN
  IF p_project IS NULL THEN RETURN; END IF;

  SELECT COALESCE(
    round(100.0 * count(*) FILTER (WHERE status IN ('completed', 'approved')) / NULLIF(count(*), 0)),
    0
  )::int
  INTO v_pct
  FROM tasks
  WHERE project_id = p_project
    AND deleted_at IS NULL
    AND parent_task_id IS NULL;

  UPDATE projects
  SET progress = v_pct
  WHERE id = p_project
    AND progress IS DISTINCT FROM v_pct;
END;
$$;

CREATE OR REPLACE FUNCTION fn_tasks_touch_project_progress()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM fn_recalc_project_progress(OLD.project_id);
  ELSE
    PERFORM fn_recalc_project_progress(NEW.project_id);
    -- A task moved between projects leaves the old one stale otherwise.
    IF TG_OP = 'UPDATE' AND NEW.project_id IS DISTINCT FROM OLD.project_id THEN
      PERFORM fn_recalc_project_progress(OLD.project_id);
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

-- deleted_at is in the column list because a soft delete changes the denominator.
CREATE TRIGGER trg_tasks_project_progress
  AFTER INSERT OR DELETE OR UPDATE OF status, deleted_at, project_id ON tasks
  FOR EACH ROW EXECUTE FUNCTION fn_tasks_touch_project_progress();

-- Backfill every existing project from its current tasks. The audit trigger is
-- muted for the duration: this is a one-off correction, not something a person
-- did, and it would otherwise stamp "projects updated" onto every project.
ALTER TABLE projects DISABLE TRIGGER trg_audit_projects;
SELECT fn_recalc_project_progress(id) FROM projects;
ALTER TABLE projects ENABLE TRIGGER trg_audit_projects;
