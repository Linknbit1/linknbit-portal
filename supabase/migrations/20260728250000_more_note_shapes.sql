-- Widen the sticky-note shape set.
--
-- Additive: no existing row changes, the constraint only gains values.

alter table sticky_notes drop constraint if exists sticky_notes_shape_check;

alter table sticky_notes
  add constraint sticky_notes_shape_check
  check (shape in (
    'square', 'folded', 'torn', 'cloud',
    'wavy', 'tag', 'petal', 'ticket', 'scallop'
  ));
