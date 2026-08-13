-- What a file is for, in the uploader's words.
--
-- A filename carries almost nothing — "final_v3.pdf" tells the next person
-- neither what it contains nor why it was attached. This is the one line that
-- does, captured at upload rather than asked for later, which is the only
-- moment anyone actually knows.

ALTER TABLE attachments ADD COLUMN IF NOT EXISTS description text;

COMMENT ON COLUMN attachments.description IS
  'Uploader-supplied note about what this file is. Optional; shown beside the file name.';
