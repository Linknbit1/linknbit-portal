-- Permission model v2, part 4: client-facing resolution RPC.
--
-- The frontend needs the signed-in user's effective permission set in one
-- round trip. Doing this as a client-side join across profile_roles ->
-- role_permissions works (both are readable) but is chatty and easy to get
-- subtly wrong, which is exactly the kind of drift between UI and RLS that
-- this whole rework exists to eliminate.

create or replace function public.my_permissions()
returns text[]
language sql
stable
security definer
set search_path to 'public'
as $function$
  select coalesce(array_agg(distinct rp.permission_key), '{}'::text[])
  from profile_roles pr
  join role_permissions rp on rp.role_id = pr.role_id
  where pr.profile_id = auth.uid();
$function$;

comment on function public.my_permissions() is
  'Effective permission keys for the signed-in user (union across their roles). Mirrors has_feature(); contains ''administrator'' when the user holds it.';
