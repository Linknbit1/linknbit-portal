-- Fix: hidden-ness could not be tested from inside a policy.
--
-- p_role_permissions_select and p_profile_roles_select asked
-- `exists (select 1 from roles where id = ... and is_hidden)`. That subquery
-- runs under the CALLER's RLS, so for anyone who cannot see the hidden role the
-- subquery returned no rows, `exists` was false, `not exists` was true — and
-- the grant/assignment was shown. The check inverted itself for exactly the
-- people it was meant to stop.
--
-- The predicate has to see the real table, so it moves into SECURITY DEFINER
-- helpers. They expose one boolean and nothing else.

create or replace function public.is_role_hidden(p_role_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select coalesce((select r.is_hidden from roles r where r.id = p_role_id), false);
$function$;

create or replace function public.is_permission_hidden(p_key text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select coalesce((select p.is_hidden from permissions p where p.key = p_key), false);
$function$;

comment on function public.is_role_hidden(uuid) is
  'Hidden-ness of a role, readable from inside a policy. SECURITY DEFINER because the caller may not be able to see the row it is asking about.';
comment on function public.is_permission_hidden(text) is
  'Hidden-ness of a permission, readable from inside a policy. SECURITY DEFINER for the same reason as is_role_hidden.';

drop policy if exists p_role_permissions_select on role_permissions;
create policy p_role_permissions_select on role_permissions
  for select to authenticated
  using (
    has_feature('administrator')
    or (not is_role_hidden(role_id) and not is_permission_hidden(permission_key))
  );

drop policy if exists p_profile_roles_select on profile_roles;
create policy p_profile_roles_select on profile_roles
  for select to authenticated
  using (has_feature('administrator') or not is_role_hidden(role_id));
