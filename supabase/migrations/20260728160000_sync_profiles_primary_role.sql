-- Permission model v2, part 6: keep profiles.role in step with profile_roles.
--
-- Phase 1 only converted the 34 has_feature-driven policies. The other 57 still
-- read profiles.role directly, so if the two diverge a person can be demoted in
-- the new engine while keeping full authority on the legacy half. This trigger
-- makes divergence impossible.
--
-- profiles.role carries a CHECK constraint limited to the nine built-in values,
-- so a custom role slug can never be written there. The rule is therefore:
--
--   profiles.role = slug of the highest-position SYSTEM role the profile holds
--                   else the default role's slug
--
-- The fallback matters: revoking 'admin' from someone who is left holding only
-- a custom role must drop them to employee on the legacy policies, not strand
-- them at admin.
--
-- Installing this is a no-op on current data - every profile already holds
-- exactly the role named in profiles.role.
--
-- Client profiles (client_owner / client_member) have no rows in profile_roles,
-- and the trigger only fires on profile_roles changes, so they are never touched.

create or replace function public.fn_sync_profile_primary_role()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_profile uuid := coalesce(new.profile_id, old.profile_id);
  v_slug    text;
begin
  select r.slug into v_slug
  from profile_roles pr
  join roles r on r.id = pr.role_id
  where pr.profile_id = v_profile
    and r.is_system
    and r.slug in ('super_admin','admin','project_manager','team_lead','employee','hr','finance')
  order by r.position desc
  limit 1;

  if v_slug is null then
    select r.slug into v_slug from roles r where r.is_default limit 1;
  end if;

  if v_slug is not null then
    update profiles
       set role = v_slug
     where id = v_profile
       and role is distinct from v_slug;
  end if;

  return null;
end
$function$;

drop trigger if exists trg_sync_profile_primary_role on profile_roles;
create trigger trg_sync_profile_primary_role
  after insert or update or delete on profile_roles
  for each row execute function fn_sync_profile_primary_role();

comment on function public.fn_sync_profile_primary_role() is
  'Keeps profiles.role equal to the highest-position system role held, so the legacy role-based policies cannot disagree with the permission engine.';
