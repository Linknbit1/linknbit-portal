# Graph Report - linknbit-portal  (2026-06-15)

## Corpus Check
- 123 files · ~214,994 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1279 nodes · 1820 edges · 32 communities detected
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 166 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 75|Community 75]]

## God Nodes (most connected - your core abstractions)
1. `$()` - 85 edges
2. `select()` - 76 edges
3. `toast()` - 70 edges
4. `switchPanel()` - 42 edges
5. `openModal()` - 29 edges
6. `Linknbit Unified Operations Portal — Development Rules` - 28 edges
7. `closeModal()` - 25 edges
8. `**C. MARKETING SERVICE**` - 25 edges
9. `updateTopbar()` - 23 edges
10. `update()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `handleCheckIn()` --calls--> `toast()`  [INFERRED]
  src/components/shared/AttendanceCheckInCard.tsx → references/office-quest-app/assets/js/office-quest.js
- `handleCheckOut()` --calls--> `toast()`  [INFERRED]
  src/components/shared/AttendanceCheckInCard.tsx → references/office-quest-app/assets/js/office-quest.js
- `toast()` --calls--> `handleSync()`  [INFERRED]
  references/office-quest-app/assets/js/office-quest.js → src/pages/admin/ClickUpPage.tsx
- `toast()` --calls--> `sendComment()`  [INFERRED]
  references/office-quest-app/assets/js/office-quest.js → src/pages/admin/TaskDetailPage.tsx
- `toast()` --calls--> `handleAdd()`  [INFERRED]
  references/office-quest-app/assets/js/office-quest.js → src/pages/admin/ClientsPage.tsx

## Communities

### Community 0 - "Community 0"
Cohesion: 0.03
Nodes (186): $(), addCommentLink(), addImage(), addLink(), addReaction(), adminGiveShoutout(), attendanceCheckState(), attendanceStatusMeta() (+178 more)

### Community 1 - "Community 1"
Cohesion: 0.03
Nodes (80): addWorkingSaturday(), adminCheckOut(), approveDevice(), checkOut(), createHoliday(), createHolidayRange(), createLeaveType(), deactivateDevice() (+72 more)

### Community 2 - "Community 2"
Cohesion: 0.02
Nodes (104): Always-active conventions (every phase), code:block1 (Phase 0: Project Setup), code:block10 (src/api/gamification.ts     — fetchXpTransactions(), fetchRe), code:block11 (src/hooks/useGamification.ts    — useXpTransactions(), useRe), code:block12 (src/lib/deviceUtils.ts), code:bash (supabase migration new create_teams_table), code:block14 (src/api/attendance.ts   — checkIn(), checkOut(), fetchMyAtte), code:block15 (src/hooks/useAttendance.ts   — useMyAttendance(), useAllAtte) (+96 more)

### Community 3 - "Community 3"
Cohesion: 0.02
Nodes (83): **10\. Final Notes**, **1\. Overview**, **2\. Core Objectives**, **3\. Core Architecture Philosophy**, **4\. Service-Based System (Core Backbone)**, **5.1 Super Admin**, **5.2 Admin / Operations Manager**, **5.3 Project Manager** (+75 more)

### Community 4 - "Community 4"
Cohesion: 0.03
Nodes (68): 11. SaaS Scalability, 1. Architecture Overview, 2. Role-Based Access Control, 3. Database Schema, 4. ClickUp Integration, 5. Discord Integration, 6. Real-time Strategy, 7. Audit Logging (+60 more)

### Community 5 - "Community 5"
Cohesion: 0.04
Nodes (57): AI Collaboration Rules, API keys, Applying migrations, Approval Flow States, Architecture Discipline, Border Radius, ClickUp Integration UI, Client Portal (light mode — completely separate theme) (+49 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (16): checkIn(), bffFetch(), bffRefreshSession(), bffSignIn(), bffSignOut(), fetchActiveProfiles(), fetchProfile(), calcStreak() (+8 more)

### Community 7 - "Community 7"
Cohesion: 0.05
Nodes (20): AttendancePage(), MarkModal(), useAuthContext(), PrivateRoute(), ProfileDialog(), RoleGuard(), AddMemberModal(), TeamModal() (+12 more)

### Community 8 - "Community 8"
Cohesion: 0.05
Nodes (3): UpcomingScheduleSection(), useHolidays(), useWorkingSaturdays()

### Community 9 - "Community 9"
Cohesion: 0.05
Nodes (22): approve(), cn(), confirmReject(), deleteType(), exportCsv(), fmtDate(), fmtRange(), fmtTimeStr() (+14 more)

### Community 10 - "Community 10"
Cohesion: 0.05
Nodes (42): 10. Row Level Security Policies, Attachments, Attendance, Audit Logs, Checklists & Checklist Items, ClickUp Status Mappings, Clients, code:sql (CREATE OR REPLACE FUNCTION current_user_role() RETURNS text ) (+34 more)

### Community 12 - "Community 12"
Cohesion: 0.07
Nodes (27): Claude Design Prompt, code:md (Design a comprehensive UI design system for a product called), code:md (Using the Linknbit Unified Operations Portal design system, ), code:md (Using the Linknbit Unified Operations Portal design system, ), code:md (Using the Linknbit Unified Operations Portal design system, ), code:md (Using the Linknbit Unified Operations Portal design system, ), code:md (Design a comprehensive UI design system for a product called), code:md (Using the Linknbit Unified Operations Portal design system e) (+19 more)

### Community 13 - "Community 13"
Cohesion: 0.13
Nodes (22): **1.10 Special Shoutouts (Examples)**, **1.11 System Discipline & Participation Restrictions**, **1.12 System Rules Summary**, **1.13 Simple Understanding of System**, **1.14 Final Note**, **1.1 Purpose of the System**, **1.2 System Overview**, **1.3 Currency System (Link Points \- LP)** (+14 more)

### Community 14 - "Community 14"
Cohesion: 0.1
Nodes (10): formatRelativeTime(), grantLp(), asDifficulty(), difficultyMeta(), handleClaim(), handleGrant(), handleRedeem(), nameOf() (+2 more)

### Community 15 - "Community 15"
Cohesion: 0.16
Nodes (12): addColumn(), deleteColumn(), ensureProjectColumns(), refreshKanban(), renameColumn(), setColColor(), confirm(), fmt2() (+4 more)

### Community 16 - "Community 16"
Cohesion: 0.12
Nodes (13): Attendance, code:php (wp_insert_user([), code:php ([), code:php (current_user_can('manage_options')), code:php (current_user_can('linknbit_war_room_manage')), code:js (const apiRoot = window.linknbitWarRoomSettings.restUrl;), code:php (wp_localize_script('linknbit-war-room', 'linknbitWarRoomSett), Database (+5 more)

### Community 17 - "Community 17"
Cohesion: 0.14
Nodes (5): dcExport(), dcFlatten(), DCSection(), DesignCanvas(), save()

### Community 18 - "Community 18"
Cohesion: 0.22
Nodes (14): ensurePerformanceTeam(), fmtMonth(), getPerfMonths(), perfStatusLabel(), renderAdminDashboard(), renderAdminLeaderboard(), renderAdminPerformance(), renderEmpLeaderboard() (+6 more)

### Community 19 - "Community 19"
Cohesion: 0.24
Nodes (6): dayStr(), isDisabled(), isSelected(), isToday(), select(), toStr()

### Community 22 - "Community 22"
Cohesion: 0.22
Nodes (2): handleCheckIn(), handleCheckOut()

### Community 23 - "Community 23"
Cohesion: 0.25
Nodes (2): ServiceChip(), useServices()

### Community 24 - "Community 24"
Cohesion: 0.32
Nodes (4): formatDate(), formatRelativeTime(), getDaysUntil(), isOverdue()

### Community 25 - "Community 25"
Cohesion: 0.25
Nodes (6): code:bash (node preview-server.js), Files, Fixes Applied, Preview Login, Viewing It, WordPress Integration Direction

### Community 26 - "Community 26"
Cohesion: 0.24
Nodes (3): handleSync(), handleCheckIn(), handleCheckOut()

### Community 27 - "Community 27"
Cohesion: 0.29
Nodes (1): sendComment()

### Community 28 - "Community 28"
Cohesion: 0.47
Nodes (6): renderAdminTeams(), renderEmpTeams(), renderSprintCards(), renderSprintStats(), renderSprintTeamTabs(), renderTeamCards()

### Community 29 - "Community 29"
Cohesion: 0.6
Nodes (5): canFulfillPayouts(), canGovernGamification(), canParticipate(), canRecognize(), has()

### Community 31 - "Community 31"
Cohesion: 0.33
Nodes (5): code:js (export default defineConfig([), code:js (// eslint.config.js), Expanding the ESLint configuration, React Compiler, React + TypeScript + Vite

### Community 32 - "Community 32"
Cohesion: 0.5
Nodes (2): visibleNavItems(), isAuthoritative()

### Community 38 - "Community 38"
Cohesion: 0.5
Nodes (3): Answer, Q: Why does cn() connect Community 0 to Community 1, Community 10, Community 3, and Community 5?, Source Nodes

### Community 44 - "Community 44"
Cohesion: 1.0
Nodes (2): useIsDesktop(), useMediaQuery()

### Community 75 - "Community 75"
Cohesion: 1.0
Nodes (1): graphify

## Knowledge Gaps
- **255 isolated node(s):** `graphify`, `Product Overview`, `Tech Stack`, `Color Naming Convention`, `Typography` (+250 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 22`** (9 nodes): `CheckInCardSkeleton()`, `ErrorBanner()`, `fmtHHMM()`, `fmtIso()`, `handleCheckIn()`, `handleCheckOut()`, `sessionDuration()`, `tick()`, `AttendanceCheckInCard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (8 nodes): `ServiceChip()`, `ServiceChip.tsx`, `useServices.ts`, `useCreateService()`, `useDeleteService()`, `useServices()`, `useServiceUsage()`, `useUpdateService()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (7 nodes): `TaskDetailPage.tsx`, `addSubtask()`, `formatDate()`, `formatRelTime()`, `getInitials()`, `sendComment()`, `toggleSubtask()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (4 nodes): `visibleNavItems()`, `isAuthoritative()`, `navItems.ts`, `roles.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (3 nodes): `useMediaQuery.ts`, `useIsDesktop()`, `useMediaQuery()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 75`** (2 nodes): `AGENTS.md`, `graphify`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `toast()` connect `Community 0` to `Community 1`, `Community 9`, `Community 14`, `Community 15`, `Community 17`, `Community 22`, `Community 26`, `Community 27`?**
  _High betweenness centrality (0.166) - this node is a cross-community bridge._
- **Why does `update()` connect `Community 1` to `Community 14`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **Why does `handleAdd()` connect `Community 1` to `Community 0`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Are the 74 inferred relationships involving `select()` (e.g. with `fetchLeaderboard()` and `fetchProfileDirectory()`) actually correct?**
  _`select()` has 74 INFERRED edges - model-reasoned connections that need verification._
- **Are the 27 inferred relationships involving `toast()` (e.g. with `add()` and `handleCheckIn()`) actually correct?**
  _`toast()` has 27 INFERRED edges - model-reasoned connections that need verification._
- **What connects `graphify`, `Product Overview`, `Tech Stack` to the rest of the system?**
  _255 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.03 - nodes in this community are weakly interconnected._