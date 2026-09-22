-- Four active employees held no role row at all.
--
-- trg_sync_profile_primary_role runs one way: profile_roles -> profiles.role.
-- Nothing ran the other way, so somebody created with profiles.role = 'employee'
-- and no explicit grant never appeared in profile_roles. Asfandyar, Ashfaq Khan,
-- Jalal Ahmad and Nasir Hussain were all in that state.
--
-- Harmless only because the Employee role grants nothing: with no row has_feature()
-- is false for every key, which happens to match. Give Employee one permission and
-- those four would silently not have it, and "no role" is indistinguishable from
-- "role deliberately removed".

INSERT INTO profile_roles (profile_id, role_id)
SELECT p.id, r.id
  FROM profiles p
  JOIN roles r ON r.slug = p.role
 WHERE NOT EXISTS (SELECT 1 FROM profile_roles pr WHERE pr.profile_id = p.id)
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.fn_seed_profile_role_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only seeds somebody who holds NO role. It never adds to, reorders or corrects
  -- an existing set — multi-role people are managed on the Roles screen and this
  -- must not fight that. Firing only on the empty case also means it cannot
  -- ping-pong with trg_sync_profile_primary_role.
  IF NEW.role IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM profile_roles pr WHERE pr.profile_id = NEW.id) THEN
    INSERT INTO profile_roles (profile_id, role_id)
    SELECT NEW.id, r.id FROM roles r WHERE r.slug = NEW.role
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_profiles_seed_role_link ON public.profiles;
CREATE TRIGGER trg_profiles_seed_role_link
  AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION fn_seed_profile_role_link();
