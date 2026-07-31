-- Per-note size (edge length in board units). Default 232 matches the fixed
-- NOTE_SIZE the board used before this, so every existing note keeps its exact
-- look. Bounded so a note can't be shrunk into an untappable dot or grown past
-- the pin-headroom maths.

ALTER TABLE sticky_notes
  ADD COLUMN IF NOT EXISTS size integer NOT NULL DEFAULT 232
    CHECK (size BETWEEN 120 AND 360);
