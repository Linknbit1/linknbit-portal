# Linknbit Portal — Implementation Phases

> **Strategy:** Authentication first (nothing works without it), then Gamification, then Attendance.
> These three are fully self-contained and deliver real value before any project/task/ClickUp work begins.
> Every phase produces working, deployable code. No phase leaves the system in a broken or partial state.

---

## Dependency Graph

```
Phase 0: Project Setup
  └─ Phase 1: Authentication & Core
       ├─ Phase 2: Gamification          ← PRIORITY
       │    └─ Phase 3: Attendance       ← PRIORITY (needs XP system from Phase 2)
       │         └─ Phase 4: Teams & People Management
       │              └─ Phase 5: Projects & Tasks Core
       │                   ├─ Phase 6: Audit Logging
       │                   ├─ Phase 7: ClickUp Integration
       │                   └─ Phase 8: Realtime & Notifications
       │                        └─ Phase 9: Client Portal
       │                             └─ Phase 10: Reports & Analytics
       └─ Phase 11: Discord Integration (standalone, any time after Phase 6)
```

---

## Always-active conventions (every phase)

After **every** migration:
```bash
supabase migration new <descriptive_name>   # creates timestamped file in supabase/migrations/
# write full SQL in the file, then:
supabase db reset                           # local: replay all migrations from scratch
supabase gen types typescript --local > src/types/database.ts
```

`src/types/database.ts` is always regenerated and committed alongside its migration. Never hand-edit it.

Data fetching order every time, no exceptions:
```
Component → src/hooks/ → src/api/ → Supabase JS client
```

---

## Phase 0 — Project Setup

**Goal:** Local Supabase running, folder structure in place, environment configured.

### Steps

1. `supabase init` in project root
2. `supabase start` — verify dashboard at `localhost:54323`
3. Create `.env.local`:
   ```
   VITE_SUPABASE_URL=http://localhost:54321
   VITE_SUPABASE_ANON_KEY=<from supabase start output>
   ```
4. Create `.env.example` documenting all required keys (no values)
5. Add `.env.local` to `.gitignore`
6. Create the folder structure:
   ```
   src/
   ├── api/
   ├── hooks/
   │   └── realtime/
   ├── lib/
   │   └── cn.ts
   └── types/
       └── index.ts     (app-level types — hand-written)
       └── database.ts  (generated — will be created after first migration)
   ```
7. Install dependencies: `@supabase/supabase-js`, `@tanstack/react-query`, `framer-motion`, `lucide-react`
8. Create `src/lib/supabase.ts` — single Supabase client instance

### Deliverable

`supabase start` works, folder structure exists, `.env.example` committed.

---

## Phase 1 — Authentication & Core Foundation

**Goal:** Users can log in and out. Roles exist. RLS helper functions are in place. Nothing else works yet but the foundation is solid.

### Migrations

```bash
supabase migration new create_levels_table
supabase migration new create_profiles_table
supabase migration new create_role_feature_flags
supabase migration new seed_role_feature_flags
```

**`create_levels_table`**
- `levels` table + seed data (levels 1–10 with XP thresholds)
- RLS: all authenticated users can SELECT; only `super_admin` can write

**`create_profiles_table`**
- `profiles` table with all columns (role text+CHECK, service_type, team_id nullable, xp_total, level FK → levels, is_active, last_seen_at)
- `fn_sync_profile_service_type()` trigger (team assignment syncs service_type)
- `fn_sync_profile_level()` + `trg_profile_level_sync` trigger (level auto-recalcs on xp_total change)
- Auto-create profile on signup: `fn_handle_new_user()` SECURITY DEFINER function + trigger on `auth.users`
- RLS: `p_profiles_own`, `p_profiles_internal`, `p_profiles_client_members`, `p_profiles_self_update`, `p_profiles_admin_update`
- RLS helper functions: `current_user_role()`, `is_internal()`, `is_project_member()`

**`create_role_feature_flags`**
- `role_feature_flags` table
- RLS: internal users SELECT; only `super_admin` writes

**`seed_role_feature_flags`**
- Full INSERT seed from backend-architecture.md (all roles × all feature keys)

