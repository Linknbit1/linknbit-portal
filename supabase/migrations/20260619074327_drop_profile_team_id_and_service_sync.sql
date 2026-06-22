-- Employees no longer derive a service from a single team, and team membership
-- now lives in team_members. Remove the service-sync trigger and the single
-- profiles.team_id column. (profiles.service_type is dropped in a later
-- migration, after edge functions and frontend stop referencing it.)

DROP TRIGGER   IF EXISTS trg_profile_service_type ON profiles;
DROP FUNCTION  IF EXISTS fn_sync_profile_service_type();

-- Constraint name differs between repo and remote (drift): drop both names,
-- and the column drop removes whichever FK remains regardless.
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_team_id_fkey;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS fk_profiles_team;
ALTER TABLE profiles DROP COLUMN IF EXISTS team_id;
