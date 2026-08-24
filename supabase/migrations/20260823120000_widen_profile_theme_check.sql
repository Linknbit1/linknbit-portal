-- Widen profiles.theme to admit the themes added with the Linknbit 3.0 restyle.
--
-- The original constraint (20260728230000) allowed only ('default','jade'). The
-- portal now ships a third theme, and the constraint is the only thing stopping
-- a user from selecting it.
--
-- Purely additive: it widens the accepted set and removes nothing, so a client
-- running the previous bundle keeps working unchanged — no expand/migrate/
-- contract needed. Every existing row already holds 'default' or 'jade', both of
-- which stay valid, so the constraint validates without a backfill.

alter table profiles
  drop constraint if exists profiles_theme_check;

alter table profiles
  add constraint profiles_theme_check
  check (theme in ('default', 'jade', 'violet'));

comment on column profiles.theme is
  'Per-user colour theme. Maps to a `theme-<value>` class on <html> (see '
  'src/constants/themes.ts and the theme blocks in src/index.css). '
  '''default'' is the Crimson palette and needs no class.';
