-- Permission model v2, part 3: role hierarchy and anti-escalation guards.
--
-- Enforced in triggers rather than policies so they hold for every write path.
--
-- All guards no-op when auth.uid() is null. That is the service-role /
-- migration context, which must stay able to repair state - otherwise a bad
-- grant could lock the org out with no recovery path.

-- ── Highest role position a profile holds ────────────────────────────────────
-- 'administrator' outranks everything.
create or replace function public.top_role_position(p_profile uuid)
returns int
language sql
stable
security definer
set search_path to 'public'
as $function$
  select coalesce(
    max(
      case
        when exists (
          select 1 from role_permissions rp
          where rp.role_id = r.id and rp.permission_key = 'administrator'
        ) then 2147483647
        else r.position
      end
    ), -1)
  from profile_roles pr
  join roles r on r.id = pr.role_id
  where pr.profile_id = p_profile;
$function$;

comment on function public.top_role_position(uuid) is
  'Highest role position held by a profile. Used for hierarchy checks: you may only act on roles strictly below your own.';

-- ── Guard: assigning and revoking roles ──────────────────────────────────────
create or replace function public.fn_guard_profile_roles()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_actor     uuid := auth.uid();
  v_actor_top int;
  v_target    int;
begin
  if v_actor is null then
    return coalesce(new, old);
  end if;

  if not has_feature('can_manage_roles') then
    raise exception 'forbidden_manage_roles' using errcode = '42501';
  end if;

  v_actor_top := top_role_position(v_actor);
  select position into v_target from roles where id = coalesce(new.role_id, old.role_id);

  -- Strictly below: you cannot hand out your own level of authority.
  if v_target >= v_actor_top then
    raise exception 'forbidden_role_hierarchy' using errcode = '42501';
  end if;

  return coalesce(new, old);
end
$function$;

drop trigger if exists trg_guard_profile_roles on profile_roles;
create trigger trg_guard_profile_roles
  before insert or update or delete on profile_roles
  for each row execute function fn_guard_profile_roles();

-- ── Guard: editing roles themselves ──────────────────────────────────────────
create or replace function public.fn_guard_roles()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_actor     uuid := auth.uid();
  v_actor_top int;
begin
  if v_actor is null then
    return coalesce(new, old);
  end if;

  if not has_feature('can_manage_roles') then
    raise exception 'forbidden_manage_roles' using errcode = '42501';
  end if;

  if tg_op = 'DELETE' then
    if old.is_system then
      raise exception 'forbidden_delete_system_role' using errcode = '42501';
    end if;
    if old.is_default then
      raise exception 'forbidden_delete_default_role' using errcode = '42501';
    end if;
  end if;

  v_actor_top := top_role_position(v_actor);

  if coalesce(old.position, -1) >= v_actor_top
     or coalesce(new.position, -1) >= v_actor_top then
    raise exception 'forbidden_role_hierarchy' using errcode = '42501';
  end if;

  return coalesce(new, old);
end
$function$;

drop trigger if exists trg_guard_roles on roles;
create trigger trg_guard_roles
  before insert or update or delete on roles
  for each row execute function fn_guard_roles();

-- ── Guard: you cannot grant a permission you do not hold ─────────────────────
-- Without this, anyone who can create a role can grant themselves anything.
create or replace function public.fn_guard_role_permissions()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_actor     uuid := auth.uid();
  v_actor_top int;
  v_target    int;
  v_key       text := coalesce(new.permission_key, old.permission_key);
begin
  if v_actor is null then
    return coalesce(new, old);
  end if;

  if not has_feature('can_manage_roles') then
    raise exception 'forbidden_manage_roles' using errcode = '42501';
  end if;

  if not has_feature(v_key) then
    raise exception 'forbidden_grant_permission_you_lack: %', v_key using errcode = '42501';
  end if;

  v_actor_top := top_role_position(v_actor);
  select position into v_target from roles where id = coalesce(new.role_id, old.role_id);

  if v_target >= v_actor_top then
    raise exception 'forbidden_role_hierarchy' using errcode = '42501';
  end if;

  return coalesce(new, old);
end
$function$;

drop trigger if exists trg_guard_role_permissions on role_permissions;
create trigger trg_guard_role_permissions
  before insert or update or delete on role_permissions
  for each row execute function fn_guard_role_permissions();

-- ── Lockout guard ────────────────────────────────────────────────────────────
-- At least one profile must always retain the ability to administer roles,
-- or the org loses access to the permissions UI with no in-app recovery.
--
-- Anchored on can_manage_roles rather than administrator: this project
-- currently has zero accounts holding administrator (no super_admin exists),
-- so an administrator-based invariant would be unsatisfiable.
create or replace function public.fn_assert_role_admin_exists()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not exists (
    select 1
    from profile_roles pr
    join role_permissions rp on rp.role_id = pr.role_id
    where rp.permission_key in ('administrator', 'can_manage_roles')
  ) then
    raise exception 'lockout_guard: at least one profile must retain can_manage_roles'
      using errcode = '23514';
  end if;
  return null;
end
$function$;

drop trigger if exists trg_assert_role_admin_profile_roles on profile_roles;
create constraint trigger trg_assert_role_admin_profile_roles
  after insert or update or delete on profile_roles
  deferrable initially deferred
  for each row execute function fn_assert_role_admin_exists();

drop trigger if exists trg_assert_role_admin_role_permissions on role_permissions;
create constraint trigger trg_assert_role_admin_role_permissions
  after insert or update or delete on role_permissions
  deferrable initially deferred
  for each row execute function fn_assert_role_admin_exists();
