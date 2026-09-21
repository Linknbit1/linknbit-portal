-- Index the foreign keys that are actually read, not all 93 the linter lists.
--
-- Supabase's performance advisor flags every FK without a covering index. 93 of
-- them here. Following that literally would be the wrong trade: roughly sixty are
-- audit columns — created_by, updated_by, reviewed_by, deleted_by, granted_by,
-- announced_by — that no query in src/ or in any RPC ever filters or joins on.
-- An index there buys nothing on read and costs a write on every insert and
-- update, on tables that take writes all day (attendance, notifications,
-- task_time_entries, messages).
--
-- Indexed here are the FKs that meet at least one of:
--   * joined or filtered by app code, an RLS helper, or a roster/report RPC;
--   * pointing at profiles, projects or tasks, which are the three rows the portal
--     actually deletes — an unindexed FK turns one delete into a sequential scan
--     of every referencing table.
--
-- The single most valuable line is the first: has_feature() runs on essentially
-- every RLS check in the portal and filters role_permissions by permission_key.
--
-- Deliberately skipped: audit-only FKs on configuration tables that hold a handful
-- of rows and are never deleted from (attendance_settings, standup_settings,
-- job_type_policies, status_labels, task_statuses, designations, leave_types,
-- roles, services, participation_*, channel_categories, channel_roles,
-- project_templates, release_announcements), and role_feature_flags, which is
-- dead schema due for removal. Revisit if a query plan ever says otherwise.

-- Read-path FKs: joined or filtered by app code, RLS helpers, or the roster RPCs.
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_key ON public.role_permissions (permission_key);
CREATE INDEX IF NOT EXISTS idx_client_members_profile_id       ON public.client_members (profile_id);
CREATE INDEX IF NOT EXISTS idx_teams_lead_id                   ON public.teams (lead_id);
CREATE INDEX IF NOT EXISTS idx_teams_service_type              ON public.teams (service_type);
CREATE INDEX IF NOT EXISTS idx_projects_team_id                ON public.projects (team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id            ON public.tasks (parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_service_id_project_id  ON public.tasks (project_service_id, project_id);
CREATE INDEX IF NOT EXISTS idx_stages_project_service_id_project_id ON public.stages (project_service_id, project_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_leave_type_id    ON public.leave_requests (leave_type_id);
CREATE INDEX IF NOT EXISTS idx_standup_entries_task_id         ON public.standup_entries (task_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_assignee_id            ON public.subtasks (assignee_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id              ON public.comments (author_id);
CREATE INDEX IF NOT EXISTS idx_attachments_uploader_id         ON public.attachments (uploader_id);
CREATE INDEX IF NOT EXISTS idx_message_attachments_uploader_id ON public.message_attachments (uploader_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_profile_id    ON public.message_reactions (profile_id);
CREATE INDEX IF NOT EXISTS idx_bd_comments_author_id           ON public.bd_comments (author_id);
CREATE INDEX IF NOT EXISTS idx_bd_tasks_lead_id                ON public.bd_tasks (lead_id);
CREATE INDEX IF NOT EXISTS idx_bd_projects_owner_id            ON public.bd_projects (owner_id);
CREATE INDEX IF NOT EXISTS idx_bd_meetings_host_id             ON public.bd_meetings (host_id);
CREATE INDEX IF NOT EXISTS idx_bd_handoffs_project_id          ON public.bd_handoffs (project_id);
CREATE INDEX IF NOT EXISTS idx_mentions_project_id             ON public.mentions (project_id);

-- Per-person history: every one of these is read "for this profile" on a profile
-- page, a report or a leaderboard, and is also scanned when a person is deleted.
CREATE INDEX IF NOT EXISTS idx_xp_transactions_profile_id        ON public.xp_transactions (profile_id);
CREATE INDEX IF NOT EXISTS idx_overtime_requests_profile_id      ON public.overtime_requests (profile_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_profile_id     ON public.reward_redemptions (profile_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_reward_id      ON public.reward_redemptions (reward_id);
CREATE INDEX IF NOT EXISTS idx_project_watchers_profile_id       ON public.project_watchers (profile_id);
CREATE INDEX IF NOT EXISTS idx_employee_of_the_month_profile_id  ON public.employee_of_the_month (profile_id);
CREATE INDEX IF NOT EXISTS idx_shoutouts_from_profile_id         ON public.shoutouts (from_profile_id);
CREATE INDEX IF NOT EXISTS idx_attendance_marked_by              ON public.attendance (marked_by);
CREATE INDEX IF NOT EXISTS idx_enrolled_devices_approved_by      ON public.enrolled_devices (approved_by);
