-- Sticky-note text styling + stacking order.
--
-- Formatting is whole-note (not per-character): a note is bold or it isn't. That
-- keeps the model a few plain columns instead of rich-text spans, and matches the
-- one-line toolbar UX — pick a look for the note, done.
--
-- z_index gives notes an explicit paint order so a note can be brought on top of
-- another. Default 0 = "unset"; the board raises a note by stamping it with the
-- current max + 1, so newly-raised notes always win over everything below.

ALTER TABLE sticky_notes
  ADD COLUMN IF NOT EXISTS bold          boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS italic        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS strikethrough boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS text_align    text    NOT NULL DEFAULT 'left'
    CHECK (text_align IN ('left', 'center', 'right')),
  ADD COLUMN IF NOT EXISTS z_index       integer NOT NULL DEFAULT 0;
