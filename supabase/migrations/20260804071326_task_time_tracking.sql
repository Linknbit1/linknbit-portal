-- Task time tracking: what a task actually cost, next to what it was estimated at.
--
-- The estimate half already exists — tasks.estimated_minutes arrived with project
-- templates and was never surfaced on the task form. This migration adds the
-- "actual" half, plus notifications for both.
--
-- Shape: one row per stretch of work. ended_at IS NULL means the timer is still
-- running, which is what lets the partial unique index below enforce "one running
-- timer per person" in the database instead of in app code. A manual entry is the
-- same shape with both ends supplied at once.

CREATE TABLE task_time_entries (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    uuid        NOT NULL REFERENCES tasks(id)    ON DELETE CASCADE,
  profile_id uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL,
  ended_at   timestamptz,
  note       text,
  billable   boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT task_time_entries_range CHECK (ended_at IS NULL OR ended_at > started_at)
);

CREATE INDEX idx_tte_task    ON task_time_entries (task_id, started_at DESC);
CREATE INDEX idx_tte_profile ON task_time_entries (profile_id, started_at DESC);

-- One running timer per person, workspace-wide. Starting a second timer stops the
-- first (the API does that explicitly); this is the backstop that keeps two
-- devices from racing into a double count.
CREATE UNIQUE INDEX idx_tte_one_running ON task_time_entries (profile_id) WHERE ended_at IS NULL;

CREATE TRIGGER trg_tte_updated_at
  BEFORE UPDATE ON task_time_entries
  FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

ALTER TABLE task_time_entries ENABLE ROW LEVEL SECURITY;

-- ── Visibility ─────────────────────────────────────────────────────────────────
-- Your own time always; your team's if you share a team (the same helper the
-- attendance module uses); everything if you run projects or hold the books.
-- Never on a task you cannot already open, and never for client roles.
CREATE POLICY p_tte_select ON task_time_entries FOR SELECT
  USING (
    is_internal()
    AND can_access_task(task_id)
    AND (
      profile_id = auth.uid()
      OR current_user_role() IN ('super_admin', 'admin', 'project_manager', 'finance')
      OR shares_team_with(profile_id)
    )
  );

-- You log your own time, on a task you can open.
CREATE POLICY p_tte_write_own ON task_time_entries FOR ALL
  USING (profile_id = auth.uid() AND is_internal())
  WITH CHECK (profile_id = auth.uid() AND is_internal() AND can_access_task(task_id));

-- Correcting someone else's timesheet is a management act.
CREATE POLICY p_tte_write_managed ON task_time_entries FOR ALL
  USING (is_internal() AND current_user_role() IN ('super_admin', 'admin', 'project_manager'))
  WITH CHECK (is_internal() AND current_user_role() IN ('super_admin', 'admin', 'project_manager'));

-- ── Notifications ──────────────────────────────────────────────────────────────
-- Reuses fn_task_subscribers(): assignees ∪ creator ∪ opted-in watchers, minus
-- anyone muted, minus whoever acted. So logging your own time never pings you,
-- but it does reach the people the task is tagged to.

CREATE OR REPLACE FUNCTION fn_fmt_minutes(p_minutes int) RETURNS text AS $$
  SELECT CASE
    WHEN p_minutes IS NULL OR p_minutes <= 0 THEN '0m'
    WHEN p_minutes < 60 THEN p_minutes || 'm'
    WHEN p_minutes % 60 = 0 THEN (p_minutes / 60) || 'h'
    ELSE (p_minutes / 60) || 'h ' || (p_minutes % 60) || 'm'
  END;
$$ LANGUAGE sql IMMUTABLE;

-- Fires when a stretch of work is closed out: a stopped timer or a manual entry.
-- A merely *started* timer stays silent — it is not news yet, and it would fire
-- again the moment it stopped.
CREATE OR REPLACE FUNCTION fn_notify_time_logged() RETURNS trigger AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_actor    text;
  v_title    text;
  v_minutes  int;
BEGIN
  IF NEW.ended_at IS NULL THEN RETURN NULL; END IF;
  IF TG_OP = 'UPDATE' AND OLD.ended_at IS NOT NULL THEN RETURN NULL; END IF;

  SELECT t.title INTO v_title FROM tasks t WHERE t.id = NEW.task_id AND t.deleted_at IS NULL;
  IF v_title IS NULL THEN RETURN NULL; END IF;

  SELECT name INTO v_actor FROM profiles WHERE id = COALESCE(v_actor_id, NEW.profile_id);
  v_actor := COALESCE(v_actor, 'Someone');

  v_minutes := (EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at)) / 60)::int;

  PERFORM fn_notify(
    s.profile_id, 'task_activity', 'Time logged',
    v_actor || ' logged ' || fn_fmt_minutes(v_minutes) || ' on "' || v_title || '"',
    'task', NEW.task_id::text, v_actor_id
  )
  FROM fn_task_subscribers(NEW.task_id, v_actor_id) s;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_notify_time_logged
  AFTER INSERT OR UPDATE OF ended_at ON task_time_entries
  FOR EACH ROW EXECUTE FUNCTION fn_notify_time_logged();

-- ── Estimate changes ───────────────────────────────────────────────────────────
-- Extends the existing task-change notifier rather than adding a second trigger,
-- so estimate edits arrive on the same 'task_activity' channel as status,
-- priority and due date. Unchanged apart from the new branch; the trigger is
-- recreated only to widen its UPDATE OF column list.
CREATE OR REPLACE FUNCTION fn_notify_task_changed() RETURNS trigger AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_actor    text;
BEGIN
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

  IF NEW.estimated_minutes IS DISTINCT FROM OLD.estimated_minutes THEN
    PERFORM fn_notify(
      s.profile_id, 'task_activity',
      CASE WHEN NEW.estimated_minutes IS NULL THEN 'Estimate cleared' ELSE 'Estimate changed' END,
      CASE WHEN NEW.estimated_minutes IS NULL
           THEN v_actor || ' cleared the estimate on "' || NEW.title || '"'
           ELSE v_actor || ' estimated "' || NEW.title || '" at ' || fn_fmt_minutes(NEW.estimated_minutes)
      END,
      'task', NEW.id::text, v_actor_id
    )
    FROM fn_task_subscribers(NEW.id, v_actor_id) s;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_notify_task_changed ON tasks;
CREATE TRIGGER trg_notify_task_changed
  AFTER UPDATE OF status, priority, due_date, estimated_minutes ON tasks
  FOR EACH ROW EXECUTE FUNCTION fn_notify_task_changed();
