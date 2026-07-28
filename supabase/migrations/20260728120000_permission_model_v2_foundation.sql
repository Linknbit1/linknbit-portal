-- Permission model v2, part 1 of 2: tables and seed data.
--
-- See docs/permission-model-v2.md.
--
-- This migration is PURELY ADDITIVE. Nothing reads these tables yet, so it
-- cannot change anyone's access. has_feature() is switched over in the
-- follow-up migration, only after the equivalence check passes.
--
-- role_feature_flags is deliberately left in place: it is the reference for
-- the equivalence test and the rollback path.

-- ── Catalog of what can be permitted ─────────────────────────────────────────
create table if not exists permissions (
  key         text primary key,
  label       text not null,
  description text,
  category    text not null,
  sort_order  int  not null default 0
);

insert into permissions (key, label, category, sort_order, description) values
  ('administrator',           'Administrator',              'Governance', 0,  'Grants every permission, including future ones. Assign sparingly.'),
  ('can_manage_roles',        'Manage roles',               'Governance', 1,  'Create, edit and assign roles and their permissions.'),
  ('can_view_audit_log',      'View audit log',             'Governance', 2,  'Read the audit trail of changes across the portal.'),
  ('can_govern_gamification', 'Govern gamification',        'Governance', 3,  'Administer XP, levels, badges, quests and rewards.'),
  ('can_recognize',           'Give recognition',           'Governance', 4,  'Post shoutouts and award recognition to others.'),
  ('can_manage_projects',     'Manage projects',            'Projects',   10, 'Create and edit projects, services, stages and tasks.'),
  ('can_approve_tasks',       'Approve tasks',              'Projects',   11, 'Move a task into the approved state.'),
  ('can_view_budget',         'View budgets',               'Projects',   12, 'See project budget figures.'),
  ('can_manage_clients',      'Manage clients',             'Clients',    20, 'Create and edit client organisations and their members.'),
  ('can_manage_people',       'Manage people',              'People',     30, 'Create, edit and deactivate staff profiles.'),
  ('can_manage_attendance',   'Manage attendance',          'Attendance', 40, 'Edit attendance records, holidays and schedules.'),
  ('can_view_all_attendance', 'View all attendance',        'Attendance', 41, 'See attendance company-wide rather than team-scoped.'),
  ('can_approve_requests',    'Approve time-off requests',  'Attendance', 42, 'Approve or reject leave, WFH and overtime requests.'),
  ('can_create_channels',     'Create channels',            'Chat',       50, 'Create new chat channels.'),
  ('can_manage_all_channels', 'Manage all channels',        'Chat',       51, 'Administer any channel, including ones you are not in.'),
  ('can_delete_any_message',  'Delete any message',         'Chat',       52, 'Remove messages posted by other people.'),
  ('can_manage_standups',     'Manage standups',            'Standups',   60, 'Configure standup schedules and participation.'),
  ('can_view_confidential',   'View confidential files',    'Documents',  70, 'Open documents marked confidential.'),
  ('can_view_reports',        'View reports',               'Reports',    80, 'Access the reporting and analytics pages.')
on conflict (key) do nothing;

