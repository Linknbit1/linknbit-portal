-- Pinned destinations: the four places a given person actually opens every day,
-- above the grouped menu.
--
-- Grouping is a ranking problem that has to be re-solved every time a module is
-- added, and every re-solve makes it worse for somebody. Pinning hands the
-- ranking to the only person who knows the answer.
--
-- `path` is deliberately free-form rather than an enum of known routes: a pin is
-- whatever the person had on screen, which includes a specific project, a chat
-- channel, or a filtered list whose query string IS the saved view. Storing a
-- route key instead would make saved views need a second table for no reason.
--
-- Purely additive: a new table nothing else references.

create table if not exists public.nav_pins (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  label      text not null,
  path       text not null,
  -- Lucide icon name, resolved client-side against a small allow-list; null
  -- falls back to a generic pin so an unknown name can never break the sidebar.
  icon       text,
  position   integer not null default 0,
  created_at timestamptz not null default now(),

  constraint nav_pins_label_len check (char_length(btrim(label)) between 1 and 60),
  -- Relative in-app paths only. An absolute URL here would turn a pin into an
  -- open redirect rendered as trusted chrome.
  constraint nav_pins_path_shape check (path ~ '^/[^/]' and char_length(path) <= 500),
  constraint nav_pins_unique_path unique (profile_id, path)
);

create index if not exists nav_pins_profile_position_idx
  on public.nav_pins (profile_id, position, created_at);

alter table public.nav_pins enable row level security;

-- Owner-only, all four verbs: a pin is a personal preference and nobody else —
-- including an admin — has any reason to read or write another person's.
drop policy if exists nav_pins_select_own on public.nav_pins;
create policy nav_pins_select_own on public.nav_pins
  for select using (profile_id = auth.uid());

drop policy if exists nav_pins_insert_own on public.nav_pins;
create policy nav_pins_insert_own on public.nav_pins
  for insert with check (profile_id = auth.uid());

drop policy if exists nav_pins_update_own on public.nav_pins;
create policy nav_pins_update_own on public.nav_pins
  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());

drop policy if exists nav_pins_delete_own on public.nav_pins;
create policy nav_pins_delete_own on public.nav_pins
  for delete using (profile_id = auth.uid());

comment on table public.nav_pins is
  'Per-person pinned destinations shown above the grouped sidebar. A pin whose path carries a query string is a saved view.';
