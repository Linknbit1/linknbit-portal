-- Personal sticky-note board, plus a per-user colour theme.
--
-- Neither is gated on a hardcoded email address. Access to the board is a
-- permission like any other, granted through a role, so it can be given to or
-- taken from anyone in Settings without a code change. The theme is a profile
-- preference with a default, for the same reason.

-- ── Board ────────────────────────────────────────────────────────────────────
create table if not exists sticky_notes (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  content    text not null default '',
  -- Presentation is stored, not derived: a note that changes shape or angle on
  -- every render stops feeling like an object pinned to a board.
  color      text not null default 'pink',
  shape      text not null default 'square',
  rotation   smallint not null default 0,
  pos_x      int not null default 24,
  pos_y      int not null default 24,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sticky_notes_color_check
    check (color in ('pink','lavender','mint','peach','butter','sky')),
  constraint sticky_notes_shape_check
    check (shape in ('square','folded','torn','heart','cloud')),
  constraint sticky_notes_rotation_check
    check (rotation between -15 and 15)
);

create index if not exists sticky_notes_profile_idx on sticky_notes (profile_id);

drop trigger if exists trg_sticky_notes_touch on sticky_notes;
create trigger trg_sticky_notes_touch before update on sticky_notes
  for each row execute function fn_touch_updated_at();

-- Private by construction: a board is only ever visible to the person it
-- belongs to. No admin override - there is nothing here worth overriding, and
-- an exception would only create a way to read someone's private notes.
alter table sticky_notes enable row level security;

drop policy if exists p_sticky_notes_own on sticky_notes;
create policy p_sticky_notes_own on sticky_notes
  for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

comment on table sticky_notes is
  'Personal pin-board notes. Owner-only by RLS; visibility of the feature itself is gated on can_use_sticky_notes.';

-- ── Feature permission ───────────────────────────────────────────────────────
insert into permissions (key, label, category, sort_order, description) values
  ('can_use_sticky_notes', 'Use sticky notes', 'Workspace', 90,
   'Show the personal sticky-note board. Notes are always private to their owner.')
on conflict (key) do nothing;

-- A dedicated role so the feature can be handed out from Settings. Ranked low:
-- it grants nothing beyond the board, so it should never confer authority.
insert into roles (slug, name, color, position, is_system)
values ('sticky-notes', 'Sticky Notes', '#F9A8D4', 5, false)
on conflict (slug) do nothing;

insert into role_permissions (role_id, permission_key)
select r.id, 'can_use_sticky_notes' from roles r where r.slug = 'sticky-notes'
on conflict do nothing;

insert into profile_roles (profile_id, role_id)
select p.id, r.id
from profiles p
cross join roles r
where p.email = 'syeda.arooba@linknbit.com'
  and r.slug = 'sticky-notes'
on conflict do nothing;

-- ── Per-user theme ───────────────────────────────────────────────────────────
alter table profiles
  add column if not exists theme text not null default 'default';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_theme_check') then
    alter table profiles
      add constraint profiles_theme_check check (theme in ('default','jade'));
  end if;
end $$;

comment on column profiles.theme is
  'Accent palette for the internal portal. Overrides the brand CSS variables on the app root.';

update profiles set theme = 'jade' where email = 'syeda.arooba@linknbit.com';
