-- ════════════════════════════════════════════════════════════════════
-- The working day gets a lunch break, and the standup stops being hardcoded.
--
-- Two things were baked into fn_standup_window and submit_standup as literals:
-- the moment the window opens (work_end − 5 min), the on-time cutoff (+60 min),
-- and the reward (5 XP). All three are now settings, alongside a minimum length
-- for an entry's description.
--
-- The break matters beyond attendance: it is what turns 09:00–18:00 into eight
-- hours rather than nine, and eight hours is the amount of work a standup now
-- has to account for.
-- ════════════════════════════════════════════════════════════════════

-- ── Lunch break on the working day ───────────────────────────────────────────
ALTER TABLE attendance_settings
  ADD COLUMN IF NOT EXISTS break_start_time time,
  ADD COLUMN IF NOT EXISTS break_end_time   time;

UPDATE attendance_settings
   SET break_start_time = COALESCE(break_start_time, '13:00'::time),
       break_end_time   = COALESCE(break_end_time,   '14:00'::time);

-- Both or neither, and the end must follow the start. A half-configured break
-- would silently subtract nothing, or a negative amount, from the working day.
ALTER TABLE attendance_settings
  DROP CONSTRAINT IF EXISTS attendance_settings_break_pair,
  ADD  CONSTRAINT attendance_settings_break_pair CHECK (
    (break_start_time IS NULL) = (break_end_time IS NULL)
    AND (break_start_time IS NULL OR break_end_time > break_start_time)
  );

COMMENT ON COLUMN attendance_settings.break_start_time IS
  'Start of the unpaid lunch break. Subtracted from the working day when computing required standup hours.';

-- ── Standup configuration ────────────────────────────────────────────────────
-- Its own singleton rather than more columns on attendance_settings: these are
-- standup rules, and the attendance table is already nineteen columns of a
-- different subject.
CREATE TABLE IF NOT EXISTS standup_settings (
  singleton              boolean     PRIMARY KEY DEFAULT true CHECK (singleton),

  -- How the opening moment is decided.
  --   'relative' — opens `unlock_offset_min` before the working day ends, and
  --                follows the day automatically when its hours change.
  --   'fixed'    — opens at `unlock_time` on the clock. The settings screen
  --                shifts this with the working day when the day moves, so the
  --                two cannot silently drift apart.
  unlock_mode            text        NOT NULL DEFAULT 'relative'
                                     CHECK (unlock_mode IN ('relative', 'fixed')),
  unlock_offset_min      integer     NOT NULL DEFAULT 5
                                     CHECK (unlock_offset_min BETWEEN 0 AND 480),
  unlock_time            time        NOT NULL DEFAULT '17:55',

  -- Submit within this many minutes of opening to count as on time — the
  -- window that used to be a hardcoded 60.
  on_time_window_min     integer     NOT NULL DEFAULT 60
                                     CHECK (on_time_window_min BETWEEN 5 AND 1440),

  -- What an on-time standup is worth. Was 5, in a string literal, in one RPC.
  xp_on_time             integer     NOT NULL DEFAULT 5
                                     CHECK (xp_on_time BETWEEN 0 AND 500),

  -- Shortest acceptable description for a single entry.
  min_work_done_chars    integer     NOT NULL DEFAULT 100
                                     CHECK (min_work_done_chars BETWEEN 15 AND 1000),

  -- Whether the logged total has to match the day's required hours exactly.
  -- Off turns the requirement into guidance the form shows but does not enforce.
  enforce_required_hours boolean     NOT NULL DEFAULT true,

  updated_by             uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at             timestamptz NOT NULL DEFAULT now()
);

INSERT INTO standup_settings (singleton) VALUES (true) ON CONFLICT DO NOTHING;

ALTER TABLE standup_settings ENABLE ROW LEVEL SECURITY;

-- Everyone internal reads it: the form needs the minimum length and the
-- required-hours rule to explain itself before a submission is attempted.
DROP POLICY IF EXISTS p_standup_settings_read ON standup_settings;
CREATE POLICY p_standup_settings_read ON standup_settings FOR SELECT
  USING (is_internal());

DROP POLICY IF EXISTS p_standup_settings_write ON standup_settings;
CREATE POLICY p_standup_settings_write ON standup_settings FOR UPDATE
  USING (has_feature('can_manage_standups'))
  WITH CHECK (has_feature('can_manage_standups'));

CREATE OR REPLACE FUNCTION fn_touch_standup_settings()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_standup_settings_touch ON standup_settings;
CREATE TRIGGER trg_standup_settings_touch
  BEFORE UPDATE ON standup_settings
  FOR EACH ROW EXECUTE FUNCTION fn_touch_standup_settings();

-- ── The working day, in minutes ──────────────────────────────────────────────
-- One definition, used by the window, the submit guard and the UI alike.
CREATE OR REPLACE FUNCTION fn_working_day_minutes()
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT GREATEST(
    0,
    EXTRACT(EPOCH FROM (s.work_end_time - s.work_start_time))::int / 60
      - COALESCE(EXTRACT(EPOCH FROM (s.break_end_time - s.break_start_time))::int / 60, 0)
  )
  FROM attendance_settings s
  LIMIT 1;
$$;

COMMENT ON FUNCTION fn_working_day_minutes() IS
  'Length of a full working day in minutes: day end minus day start, less the lunch break.';
