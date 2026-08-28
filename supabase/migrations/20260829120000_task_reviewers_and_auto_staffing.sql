-- Two things, and the second is the reason the first is easy to use.
--
-- ── 1. Reviewers ─────────────────────────────────────────────────────────────
-- A task says who is doing it and never said who is checking it. "Review" was a
-- status with nobody's name against it, so the question "waiting on whom?" had
-- no answer. Reviewers work exactly like assignees: any number of them, and a
-- reviewer can read the task they are reviewing, which is not something to have
-- to remember to arrange separately.
--
-- ── 2. Picking somebody who is not staffed yet ───────────────────────────────
-- The service picker already works this way: choose a service the project does
-- not run and it is added to the project. The same should be true of people.
-- Assigning work to someone not staffed on that service used to mean leaving
-- the form, staffing them, and coming back, so the picker only ever offered the
-- handful already there.
--
-- Done as a trigger rather than in the form: assignment happens from the task
-- drawer, the board, the form and the API, and a rule that has to be repeated at
-- four call sites is a rule that is missing at one of them.

-- ── Reviewers ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_reviewers (
  task_id    uuid        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  profile_id uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_task_reviewers_profile ON task_reviewers (profile_id);

COMMENT ON TABLE task_reviewers IS
  'Who is expected to check this task. Same shape as task_assignees; a reviewer can read the task they review.';

ALTER TABLE task_reviewers ENABLE ROW LEVEL SECURITY;

-- Same gate as task_assignees: if you can see the task, you can see who is on it.
DROP POLICY IF EXISTS p_task_reviewers_select ON task_reviewers;
CREATE POLICY p_task_reviewers_select ON task_reviewers FOR SELECT
  USING (is_internal() AND can_access_task(task_id));

DROP POLICY IF EXISTS p_task_reviewers_write ON task_reviewers;
CREATE POLICY p_task_reviewers_write ON task_reviewers FOR ALL
  USING     (is_internal() AND can_access_task(task_id))
  WITH CHECK (is_internal() AND can_access_task(task_id));

-- ── Reviewing something you cannot open is not reviewing ────────────────────
CREATE OR REPLACE FUNCTION public.task_visible(
  p_task_id     uuid,
  p_project_id  uuid,
  p_assignee_id uuid,
  p_created_by  uuid
) RETURNS boolean AS $$
  SELECT
    current_user_role() IN ('super_admin', 'admin', 'finance')
    OR p_assignee_id = auth.uid()
    OR p_created_by  = auth.uid()
    OR EXISTS (
      SELECT 1 FROM task_assignees ta
      WHERE ta.task_id = p_task_id AND ta.profile_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM task_reviewers tr
      WHERE tr.task_id = p_task_id AND tr.profile_id = auth.uid()
    )
    OR is_project_manager(p_project_id)
    OR (
      current_user_role() = 'team_lead'
      AND (
        (p_assignee_id IS NOT NULL AND shares_team_with(p_assignee_id))
        OR EXISTS (
          SELECT 1 FROM task_assignees ta
          WHERE ta.task_id = p_task_id AND shares_team_with(ta.profile_id)
        )
        OR (
          p_assignee_id IS NULL
          AND NOT EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = p_task_id)
          AND (is_project_member(p_project_id) OR is_project_creator(p_project_id))
        )
      )
    )
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ── Putting somebody on a task staffs them onto its service ─────────────────
-- SECURITY DEFINER because the person doing the assigning may not themselves be
-- allowed to edit the service roster; being permitted to hand out the work is
-- the permission that matters, and the RLS on task_assignees / task_reviewers
-- has already established it.
CREATE OR REPLACE FUNCTION fn_staff_service_on_task_link()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_service uuid;
BEGIN
  SELECT t.project_service_id INTO v_service FROM tasks t WHERE t.id = NEW.task_id;
  IF v_service IS NULL THEN RETURN NEW; END IF;

  INSERT INTO service_members (project_service_id, profile_id)
  VALUES (v_service, NEW.profile_id)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_task_assignees_staff_service ON task_assignees;
CREATE TRIGGER trg_task_assignees_staff_service
  AFTER INSERT ON task_assignees
  FOR EACH ROW EXECUTE FUNCTION fn_staff_service_on_task_link();

DROP TRIGGER IF EXISTS trg_task_reviewers_staff_service ON task_reviewers;
CREATE TRIGGER trg_task_reviewers_staff_service
  AFTER INSERT ON task_reviewers
  FOR EACH ROW EXECUTE FUNCTION fn_staff_service_on_task_link();

-- The single-assignee column takes the same route, since the board and the
-- older write paths still set it directly.
CREATE OR REPLACE FUNCTION fn_staff_service_on_assignee_column()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.assignee_id IS NOT NULL AND NEW.project_service_id IS NOT NULL THEN
    INSERT INTO service_members (project_service_id, profile_id)
    VALUES (NEW.project_service_id, NEW.assignee_id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tasks_staff_assignee ON tasks;
CREATE TRIGGER trg_tasks_staff_assignee
  AFTER INSERT OR UPDATE OF assignee_id, project_service_id ON tasks
  FOR EACH ROW EXECUTE FUNCTION fn_staff_service_on_assignee_column();

-- ── Telling the reviewer ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_notify_task_reviewers()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_title text;
BEGIN
  -- Only on the way INTO review. A task that is edited while sitting in review
  -- has not become newly reviewable.
  IF NEW.status <> 'review' OR OLD.status = 'review' THEN RETURN NEW; END IF;

  SELECT title INTO v_title FROM tasks WHERE id = NEW.id;

  PERFORM fn_notify(tr.profile_id, 'task_review_requested', 'Ready for your review',
                    coalesce(v_title, 'A task') || ' has moved to Review',
                    'task', NEW.id::text, auth.uid())
    FROM task_reviewers tr
   WHERE tr.task_id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tasks_notify_reviewers ON tasks;
CREATE TRIGGER trg_tasks_notify_reviewers
  AFTER UPDATE OF status ON tasks
  FOR EACH ROW EXECUTE FUNCTION fn_notify_task_reviewers();
