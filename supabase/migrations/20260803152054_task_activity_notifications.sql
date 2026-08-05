-- Task-level notifications: card movement, priority, due date and assignment.
--
-- Subscription model, most-specific-wins:
--   • Assignees and the task's creator are subscribed implicitly — no row needed.
--   • Anyone else opts in with the task's Notify bell (task_watchers, muted = false).
--   • A row with muted = true opts you OUT of a task you'd otherwise receive by
--     assignment or creation. It is the "off" switch, not a delete.
--
-- Muting a task never silences @mentions: fn_notify_mention() is a separate path
-- that does not consult task_watchers. Tag someone and they always hear about it.
--
-- Project watchers are deliberately NOT included here — they keep their lighter
-- diet of "task added" and "new comment" from 20260719130003, so watching a busy
-- project doesn't mean a push for every card that moves.

CREATE TABLE task_watchers (
  task_id    uuid        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  profile_id uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  muted      boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, profile_id)
);

CREATE INDEX idx_task_watchers_profile ON task_watchers (profile_id);

ALTER TABLE task_watchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_task_watchers_select ON task_watchers FOR SELECT
  USING (is_internal() AND can_access_task(task_id));

-- You manage only your own subscription, and only on a task you can open.
CREATE POLICY p_task_watchers_write ON task_watchers FOR ALL
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid() AND is_internal() AND can_access_task(task_id));

-- ── Who hears about a change to this task ───────────────────────────────────────
-- Implicit subscribers ∪ opted-in watchers, minus anyone muted, minus the actor.
CREATE OR REPLACE FUNCTION fn_task_subscribers(p_task_id uuid, p_actor uuid)
RETURNS TABLE (profile_id uuid) AS $$
  SELECT s.profile_id
  FROM (
    SELECT ta.profile_id FROM task_assignees ta WHERE ta.task_id = p_task_id
    UNION
    SELECT t.created_by  FROM tasks t          WHERE t.id = p_task_id AND t.created_by IS NOT NULL
    UNION
    SELECT tw.profile_id FROM task_watchers tw WHERE tw.task_id = p_task_id AND NOT tw.muted
  ) s
  WHERE s.profile_id IS DISTINCT FROM p_actor
    AND NOT EXISTS (
      SELECT 1 FROM task_watchers m
      WHERE m.task_id = p_task_id AND m.profile_id = s.profile_id AND m.muted
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Board columns read as labels, not enum slugs, in a push notification.
CREATE OR REPLACE FUNCTION fn_task_status_label(p_status text) RETURNS text AS $$
  SELECT CASE p_status
    WHEN 'backlog'     THEN 'Backlog'
    WHEN 'todo'        THEN 'To Do'
    WHEN 'in_progress' THEN 'In Progress'
    WHEN 'review'      THEN 'Review'
    WHEN 'approved'    THEN 'Approved'
    WHEN 'completed'   THEN 'Completed'
    WHEN 'blocked'     THEN 'Blocked'
    ELSE initcap(replace(p_status, '_', ' '))
  END;
$$ LANGUAGE sql IMMUTABLE;

-- ── Status / priority / due date ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_notify_task_changed() RETURNS trigger AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_actor    text;
BEGIN
  -- A soft delete is not a board event, and neither is restoring one.
  IF NEW.deleted_at IS NOT NULL OR OLD.deleted_at IS NOT NULL THEN RETURN NULL; END IF;

  SELECT name INTO v_actor FROM profiles WHERE id = v_actor_id;
  v_actor := COALESCE(v_actor, 'Someone');

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM fn_notify(
      s.profile_id, 'task_activity',
      CASE WHEN NEW.status = 'blocked' THEN 'Task blocked' ELSE 'Task moved' END,
      v_actor || ' moved "' || NEW.title || '" to ' || fn_task_status_label(NEW.status),
      'task', NEW.id::text, v_actor_id
    )
    FROM fn_task_subscribers(NEW.id, v_actor_id) s;
  END IF;

  IF NEW.priority IS DISTINCT FROM OLD.priority THEN
    PERFORM fn_notify(
      s.profile_id, 'task_activity', 'Priority changed',
      v_actor || ' set "' || NEW.title || '" to ' || initcap(NEW.priority) || ' priority',
      'task', NEW.id::text, v_actor_id
    )
    FROM fn_task_subscribers(NEW.id, v_actor_id) s;
  END IF;

  IF NEW.due_date IS DISTINCT FROM OLD.due_date THEN
    PERFORM fn_notify(
      s.profile_id, 'task_activity',
      CASE WHEN NEW.due_date IS NULL THEN 'Due date cleared' ELSE 'Due date changed' END,
      CASE WHEN NEW.due_date IS NULL
           THEN v_actor || ' cleared the due date on "' || NEW.title || '"'
           ELSE v_actor || ' set "' || NEW.title || '" due ' || fn_fmt_day(NEW.due_date::date)
      END,
      'task', NEW.id::text, v_actor_id
    )
    FROM fn_task_subscribers(NEW.id, v_actor_id) s;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_notify_task_changed
  AFTER UPDATE OF status, priority, due_date ON tasks
  FOR EACH ROW EXECUTE FUNCTION fn_notify_task_changed();

-- ── Assigned / unassigned ───────────────────────────────────────────────────────
-- Its own type, because "this is now yours" outranks a field edit and people
-- should be able to keep it while switching general task chatter off.
CREATE OR REPLACE FUNCTION fn_notify_task_assignment() RETURNS trigger AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_actor    text;
  v_task_id  uuid;
  v_target   uuid;
  v_title    text;
  v_project  text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_task_id := NEW.task_id; v_target := NEW.profile_id;
  ELSE
    v_task_id := OLD.task_id; v_target := OLD.profile_id;
  END IF;

  SELECT t.title, p.name INTO v_title, v_project
  FROM tasks t LEFT JOIN projects p ON p.id = t.project_id
  WHERE t.id = v_task_id AND t.deleted_at IS NULL;

  -- Task is gone (cascade delete) or soft-deleted — nothing worth announcing.
  IF v_title IS NULL THEN RETURN NULL; END IF;

  SELECT name INTO v_actor FROM profiles WHERE id = v_actor_id;
  v_actor := COALESCE(v_actor, 'Someone');

  IF TG_OP = 'INSERT' THEN
    PERFORM fn_notify(
      v_target, 'task_assigned', 'Assigned to you',
      v_actor || ' assigned you "' || v_title || '"' || COALESCE(' in ' || v_project, ''),
      'task', v_task_id::text, v_actor_id
    );
  ELSE
    PERFORM fn_notify(
      v_target, 'task_assigned', 'Removed from a task',
      v_actor || ' removed you from "' || v_title || '"',
      'task', v_task_id::text, v_actor_id
    );
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_notify_task_assignment
  AFTER INSERT OR DELETE ON task_assignees
  FOR EACH ROW EXECUTE FUNCTION fn_notify_task_assignment();
