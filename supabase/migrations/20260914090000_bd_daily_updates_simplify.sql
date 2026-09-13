-- Three corrections to the BD daily-update module, all of them removals.
--
-- 1. The per-person override is gone. The can_submit_bd_updates permission is
--    the whole rule: grant the role, and that person files an update. A second
--    mechanism on top of it was a screen to maintain and a second answer to the
--    same question. The table was empty, so nothing is lost.
--
-- 2. bd_update_history is gone. It returned a row per calendar day so that gaps
--    showed as "missed", which is more than was asked for — a history is the
--    updates somebody wrote. The page now reads bd_daily_updates directly,
--    filtered by month, and RLS already answers "whose rows may I see".
--
-- 3. A day other than today can no longer be written or changed BY ANYBODY.
--    The guards used to let can_manage_bd through, so a manager could amend a
--    settled day. The rule is now absolute: the day an update covers is the only
--    day it can be filed, edited or deleted. Note the consequence — a wrong
--    entry from yesterday is permanent, and correcting one means a migration.

DROP FUNCTION IF EXISTS bd_update_history(uuid, date, date);
DROP FUNCTION IF EXISTS bd_update_participants_list();
DROP FUNCTION IF EXISTS set_bd_update_participant(uuid, text, text);
DROP TABLE IF EXISTS bd_update_participants;

-- Now just the literal grant. Still deliberately NOT has_feature(), which
-- resolves the 'administrator' wildcard and would make every super admin owe an
-- update: being able to write one is a capability, being asked for one is not.
CREATE OR REPLACE FUNCTION fn_bd_update_required(p_profile uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT COALESCE((SELECT p.is_active FROM profiles p WHERE p.id = p_profile), false)
     AND EXISTS (
           SELECT 1
             FROM profile_roles pr
             JOIN role_permissions rp ON rp.role_id = pr.role_id
            WHERE pr.profile_id = p_profile
              AND rp.permission_key = 'can_submit_bd_updates'
         )
$fn$;

COMMENT ON FUNCTION fn_bd_update_required(uuid) IS
  'Is this person expected to file a BD daily update? A literal can_submit_bd_updates grant, nothing else. Deliberately ignores the administrator wildcard.';

CREATE OR REPLACE FUNCTION fn_bd_update_window_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_today date := fn_bd_update_today();
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- No backfill and no post-dating: an update is filed on the day it covers.
    IF NEW.update_date <> v_today THEN
      RAISE EXCEPTION 'bd_update_window_closed';
    END IF;
  ELSE
    -- Checked before the window, because moving the date is how a closed day
    -- would otherwise be reopened.
    IF NEW.update_date <> OLD.update_date THEN
      RAISE EXCEPTION 'bd_update_date_immutable';
    END IF;
    IF OLD.update_date <> v_today THEN
      RAISE EXCEPTION 'bd_update_window_closed';
    END IF;
  END IF;

  RETURN NEW;
END;
$fn$;

CREATE OR REPLACE FUNCTION fn_bd_update_delete_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF OLD.update_date <> fn_bd_update_today() THEN
    RAISE EXCEPTION 'bd_update_window_closed';
  END IF;
  RETURN OLD;
END;
$fn$;

REVOKE ALL ON FUNCTION fn_bd_update_window_guard() FROM PUBLIC;
REVOKE ALL ON FUNCTION fn_bd_update_delete_guard() FROM PUBLIC;
