-- Retire the 'heart' sticky-note shape.
--
-- Existing heart notes are re-shaped BEFORE the constraint narrows, otherwise
-- the ALTER would fail on live rows. 'cloud' is the closest remaining
-- silhouette. Content, colour, angle and position are untouched — only the
-- outline changes.

update sticky_notes set shape = 'cloud' where shape = 'heart';

alter table sticky_notes drop constraint if exists sticky_notes_shape_check;

alter table sticky_notes
  add constraint sticky_notes_shape_check
  check (shape in ('square', 'folded', 'torn', 'cloud'));
