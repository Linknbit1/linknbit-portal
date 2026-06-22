-- Final step of the designation migration: employees no longer carry a service
-- (they have a designation + job_type). Drop the now-unused column. Run LAST —
-- after the invite-user edge function and all frontend readers stopped using it.
-- services, teams.service_type, and project service columns are untouched.

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_service_type_fkey;
ALTER TABLE profiles DROP COLUMN IF EXISTS service_type;
