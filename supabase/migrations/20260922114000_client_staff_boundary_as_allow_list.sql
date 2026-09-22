-- The staff/client line was a deny-list of two strings.
--
-- is_internal() read `role NOT IN ('client_owner','client_member')`, repeated
-- across fifteen functions. Everything that was not one of those two literals was
-- therefore staff: a role invented on the Roles screen, a typo in a slug, a future
-- 'client_viewer' — all internal, with Projects, Tasks, People, Teams, the
-- attendance roster and the handbook. The one boundary the whole permission system
-- sits inside failed open.
--
-- roles.is_client makes it an allow-list. profiles.role is still what gets tested,
-- because a client user is defined by their role rather than by a capability —
-- the documented exception in CLAUDE.md, not a lapse from it.
--
-- NOTE: this migration alone was not enough, and the next two finish it. There
-- were no `roles` rows for the client slugs (20260922115000), and an unknown slug
-- still fell through as internal (20260922116000). Kept as three steps because
-- that is the order they were found in.

ALTER TABLE public.roles
  ADD COLUMN IF NOT EXISTS is_client boolean NOT NULL DEFAULT false;

UPDATE public.roles SET is_client = true WHERE slug IN ('client_owner', 'client_member');

COMMENT ON COLUMN public.roles.is_client IS
  'This role belongs to the client portal. The staff/client boundary is an allow-list: a role is client-side only when this says so.';
