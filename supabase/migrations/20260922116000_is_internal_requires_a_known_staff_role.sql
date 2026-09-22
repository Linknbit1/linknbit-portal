-- Finish the allow-list: an unknown role is not staff.
--
-- The LEFT JOIN version still failed open one level down. A profiles.role with no
-- matching `roles` row gave NULL, COALESCE turned that into false, and NOT false
-- made the person internal — the same hole, one step further back.
--
-- is_internal() now requires the role to EXIST and not be a client role. Unknown
-- means not staff, which is the only safe default for this boundary.
--
-- Safe to tighten: all 24 profiles map to a live roles row (admin 3, employee 15,
-- hr 1, project_manager 1, super_admin 1, team_lead 3), checked before applying.
-- Verified after: all 21 active people still internal; a made-up slug reads
-- internal=false where the old logic said true.

CREATE OR REPLACE FUNCTION public.is_internal()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
      FROM profiles p
      JOIN roles r ON r.slug = p.role
     WHERE p.id = auth.uid()
       AND p.is_active
       AND NOT r.is_client
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_internal_profile(p_profile uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
      FROM profiles p
      JOIN roles r ON r.slug = p.role
     WHERE p.id = p_profile
       AND p.is_active
       AND NOT r.is_client
  );
$function$;
