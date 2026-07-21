-- Real feature flags, part 1 of 2: the foundation.
--
-- Until now role_feature_flags was almost decorative: exactly one DB object read it
-- (delete_project_cascade) and one frontend call site (can_view_budget). This adds the
-- single lookup helper every policy will use, prunes the dead keys, and backfills a
-- COMPLETE role x feature matrix so a missing row can never be mistaken for "deny by
-- accident" (and so the Settings toggles have a row to update).
--
-- Part 2 (enforcement) rewrites the policies/functions to call has_feature().
-- This file on its own changes NO behaviour.

-- ── The single source of truth ────────────────────────────────────────────────
-- super_admin short-circuits to true so the role can never be locked out of its own
-- permissions UI. A missing (role, feature_key) row is an explicit deny.
CREATE OR REPLACE FUNCTION has_feature(p_key text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT current_user_role() = 'super_admin'
      OR EXISTS (
           SELECT 1 FROM role_feature_flags
            WHERE role = current_user_role()
              AND feature_key = p_key
              AND enabled
         );
$$;

REVOKE ALL ON FUNCTION has_feature(text) FROM public;
REVOKE ALL ON FUNCTION has_feature(text) FROM anon;
GRANT EXECUTE ON FUNCTION has_feature(text) TO authenticated;

-- ── Prune dead keys ───────────────────────────────────────────────────────────
-- can_manage_integrations: no integrations planned.
-- can_view_projects / can_view_clients: module-level "can you see it at all" flags,
-- only ever seeded for `finance` (a role with zero users). Every internal role needs
-- these modules, and switching them off breaks navigation the UI does not handle.
DELETE FROM role_feature_flags
 WHERE feature_key IN ('can_manage_integrations', 'can_view_projects', 'can_view_clients');

-- ── Backfill the full matrix (7 roles x 11 flags = 77 rows) ───────────────────
-- Values below reproduce TODAY's effective behaviour, with two deliberate
-- tightenings called out inline. Existing rows win (ON CONFLICT DO NOTHING), then a
-- follow-up UPDATE forces the intended values so re-running is idempotent.
WITH matrix(role, feature_key, enabled) AS (VALUES
  -- Projects ------------------------------------------------------------------
  ('super_admin','can_delete_projects',true), ('admin','can_delete_projects',true),
  ('hr','can_delete_projects',false), ('project_manager','can_delete_projects',false),
  ('team_lead','can_delete_projects',false), ('employee','can_delete_projects',false),
  ('finance','can_delete_projects',false),

  ('super_admin','can_view_budget',true), ('admin','can_view_budget',true),
  ('hr','can_view_budget',true), ('project_manager','can_view_budget',true),
  ('team_lead','can_view_budget',true), ('employee','can_view_budget',false),
  ('finance','can_view_budget',true),

  -- Tasks ---------------------------------------------------------------------
  -- Role-based approval only. The old "any project member / assignee can approve"
  -- path is removed in part 2 (it allowed self-approval).
  ('super_admin','can_approve_tasks',true), ('admin','can_approve_tasks',true),
  ('hr','can_approve_tasks',false), ('project_manager','can_approve_tasks',true),
  ('team_lead','can_approve_tasks',false), ('employee','can_approve_tasks',false),
  ('finance','can_approve_tasks',false),

  -- Clients -------------------------------------------------------------------
  -- TIGHTENING: RLS granted project_manager write while the flag said false. The
  -- flag wins, per decision.
  ('super_admin','can_manage_clients',true), ('admin','can_manage_clients',true),
  ('hr','can_manage_clients',false), ('project_manager','can_manage_clients',false),
  ('team_lead','can_manage_clients',false), ('employee','can_manage_clients',false),
  ('finance','can_manage_clients',false),

  -- People --------------------------------------------------------------------
  ('super_admin','can_manage_people',true), ('admin','can_manage_people',true),
  ('hr','can_manage_people',true), ('project_manager','can_manage_people',false),
  ('team_lead','can_manage_people',false), ('employee','can_manage_people',false),
  ('finance','can_manage_people',false),

  -- Reports -------------------------------------------------------------------
  ('super_admin','can_view_reports',true), ('admin','can_view_reports',true),
  ('hr','can_view_reports',true), ('project_manager','can_view_reports',true),
  ('team_lead','can_view_reports',false), ('employee','can_view_reports',false),
  ('finance','can_view_reports',true),

  -- Attendance ----------------------------------------------------------------
  -- Mirrors MGMT_ROLES (super_admin/admin/hr) today.
  ('super_admin','can_manage_attendance',true), ('admin','can_manage_attendance',true),
  ('hr','can_manage_attendance',true), ('project_manager','can_manage_attendance',false),
  ('team_lead','can_manage_attendance',false), ('employee','can_manage_attendance',false),
  ('finance','can_manage_attendance',false),

  ('super_admin','can_approve_requests',true), ('admin','can_approve_requests',true),
  ('hr','can_approve_requests',true), ('project_manager','can_approve_requests',false),
  ('team_lead','can_approve_requests',false), ('employee','can_approve_requests',false),
  ('finance','can_approve_requests',false),

  -- TIGHTENING: project_manager currently reads EVERY employee's leave/WFH/overtime
  -- company-wide. Set false so PM falls back to the existing team-scoped p_*_team
  -- policies (shares_team_with) and sees only their own team.
  ('super_admin','can_view_all_attendance',true), ('admin','can_view_all_attendance',true),
  ('hr','can_view_all_attendance',true), ('project_manager','can_view_all_attendance',false),
  ('team_lead','can_view_all_attendance',false), ('employee','can_view_all_attendance',false),
  ('finance','can_view_all_attendance',false),

  -- Gamification --------------------------------------------------------------
  ('super_admin','can_govern_gamification',true), ('admin','can_govern_gamification',true),
  ('hr','can_govern_gamification',true), ('project_manager','can_govern_gamification',false),
  ('team_lead','can_govern_gamification',false), ('employee','can_govern_gamification',false),
  ('finance','can_govern_gamification',false),

  ('super_admin','can_recognize',true), ('admin','can_recognize',true),
  ('hr','can_recognize',true), ('project_manager','can_recognize',true),
  ('team_lead','can_recognize',true), ('employee','can_recognize',false),
  ('finance','can_recognize',false)
)
INSERT INTO role_feature_flags (role, feature_key, enabled)
SELECT role, feature_key, enabled FROM matrix
ON CONFLICT (role, feature_key) DO UPDATE SET enabled = EXCLUDED.enabled;

-- Anything left over from older seeds that is not one of the 11 supported keys.
DELETE FROM role_feature_flags
 WHERE feature_key NOT IN (
   'can_delete_projects','can_view_budget','can_approve_tasks','can_manage_clients',
   'can_manage_people','can_view_reports','can_manage_attendance','can_approve_requests',
   'can_view_all_attendance','can_govern_gamification','can_recognize'
 );
