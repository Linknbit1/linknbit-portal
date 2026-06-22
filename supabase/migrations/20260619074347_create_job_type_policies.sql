-- ════════════════════════════════════════════════════════════════════
-- Per-job-type attendance policy. Lets admins configure, for each job_type,
-- whether the office-network gate applies and whether the schedule window
-- (work start/end, grace, late cutoff, checkout timing) is enforced.
--   • require_office_network — hard gate: block check-in when off-network.
--   • auto_detect_network    — hybrid: record office vs remote by IP, never block.
--   • enforce_schedule_window— apply work_start/end window + late cutoff + checkout gate.
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE job_type_policies (
  job_type                text        PRIMARY KEY
                                      CHECK (job_type IN ('on_site','hybrid','remote')),
  require_office_network   boolean    NOT NULL DEFAULT false,
  auto_detect_network      boolean    NOT NULL DEFAULT false,
  enforce_schedule_window  boolean    NOT NULL DEFAULT true,
  updated_by               uuid       REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at               timestamptz NOT NULL DEFAULT now()
);

INSERT INTO job_type_policies (job_type, require_office_network, auto_detect_network, enforce_schedule_window) VALUES
  ('on_site', true,  false, true),
  ('hybrid',  false, true,  true),
  ('remote',  false, false, true);

ALTER TABLE job_type_policies ENABLE ROW LEVEL SECURITY;

-- Read: any authenticated internal user (UI shows the policy; edge functions
-- use the service role and bypass RLS anyway).
CREATE POLICY p_job_type_policies_read ON job_type_policies
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Write: attendance configuration is admin/super_admin only (HR's managed
-- surface is Designations, not attendance policy).
CREATE POLICY p_job_type_policies_write ON job_type_policies
  FOR ALL
  USING     (current_user_role() IN ('admin','super_admin'))
  WITH CHECK (current_user_role() IN ('admin','super_admin'));
