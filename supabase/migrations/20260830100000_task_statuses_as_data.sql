-- Task statuses become rows, and one of them can be marked as the review column.
--
-- They were a CHECK constraint on tasks.status listing seven literals, mirrored
-- in six hard-coded arrays in the front end. Nothing could be added, nothing
-- renamed beyond a label override, and "review" meant the string 'review' in a
-- trigger. Marking WHICH column means review is the whole point: a board whose
-- review column is called "QA" or "Client sign-off" should still notify the
-- reviewers when a card lands in it.
--
-- Flags rather than more hard-coded keys, so behaviour follows the marker and
-- not the name:
--
--   is_review   dropping a card here notifies the task's reviewers
--   is_signoff  needs can_approve_tasks to move into (was 'approved','completed')
--   is_done     finished, so it drops off My Day and "your work"
--   is_default  what a new task starts as
--
-- The CHECK becomes a foreign key. It is the same guarantee expressed against a
-- table instead of a literal list, so a status can be added without a migration
-- and cannot be deleted while any task still sits in it. ON UPDATE CASCADE means
-- renaming a key carries the tasks with it.

CREATE TABLE IF NOT EXISTS task_statuses (
  key        text PRIMARY KEY,
  label      text NOT NULL,
  color      text NOT NULL,
  sort_order int  NOT NULL DEFAULT 0,
  is_review  boolean NOT NULL DEFAULT false,
  is_signoff boolean NOT NULL DEFAULT false,
  is_done    boolean NOT NULL DEFAULT false,
  is_default boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

COMMENT ON TABLE task_statuses IS
  'The board columns. Behaviour follows the flags, never the key, so a renamed column keeps working.';

-- Seeded to exactly today's behaviour: same keys, same labels, same colours as
-- the front end shipped, so nothing moves on the day this lands.
INSERT INTO task_statuses (key, label, color, sort_order, is_review, is_signoff, is_done, is_default) VALUES
  ('backlog',     'Backlog',     '#7A8597', 1, false, false, false, false),
  ('todo',        'To Do',       '#7A8597', 2, false, false, false, true),
  ('in_progress', 'In Progress', '#22C55E', 3, false, false, false, false),
  ('review',      'Review',      '#60A5FA', 4, true,  false, false, false),
  ('approved',    'Approved',    '#22C55E', 5, false, true,  true,  false),
  ('completed',   'Completed',   '#7A8597', 6, false, true,  true,  false),
  ('blocked',     'Blocked',     '#F4364C', 7, false, false, false, false)
ON CONFLICT (key) DO NOTHING;

-- Any label or colour already overridden on the Statuses screen wins, so an
-- existing customisation is not quietly reverted by this migration.
UPDATE task_statuses ts
   SET label = sl.label, color = sl.color
  FROM status_labels sl
 WHERE sl.scope = 'task' AND sl.key = ts.key;

-- At most one review column, and exactly one default. Enforced rather than
-- checked in the UI: two review columns would double every notification.
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_statuses_one_review
  ON task_statuses ((true)) WHERE is_review;
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_statuses_one_default
  ON task_statuses ((true)) WHERE is_default;

-- ── The CHECK becomes a foreign key ──────────────────────────────────────────
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks
  ADD CONSTRAINT tasks_status_fkey FOREIGN KEY (status)
  REFERENCES task_statuses(key) ON UPDATE CASCADE ON DELETE RESTRICT;

-- ── Behaviour follows the flags ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_notify_task_reviewers()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_title text; v_is_review boolean; v_was_review boolean;
BEGIN
  SELECT COALESCE(bool_or(ts.is_review) FILTER (WHERE ts.key = NEW.status), false),
         COALESCE(bool_or(ts.is_review) FILTER (WHERE ts.key = OLD.status), false)
    INTO v_is_review, v_was_review
    FROM task_statuses ts;

  -- Only on the way IN. A card edited while sitting in review has not become
  -- newly reviewable, and moving between two non-review columns is not news.
  IF NOT v_is_review OR v_was_review THEN RETURN NEW; END IF;

  SELECT title INTO v_title FROM tasks WHERE id = NEW.id;

  PERFORM fn_notify(tr.profile_id, 'task_review_requested', 'Ready for your review',
                    coalesce(v_title, 'A task') || ' has moved to review',
                    'task', NEW.id::text, auth.uid())
    FROM task_reviewers tr
   WHERE tr.task_id = NEW.id;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION fn_notify_task_reviewers() FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION fn_guard_task_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status
     AND EXISTS (SELECT 1 FROM task_statuses ts WHERE ts.key = NEW.status AND ts.is_signoff)
     AND NOT has_feature('can_approve_tasks') THEN
    RAISE EXCEPTION 'forbidden_task_signoff'
      USING HINT = 'Only a project manager or team lead can sign a task off.';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION fn_guard_task_approval() FROM public, anon, authenticated;

-- ── Access ───────────────────────────────────────────────────────────────────
ALTER TABLE task_statuses ENABLE ROW LEVEL SECURITY;

-- Everyone internal reads them: they are the board's columns.
DROP POLICY IF EXISTS p_task_statuses_select ON task_statuses;
CREATE POLICY p_task_statuses_select ON task_statuses FOR SELECT USING (is_internal());

DROP POLICY IF EXISTS p_task_statuses_write ON task_statuses;
CREATE POLICY p_task_statuses_write ON task_statuses FOR ALL
  USING     (is_internal() AND has_feature('can_manage_services'))
  WITH CHECK (is_internal() AND has_feature('can_manage_services'));