-- ── Roles are data ───────────────────────────────────────────────────────────
create table if not exists roles (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  color       text,
  position    int  not null,
  is_system   boolean not null default false,
  is_default  boolean not null default false,
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Exactly one role may be the default for new profiles.
create unique index if not exists roles_one_default on roles (is_default) where is_default;
create index if not exists roles_position_idx on roles (position desc);

drop trigger if exists trg_roles_touch on roles;
create trigger trg_roles_touch before update on roles
  for each row execute function fn_touch_updated_at();

-- Positions are spaced by 10 so custom roles can be slotted between them.
insert into roles (slug, name, color, position, is_system, is_default) values
  ('super_admin',     'Super Admin',     '#EE2737', 100, true, false),
  ('admin',           'Admin',           '#F87171', 90,  true, false),
  ('hr',              'HR',              '#FBBF24', 70,  true, false),
  ('project_manager', 'Project Manager', '#22D3EE', 60,  true, false),
  ('team_lead',       'Team Lead',       '#A78BFA', 50,  true, false),
  ('finance',         'Finance',         '#34D399', 40,  true, false),
  ('employee',        'Employee',        '#94A3B8', 10,  true, true)
on conflict (slug) do nothing;

-- ── Which permissions a role carries. Presence = granted. ────────────────────
create table if not exists role_permissions (
  role_id        uuid not null references roles(id) on delete cascade,
  permission_key text not null references permissions(key) on delete cascade,
  primary key (role_id, permission_key)
);

create index if not exists role_permissions_role_idx
  on role_permissions (role_id, permission_key);

-- Seed from the live flag matrix: every enabled row becomes a grant.
insert into role_permissions (role_id, permission_key)
select r.id, f.feature_key
from role_feature_flags f
join roles r on r.slug = f.role
where f.enabled
on conflict do nothing;

-- super_admin's behaviour was a hardcoded short-circuit, not flag rows.
-- Reproduce it as an explicit permission.
insert into role_permissions (role_id, permission_key)
select r.id, 'administrator' from roles r where r.slug = 'super_admin'
on conflict do nothing;

-- can_manage_roles is new in this migration. Nothing reads it yet; it exists so
-- the roles admin UI has a gate once has_feature() is switched over.
insert into role_permissions (role_id, permission_key)
select r.id, 'can_manage_roles' from roles r where r.slug in ('super_admin', 'admin')
on conflict do nothing;

-- ── A profile holds many roles ───────────────────────────────────────────────
create table if not exists profile_roles (
  profile_id uuid not null references profiles(id) on delete cascade,
  role_id    uuid not null references roles(id)    on delete cascade,
  granted_by uuid references profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (profile_id, role_id)
);

create index if not exists profile_roles_profile_idx on profile_roles (profile_id);
create index if not exists profile_roles_role_idx    on profile_roles (role_id);

-- Every profile keeps exactly the role it has today.
insert into profile_roles (profile_id, role_id)
select p.id, r.id
from profiles p
join roles r on r.slug = p.role
on conflict do nothing;

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- Roles and their assignments are readable by any signed-in staff member
-- (the UI needs them to render badges). Writes require can_manage_roles.

alter table permissions      enable row level security;
alter table roles            enable row level security;
alter table role_permissions enable row level security;
alter table profile_roles    enable row level security;

drop policy if exists p_permissions_select on permissions;
create policy p_permissions_select on permissions
  for select to authenticated using (true);

drop policy if exists p_roles_select on roles;
create policy p_roles_select on roles
  for select to authenticated using (true);

drop policy if exists p_roles_write on roles;
create policy p_roles_write on roles
  for all to authenticated
  using (has_feature('can_manage_roles'))
  with check (has_feature('can_manage_roles'));

drop policy if exists p_role_permissions_select on role_permissions;
create policy p_role_permissions_select on role_permissions
  for select to authenticated using (true);

drop policy if exists p_role_permissions_write on role_permissions;
create policy p_role_permissions_write on role_permissions
  for all to authenticated
  using (has_feature('can_manage_roles'))
  with check (has_feature('can_manage_roles'));

drop policy if exists p_profile_roles_select on profile_roles;
create policy p_profile_roles_select on profile_roles
  for select to authenticated using (true);

drop policy if exists p_profile_roles_write on profile_roles;
create policy p_profile_roles_write on profile_roles
  for all to authenticated
  using (has_feature('can_manage_roles'))
  with check (has_feature('can_manage_roles'));

comment on table roles is
  'User-definable roles. A profile may hold many; permissions are the union. See docs/permission-model-v2.md.';
comment on table role_permissions is
  'Presence of a row grants the permission. Absence denies it - there is no enabled column.';