### src/api/

```
src/api/auth.ts          — signIn(), signOut(), getSession(), getCurrentProfile()
src/api/roleFlags.ts     — fetchRoleFlags()
```

### src/hooks/

```
src/hooks/useAuth.ts         — useCurrentUser(), useSignIn(), useSignOut()
src/hooks/useRoleFlags.ts    — useRoleFlags(), useCanAccess(featureKey)
```

### Frontend

- `src/pages/auth/LoginPage.tsx` — email + password login form
- `src/pages/auth/RegisterPage.tsx` — invite-only registration (admin creates user in Supabase Auth, user sets password)
- Auth context / provider wrapping the app
- Protected route wrapper — redirect to login if no session
- `AppShell` layout (sidebar + topbar skeleton, no nav items yet)
- User avatar + name in topbar from `useCurrentUser()`

### Testing checklist

- [ ] Super admin can log in
- [ ] Logging out clears session
- [ ] Unauthenticated user is redirected to `/login`
- [ ] Profile row is auto-created on first login
- [ ] `useCanAccess('can_view_reports')` returns correct boolean per role
- [ ] `src/types/database.ts` committed and matches local schema

---

## Phase 2 — Gamification

**Goal:** XP system, levels, rewards shop, quests, and leaderboard are fully functional as a standalone feature.

**Depends on:** Phase 1 (profiles, levels, RLS helpers)

### Migrations

```bash
supabase migration new create_notifications_table
supabase migration new create_gamification_tables
supabase migration new create_gamification_triggers
supabase migration new seed_initial_rewards_and_quests
```

**`create_notifications_table`**
- `notifications` table + index
- RLS: `p_notifications_select`, `p_notifications_update`
- No INSERT policy (SECURITY DEFINER functions only)
- Note: placed in this phase because both gamification (quest completion) and attendance (device flagging in Phase 3) need it

**`create_gamification_tables`**
- `xp_transactions` table (immutable ledger)
- `rewards` table
- `reward_redemptions` table
- `quests` table
- `quest_progress` table
- All RLS policies for each table
- `redeem_reward(p_profile_id, p_reward_id)` SECURITY DEFINER stored function

