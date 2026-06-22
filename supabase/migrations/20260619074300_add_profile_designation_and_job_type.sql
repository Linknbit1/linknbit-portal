-- Employees gain a designation (replacing the per-employee service concept,
-- dropped later once all readers are updated) and a job_type that drives the
-- per-job-type attendance policy. The free-text profiles.job_title (self-edited
-- on ProfilePage) is a separate concept and is intentionally left untouched.

ALTER TABLE profiles
  ADD COLUMN designation_id uuid REFERENCES designations(id) ON DELETE SET NULL;

ALTER TABLE profiles
  ADD COLUMN job_type text NOT NULL DEFAULT 'on_site'
    CHECK (job_type IN ('on_site','hybrid','remote'));

CREATE INDEX idx_profiles_designation ON profiles(designation_id);
