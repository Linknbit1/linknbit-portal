-- Editable names and colours for the fixed status set.
--
-- Deliberately NOT a replacement for the status columns. tasks.status and
-- projects.status keep their CHECK constraints, and the seventeen triggers that
-- key on 'completed' / 'in_progress' keep working, because the *keys* never
-- change — only how they are shown. Anything that reads a status still reads
-- the same string it always did.
--
-- Rows are presentation, so a missing one is not an error: the UI falls back to
-- its built-in label and colour. That also means this table can be emptied to
-- reset everything to defaults.

CREATE TABLE status_labels (
  scope      text        NOT NULL CHECK (scope IN ('task', 'project')),
  key        text        NOT NULL,
  label      text        NOT NULL CHECK (btrim(label) <> ''),
  color      text        NOT NULL CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  updated_by uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope, key)
);

COMMENT ON TABLE status_labels IS
  'Display name and colour per status key. Presentation only — the keys themselves are fixed by the CHECK constraints on tasks.status / projects.status.';

ALTER TABLE status_labels ENABLE ROW LEVEL SECURITY;

-- Everyone internal renders chips, so everyone reads. Only admins rewrite them.
CREATE POLICY p_status_labels_select ON status_labels FOR SELECT
  USING (is_internal());
CREATE POLICY p_status_labels_write ON status_labels FOR ALL
  USING     (current_user_role() IN ('super_admin', 'admin'))
  WITH CHECK (current_user_role() IN ('super_admin', 'admin'));

-- Seeded with what the UI already shows, so opening the screen shows the
-- current state rather than blanks waiting to be filled in. Task colours are the
-- board's per-column hues; project colours match their chips.
INSERT INTO status_labels (scope, key, label, color) VALUES
  ('task', 'backlog',           'Backlog',         '#8A93A3'),
  ('task', 'todo',              'To Do',           '#60A5FA'),
  ('task', 'in_progress',       'In Progress',     '#F59E0B'),
  ('task', 'review',            'Review',          '#A78BFA'),
  ('task', 'approved',          'Approved',        '#22C55E'),
  ('task', 'completed',         'Completed',       '#2DD4BF'),
  ('task', 'blocked',           'Blocked',         '#F4364C'),
  ('project', 'todo',            'To Do',           '#8A93A3'),
  ('project', 'in_progress',     'In Progress',     '#22C55E'),
  ('project', 'ongoing',         'Ongoing',         '#60A5FA'),
  ('project', 'awaiting_client', 'Awaiting Client', '#F59E0B'),
  ('project', 'blocked',         'Blocked',         '#F4364C'),
  ('project', 'on_hold',         'On Hold',         '#8A93A3'),
  ('project', 'completed',       'Completed',       '#7A8597')
ON CONFLICT (scope, key) DO NOTHING;