**`create_gamification_triggers`**
- `fn_apply_xp_transaction()` + `trg_apply_xp` (INSERT on xp_transactions → updates profiles.xp_total)
- Note: `fn_sync_profile_level()` + `trg_profile_level_sync` are already in place from Phase 1 — no re-creation needed
- Count-based quest trigger stubs: the trigger function is created here but wired to `tasks` in Phase 5 (tasks table doesn't exist yet)

**`seed_initial_rewards_and_quests`**
- 3–5 starter rewards with XP costs
- 2–3 starter quests (e.g., "Complete 5 tasks", "7-day check-in streak")

### src/api/

```
src/api/gamification.ts     — fetchXpTransactions(), fetchRewards(), redeemReward(),
                               fetchQuests(), fetchQuestProgress(), fetchLeaderboard()
src/api/notifications.ts    — fetchNotifications(), markNotificationRead(), markAllRead()
```

### src/hooks/

```
src/hooks/useGamification.ts    — useXpTransactions(), useRewards(), useRedeemReward(),
                                   useQuests(), useQuestProgress(), useLeaderboard()
src/hooks/useNotifications.ts   — useNotifications(), useMarkRead()
```

### Frontend

**Employee-facing:**
- `XPBar` component — gradient progress bar with level badge (uses `profiles.xp_total` + `profiles.level`)
- Leaderboard page — ranked list of employees by XP, gold/silver/bronze top 3
- Rewards shop page — grid of reward cards; redeem button calls `redeem_reward()` RPC; optimistic update with rollback on failure
- Quests page — active quests with progress bars; completed quests with XP earned badge

**Admin-facing:**
- Rewards management page — create/edit/deactivate rewards, set XP cost and quantity
- Manual XP grant form — admin grants XP to an employee with a reason string
- Notification bell in topbar — badge count, dropdown list, mark read

### Edge Function

**`quest-evaluator`** — scheduled daily
- Streak-based quest evaluation (attendance streaks: queries `attendance` table — attendance table exists in Phase 3, so deploy this function in Phase 3 but build the shell now)
- For now: count-based progress is already trigger-driven

### Testing checklist

- [ ] Admin can create a reward with XP cost
- [ ] Employee can redeem a reward if they have enough XP; fails gracefully if not
- [ ] Redeeming reward deducts XP from `profiles.xp_total` atomically — no race condition under concurrent requests
- [ ] Level auto-increments when `xp_total` crosses a threshold
- [ ] Leaderboard ranks employees correctly
- [ ] Quest progress increments for count-based quests (manually test via direct DB insert for now; task-wiring in Phase 5)
- [ ] Notification bell shows unread count
- [ ] `src/types/database.ts` committed

---

## Phase 3 — Attendance

**Goal:** Employees check in/out from the office. HR/admin can view, mark, and report on attendance. XP is awarded for on-time check-ins. Device and WiFi fraud prevention is active.

**Depends on:** Phase 1 (profiles, auth), Phase 2 (xp_transactions, notifications)

### src/lib/ (frontend utility — write before migrations)

```
src/lib/deviceUtils.ts
```

Contains:
- `getDeviceFingerprint()` — canvas + signals hash (User-Agent, screen, timezone, hardware concurrency, canvas render)
- `getDeviceName(userAgent)` — returns "Samsung SM-A515F (Android 12)" etc.

These are pure functions, no React, no Supabase. Write and unit-test these independently.

### Migrations

```bash
supabase migration new create_teams_table
supabase migration new create_attendance_settings
supabase migration new create_attendance_tables
supabase migration new create_enrolled_devices
supabase migration new create_attendance_triggers
```

**`create_teams_table`**
- `teams` table
- `ALTER TABLE profiles ADD CONSTRAINT fk_profiles_team` (deferred FK)
- RLS for `teams`: internal users SELECT; admin/HR write

**`create_attendance_settings`**
- `attendance_settings` singleton table (work_start_time, work_end_time, grace_period_min, timezone, xp_on_time_checkin, office_ip_cidr)
- Seed one row with Linknbit defaults (09:00, 18:00, 15min, Asia/Karachi, 10 XP)
- RLS: all authenticated users SELECT; admin/super_admin write

**`create_attendance_tables`**
- `attendance` table with all device/network audit columns
- Indexes: `idx_attendance_profile_date`, `idx_attendance_date`, `idx_attendance_fingerprint`
- RLS: all policies from backend-architecture.md Section 10 (own, team, admin, self_insert, self_update with WITH CHECK, admin_write)

**`create_enrolled_devices`**
- `enrolled_devices` table
- Indexes: `idx_enrolled_devices_fingerprint`
- RLS: own SELECT, admin SELECT/UPDATE

**`create_attendance_triggers`**
- `fn_set_attendance_status()` + `trg_attendance_auto_status` (time-window enforcement + present/late status)
- `fn_validate_checkout()` + `trg_attendance_checkout_validate` (work_end_time check)
- `fn_attendance_xp()` + `trg_attendance_xp` (AFTER INSERT → inserts into xp_transactions)

### Edge Function

**`attendance-checkin`**
Full validation pipeline (from backend-architecture.md Section 8):
1. JWT auth → resolve profile_id
2. Time window check against attendance_settings
3. WiFi/IP check against office_ip_cidr (skip if NULL)
4. Duplicate check (already checked in today?)
5. Device enrollment check → set device_flagged, notify HR if suspicious
6. INSERT into attendance
7. Return `{ status, check_in, device_flagged }`

Also deploy **`quest-evaluator`** now (needs `attendance` table for streak quests).

### src/api/

```
src/api/attendance.ts   — checkIn(), checkOut(), fetchMyAttendance(),
                           fetchAllAttendance(), markAttendance() (admin),
                           fetchAttendanceSettings(), updateAttendanceSettings(),
                           fetchEnrolledDevices(), approveDevice(), deactivateDevice()
src/api/teams.ts        — fetchTeams(), createTeam(), updateTeam()
```

### src/hooks/

```
src/hooks/useAttendance.ts   — useMyAttendance(), useAllAttendance(), useCheckIn(),
                                useCheckOut(), useAttendanceSettings(), useMarkAttendance()
src/hooks/useTeams.ts        — useTeams(), useCreateTeam()
src/hooks/useEnrolledDevices.ts — useEnrolledDevices(), useApproveDevice(), useDeactivateDevice()
```

### Frontend

**Employee-facing:**
- Check-in/check-out button on dashboard (calls `attendance-checkin` Edge Function with device fingerprint + name)
- Check-in status card: shows today's status (present/late/absent), check-in time, check-out time
- My attendance history: calendar view or table of past 30 days
- "This device is not recognised" banner when `device_flagged = true`

**HR/Admin-facing:**
- Attendance overview: table of all employees × today, filterable by team/date
- Mark attendance form: admin manually sets status + note for an employee
- Attendance reports: summary stats (present/late/absent counts per employee per week/month)
- Enrolled devices page: list of pending + approved devices; approve/deactivate buttons
- Attendance settings page: work hours, grace period, timezone, office IP CIDR, XP amount

### Testing checklist

- [ ] Employee can check in from office WiFi within the time window
- [ ] Check-in rejected before `work_start_time`
- [ ] Check-in rejected after `work_start_time + grace_period_min`
- [ ] Check-in rejected from an IP outside `office_ip_cidr` (when configured)
- [ ] Check-in from unknown device sets `device_flagged = true` and triggers HR notification
- [ ] Second check-in on same day returns 409
- [ ] On-time check-in awards XP; `profiles.xp_total` increments correctly
- [ ] Late check-in does NOT award XP
- [ ] Check-out cannot be set after `work_end_time` for self-submitted records
- [ ] Admin can mark attendance for any employee regardless of WiFi/time restrictions
- [ ] HR sees all attendance records; employee sees only their own
- [ ] Team lead sees attendance for their team only
- [ ] `src/types/database.ts` committed

---

## Phase 4 — Teams & People Management

**Goal:** HR and admin can manage the employee directory, invite users, assign teams, and manage roles.

**Depends on:** Phase 3 (teams table already created)

### Migrations

```bash
supabase migration new add_team_constraints
```

- Add any additional team constraints (e.g., unique team name)
- No new tables; `teams` was created in Phase 3

### src/api/

```
src/api/people.ts    — fetchProfiles(), inviteUser(), updateProfile(),
                        deactivateProfile(), updateRole()
```

### src/hooks/

```
src/hooks/usePeople.ts   — usePeople(), useInviteUser(), useUpdateProfile(),
                            useDeactivateProfile()
```

### Frontend

- People directory page — searchable/filterable list of all internal users with role badge, team, service chip, XP level
- Invite user flow — admin sends Supabase Auth invite; profile is auto-created on first login
- Profile edit drawer — name, avatar, role (admin only), team assignment, service type
- Teams management page — create/edit teams, assign team lead, view team members

### Testing checklist

- [ ] Admin can invite a new user; profile is created on first login with correct default role
- [ ] Admin can change a user's role; RLS helper `current_user_role()` reflects new role immediately
- [ ] HR can deactivate a profile; deactivated user cannot log in
- [ ] Team assignment syncs `profiles.service_type` via trigger
- [ ] `src/types/database.ts` committed

---

## Phase 5 — Projects & Tasks Core

**Goal:** Admin/PM can create projects, assign members, create tasks, manage subtasks and checklists. No ClickUp sync yet — everything is portal-only.

**Depends on:** Phase 4 (profiles, teams in place)

### Migrations

```bash
supabase migration new create_clients_tables
supabase migration new create_projects_tables
supabase migration new create_tasks_tables
supabase migration new create_checklist_tables
supabase migration new create_comments_attachments
supabase migration new wire_quest_task_trigger
```

**`create_clients_tables`**
- `clients` + `client_members` tables
- Full RLS (Section 10)

**`create_projects_tables`**
- `projects` + `project_members` tables
- ClickUp ID columns (NULL until Phase 7)
- Soft-delete columns
- Full RLS (Section 10)

**`create_tasks_tables`**
- `tasks` + `task_assignees` tables
- `fn_set_update_source()` + `trg_tasks_set_source` BEFORE trigger
- `clickup_status_mappings` table (empty; populated in Phase 7)
- Full RLS (Section 10)

**`create_checklist_tables`**
- `checklists` + `checklist_items` tables
- Full RLS (Section 10)

**`create_comments_attachments`**
- `comments` table + `trg_comments_set_source` trigger
- `attachments` table
- Full RLS for both (Section 10)

**`wire_quest_task_trigger`**
- Add AFTER UPDATE trigger on `tasks` for count-based quest evaluation (tasks_completed quest type)
- The `fn_evaluate_count_quests()` function queries `quest_progress` and `quests` — both exist since Phase 2

### src/api/

```
src/api/projects.ts      — fetchProjects(), createProject(), updateProject(), deleteProject() (soft)
src/api/tasks.ts         — fetchTasks(), createTask(), updateTask(), deleteTask() (soft), restoreTask()
src/api/comments.ts      — fetchComments(), createComment(), updateComment(), deleteComment()
src/api/attachments.ts   — fetchAttachments(), uploadAttachment(), deleteAttachment()
src/api/clients.ts       — fetchClients(), createClient(), updateClient()
```

### src/hooks/

```
src/hooks/useProjects.ts
src/hooks/useTasks.ts
src/hooks/useComments.ts
src/hooks/useAttachments.ts
src/hooks/useClients.ts
```

### Frontend

- Projects list page, project detail page, Kanban board (task status columns)
- Task drawer (title, description, status, priority, assignees, due date, checklist, comments, attachments)
- Clients list, client detail
- Soft-delete Trash view (admin only)
- `ServiceChip`, `StatusChip`, `PriorityChip`, `ClickUpStatus` (shows 'pending' for all tasks at this phase)

### Testing checklist

- [ ] PM can create a project; team members can see it after being added to `project_members`
- [ ] Employee cannot see projects they are not a member of
- [ ] Finance can see all projects (read-only via `p_projects_finance_select`)
- [ ] Task completion triggers quest progress update
- [ ] Soft-deleted tasks/projects hidden from normal views; visible in Trash for admin
- [ ] Comments require project membership (RLS blocks non-member comments)
- [ ] Checklist write requires project membership
- [ ] `src/types/database.ts` committed

---

## Phase 6 — Audit Logging

**Goal:** All key actions are logged immutably. Audit log page is visible to admin/super_admin.

**Depends on:** Phase 5 (all audited tables exist)

### Migrations

```bash
supabase migration new create_audit_logs_partitioned
supabase migration new add_audit_triggers
supabase migration new create_log_action_rpc
```

**`create_audit_logs_partitioned`**
- Partitioned `audit_logs` table (PARTITION BY RANGE created_at)
- Create current and next month partitions
- All indexes (actor, resource, action)
- RLS: only `super_admin` and `admin` can SELECT; no UPDATE/DELETE policy

**`add_audit_triggers`**
- `fn_audit_log()` SECURITY DEFINER function
- Apply to: `tasks`, `projects`, `comments`, `profiles` (role/is_active changes only), `reward_redemptions`

**`create_log_action_rpc`**
- `log_action()` SECURITY DEFINER RPC for semantic events (login, settings change, XP grant, sync events)

### Monthly cron

- Set up `pg_cron` job (25th of each month): create next month's partition

### src/api/

```
src/api/auditLogs.ts   — fetchAuditLogs(filters)
```

### src/hooks/

```
src/hooks/useAuditLogs.ts
```

### Frontend

- Audit log page (admin only, gated by `current_user_role()` in RLS)
- Filterable by action, resource type, actor, date range
- Shows: actor name + role, action, resource label, timestamp, IP address

### Testing checklist

- [ ] Task status change is logged with diff (only changed fields stored)
- [ ] Role change on a profile is logged
- [ ] No-op UPDATE does not create a log entry (trigger guard)
- [ ] `audit_logs` has no UPDATE or DELETE policy — verify at DB level
- [ ] Admin can read audit logs; employee cannot

---

## Phase 7 — ClickUp Integration

**Goal:** Bidirectional sync between portal and ClickUp. Tasks created in portal appear in ClickUp and vice versa.

**Depends on:** Phase 5 (all task/project/comment tables), Phase 6 (audit logging for sync events)

### Migrations

```bash
supabase migration new create_sync_queue
supabase migration new create_integrations_table
supabase migration new create_clickup_dedup_table
```

**`create_sync_queue`**
- `clickup_sync_queue` table
- `idx_sync_queue_ready` partial index

**`create_integrations_table`**
- `integrations` singleton table (all columns including `metadata jsonb`)
- RLS: admin SELECT; super_admin write
- Seed one empty row

**`create_clickup_dedup_table`**
- `clickup_webhook_events` table + nightly cleanup note
- RLS: ENABLE with no client policies (Edge Function only)

### Edge Functions

- **`clickup-webhook`** — inbound webhook handler (HMAC verify, dedup check, task/comment upserts, echo loop prevention via SET LOCAL)
- **`clickup-sync-worker`** — outbound queue processor (FOR UPDATE SKIP LOCKED, 30s interval, exponential backoff, cascade failure)
- **`file-proxy`** — attachment access via 60s signed URL redirect (JWT auth required)

### Outbound trigger

```bash
supabase migration new add_sync_queue_trigger
```
- AFTER INSERT OR UPDATE on `tasks` and `comments`: enqueue to `clickup_sync_queue` when `last_updated_by_source = 'portal'`

### src/api/

```
src/api/integrations.ts   — fetchIntegrations(), connectClickUp(), disconnectClickUp(),
                             connectDiscord(), disconnectDiscord(), testDiscord()
```

### src/hooks/

```
src/hooks/useIntegrations.ts
```

### Frontend

- Settings → Integrations page
  - ClickUp: connect (enter API token), disconnect, sync status, status mapping table
  - Discord: paste webhook URL, enable toggle, action filter, test button
- `ClickUpStatus` component now shows real `sync_state` from tasks
- Retry Sync button on error state tasks

### Testing checklist

- [ ] Task created in portal appears in ClickUp within 30 seconds
- [ ] Task updated in ClickUp arrives in portal via webhook within seconds
- [ ] Echo loop: ClickUp update does NOT re-enqueue a sync job
- [ ] Rate limit scenario: queue backs off and retries correctly
- [ ] File uploaded in portal creates a ClickUp comment with the proxy URL
- [ ] `file-proxy` returns 403 for unauthenticated requests
- [ ] `file-proxy` returns 403 for client users on non-client-visible attachments
- [ ] Webhook HMAC failure returns 401 (verified in Supabase logs)
- [ ] `src/types/database.ts` committed

---

## Phase 8 — Realtime & Notifications

**Goal:** Comments appear live without refresh. Notification bell updates live. Task board status changes broadcast instantly.

**Depends on:** Phase 5 (tables), Phase 7 (sync badge updates from worker)

### src/hooks/realtime/

```
src/hooks/realtime/useRealtimeComments.ts     — postgres_changes on comments (per task)
src/hooks/realtime/useRealtimeNotifications.ts — postgres_changes on notifications (per user)
src/hooks/realtime/useRealtimeTasks.ts         — Broadcast channel (per project board)
```

Rules:
- All Realtime subscriptions flow into TanStack Query cache via `queryClient.setQueryData` or `invalidateQueries`
- Never into `useState`
- Always clean up channels in `useEffect` return

### Frontend

- Wire `useRealtimeComments` into task drawer comment section
- Wire `useRealtimeNotifications` into topbar bell
- Wire `useRealtimeTasks` into Kanban board (broadcast from sync worker on task status change)
- Connection health indicator (optional): shows "live" / "reconnecting"

### Testing checklist

- [ ] Two browser tabs open on same task: comment in one appears in the other without refresh
- [ ] Notification bell count updates live when a new notification is inserted
- [ ] Kanban board status column updates live when another user moves a task
- [ ] Component unmount cleans up channel (verify no channel leak in Supabase dashboard)

---

## Phase 9 — Client Portal

**Goal:** Clients can log in and see their projects, tasks, and comments. Completely separate visual theme.

**Depends on:** Phase 5 (projects/tasks/comments/attachments with `client_visible` flags)

### Migrations

```bash
supabase migration new seed_client_roles
```

- No new tables; `client_owner` and `client_member` roles already exist in the CHECK constraint
- Seed the `role_feature_flags` for client roles if any UI gates are needed

### Frontend

- `ClientShell` layout (horizontal topbar, no sidebar, warm cream theme via `src/styles/client-theme.css`)
- Client login route (`/client/login`)
- Client dashboard — active projects overview
- Client project page — milestone timeline, task list (client-visible only)
- Client task detail — comments (client-visible only), attachments (client-visible only)
- Approval flow UI: pending/approved/revision/rejected states with animations
- No internal metrics visible (no XP, no ClickUp sync badges, no team performance)

### Testing checklist

- [ ] Client can only see projects where `projects.client_visible = true`
- [ ] Client can only see tasks where `tasks.client_visible = true` AND `projects.client_visible = true`
- [ ] Client cannot see internal-only comments
- [ ] Client cannot POST a comment on a non-client-visible task (RLS blocks at DB level)
- [ ] Internal portal and client portal are visually completely distinct

---

## Phase 10 — Reports & Analytics

**Goal:** Admin, PM, HR, and Finance can view reports relevant to their role.

**Depends on:** Phases 3–9 (all data sources)

### No new migrations needed

All data is already in the existing tables. Reports are read-only queries.

### src/api/

```
src/api/reports.ts   — fetchAttendanceReport(), fetchProjectReport(),
                        fetchTaskReport(), fetchXpReport(), fetchBillingReport()
```

### src/hooks/

```
src/hooks/useReports.ts
```

### Frontend

- Reports page gated by `can_view_reports` feature flag
- HR view: attendance summary (by employee, by team, by date range), late/absent trends
- Finance view: project billing summary, client project status
- PM view: task completion rates, overdue tasks, per-project throughput
- Admin view: all of the above + XP leaderboard trends
- All charts use Recharts

---

## Phase 11 — Discord Integration

**Standalone — can be done any time after Phase 6 (audit_logs exist)**

### Edge Function

**`discord-audit-post`**
- Reads `integrations.discord_audit_enabled` and `discord_audit_filter`
- Fetches webhook URL from Vault
- Formats and POSTs Discord embed
- Fire-and-forget; failure logged in `audit_logs`

### Frontend

Already covered in Phase 7 Settings page (Discord section). Just wire the Edge Function deploy.

### Testing checklist

- [ ] Audit log action matching the filter causes a Discord message
- [ ] Discord failure does NOT block any portal operation
- [ ] Disabling the toggle stops messages immediately

---

## Summary Table

| Phase | Feature | New Tables | Edge Functions | Priority |
|-------|---------|-----------|---------------|----------|
| 0 | Project setup | — | — | Blocker |
| 1 | Authentication | `levels`, `profiles`, `role_feature_flags` | — | **Critical** |
| 2 | Gamification | `xp_transactions`, `rewards`, `reward_redemptions`, `quests`, `quest_progress`, `notifications` | `quest-evaluator` (shell) | **Critical** |
| 3 | Attendance | `teams`, `attendance_settings`, `attendance`, `enrolled_devices` | `attendance-checkin`, `quest-evaluator` (full) | **Critical** |
| 4 | People & Teams | — (teams already created) | — | High |
| 5 | Projects & Tasks | `clients`, `client_members`, `projects`, `project_members`, `tasks`, `task_assignees`, `checklists`, `checklist_items`, `comments`, `attachments`, `clickup_status_mappings` | — | High |
| 6 | Audit Logging | `audit_logs` (partitioned) | — | High |
| 7 | ClickUp | `clickup_sync_queue`, `integrations`, `clickup_webhook_events` | `clickup-webhook`, `clickup-sync-worker`, `file-proxy` | Medium |
| 8 | Realtime | — | — | Medium |
| 9 | Client Portal | — | — | Medium |
| 10 | Reports | — | — | Low |
| 11 | Discord | — | `discord-audit-post` | Low |
