-- Give existing notes room for the pin head.
--
-- The pushpin now sits ON the sheet, with its head projecting ~41px above the
-- top edge. Notes parked closer than that to the top of the board would have
-- their pin sliced off by the board's clipping. This nudges only those rows
-- down to the minimum; nothing else about them changes.

update sticky_notes set pos_y = 41 where pos_y < 41;
