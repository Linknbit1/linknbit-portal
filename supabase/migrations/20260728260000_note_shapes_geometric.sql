-- Retire the round 'cloud' shape and add geometric ones.
--
-- Existing cloud notes are re-shaped to 'square' BEFORE the constraint narrows,
-- or the ALTER would fail on live rows. Only the outline changes — content,
-- colour, angle and board position are untouched.

update sticky_notes set shape = 'square' where shape = 'cloud';

alter table sticky_notes drop constraint if exists sticky_notes_shape_check;

alter table sticky_notes
  add constraint sticky_notes_shape_check
  check (shape in (
    'square', 'folded', 'torn', 'wavy', 'tag', 'ticket', 'scallop', 'petal',
    'parallelogram', 'star', 'house', 'bubble', 'hexagon', 'pennant'
  ));
