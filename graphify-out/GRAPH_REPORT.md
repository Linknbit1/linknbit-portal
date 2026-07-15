# Graph Report - linknbit-portal  (2026-07-15)

## Corpus Check
- 154 files · ~302,543 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1506 nodes · 2152 edges · 37 communities detected
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 220 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 86|Community 86]]

## God Nodes (most connected - your core abstractions)
1. `select()` - 95 edges
2. `$()` - 85 edges
3. `toast()` - 83 edges
4. `switchPanel()` - 42 edges
5. `openModal()` - 29 edges
6. `Linknbit Operations Portal — Development Rules` - 28 edges
7. `Linknbit Unified Operations Portal — Development Rules` - 28 edges
8. `update()` - 27 edges
9. `closeModal()` - 25 edges
10. `**C. MARKETING SERVICE**` - 25 edges

## Surprising Connections (you probably didn't know these)
- `handleRegister()` --calls--> `toast()`  [INFERRED]
  src/components/shared/MyDevicesCard.tsx → references/office-quest-app/assets/js/office-quest.js
- `handleCheckIn()` --calls--> `toast()`  [INFERRED]
  src/components/shared/AttendanceCheckInCard.tsx → references/office-quest-app/assets/js/office-quest.js
- `handleRegister()` --calls--> `toast()`  [INFERRED]
  src/components/shared/AttendanceCheckInCard.tsx → references/office-quest-app/assets/js/office-quest.js
- `handleCheckOut()` --calls--> `toast()`  [INFERRED]
  src/components/shared/AttendanceCheckInCard.tsx → references/office-quest-app/assets/js/office-quest.js
- `handleChangePassword()` --calls--> `toast()`  [INFERRED]
  src/pages/ProfilePage.tsx → references/office-quest-app/assets/js/office-quest.js

## Communities

### Community 0 - "Community 0"
Cohesion: 0.03
Nodes (192): handleSync(), handleCheckIn(), handleCheckOut(), $(), addColumn(), addCommentLink(), addImage(), addLink() (+184 more)

### Community 1 - "Community 1"
Cohesion: 0.02
Nodes (102): addCompanyWfhDay(), addWorkingSaturday(), adminCheckOut(), approveDevice(), checkOut(), createHoliday(), createHolidayRange(), createLeaveType() (+94 more)

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
Nodes (41): approve(), closeModal(), cn(), confirmDelete(), confirmReject(), deleteType(), exportCsv(), fmtDate() (+33 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (58): AI Collaboration Rules, API keys, Applying migrations, Approval Flow States, Architecture Discipline, Border Radius, ClickUp Integration UI, Client Portal (light mode — completely separate theme) (+50 more)

### Community 8 - "Community 8"
Cohesion: 0.05
Nodes (26): checkIn(), registerDevice(), bffFetch(), bffRefreshSession(), bffSignIn(), bffSignOut(), fetchActiveProfiles(), fetchProfile() (+18 more)

### Community 10 - "Community 10"
Cohesion: 0.05
Nodes (42): 10. Row Level Security Policies, Attachments, Attendance, Audit Logs, Checklists & Checklist Items, ClickUp Status Mappings, Clients, code:sql (CREATE OR REPLACE FUNCTION current_user_role() RETURNS text ) (+34 more)

### Community 11 - "Community 11"
Cohesion: 0.07
Nodes (15): AttendancePage(), if(), useAuthContext(), HomeRedirect(), PrivateRoute(), RoleGuard(), useSignIn(), useSignOut() (+7 more)

### Community 12 - "Community 12"
Cohesion: 0.07
Nodes (10): formatRelativeTime(), grantLp(), asDifficulty(), difficultyMeta(), handleClaim(), handleGrant(), handleRedeem(), nameOf() (+2 more)

### Community 13 - "Community 13"
Cohesion: 0.08
Nodes (12): validateAvatarFile(), dcExport(), dcFlatten(), DCSection(), DesignCanvas(), onPickAvatar(), save(), add() (+4 more)

### Community 14 - "Community 14"
Cohesion: 0.08
Nodes (10): SalaryCard(), SalaryForm(), AddMemberModal(), TeamModal(), useToast(), useSalary(), useUpsertSalary(), useAddTeamMember() (+2 more)

### Community 15 - "Community 15"
Cohesion: 0.07
Nodes (27): Claude Design Prompt, code:md (Design a comprehensive UI design system for a product called), code:md (Using the Linknbit Unified Operations Portal design system, ), code:md (Using the Linknbit Unified Operations Portal design system, ), code:md (Using the Linknbit Unified Operations Portal design system, ), code:md (Using the Linknbit Unified Operations Portal design system, ), code:md (Design a comprehensive UI design system for a product called), code:md (Using the Linknbit Unified Operations Portal design system e) (+19 more)

### Community 16 - "Community 16"
Cohesion: 0.13
Nodes (22): **1.10 Special Shoutouts (Examples)**, **1.11 System Discipline & Participation Restrictions**, **1.12 System Rules Summary**, **1.13 Simple Understanding of System**, **1.14 Final Note**, **1.1 Purpose of the System**, **1.2 System Overview**, **1.3 Currency System (Link Points \- LP)** (+14 more)

### Community 17 - "Community 17"
Cohesion: 0.16
Nodes (8): calcStreak(), canEditDetails(), canManagePeople(), canManageTarget(), canResendInvite(), canSetPassword(), has(), isUserRole()

### Community 18 - "Community 18"
Cohesion: 0.12
Nodes (13): Attendance, code:php (wp_insert_user([), code:php ([), code:php (current_user_can('manage_options')), code:php (current_user_can('linknbit_war_room_manage')), code:js (const apiRoot = window.linknbitWarRoomSettings.restUrl;), code:php (wp_localize_script('linknbit-war-room', 'linknbitWarRoomSett), Database (+5 more)

### Community 19 - "Community 19"
Cohesion: 0.22
Nodes (14): ensurePerformanceTeam(), fmtMonth(), getPerfMonths(), perfStatusLabel(), renderAdminDashboard(), renderAdminLeaderboard(), renderAdminPerformance(), renderEmpLeaderboard() (+6 more)

### Community 20 - "Community 20"
Cohesion: 0.19
Nodes (8): centerActiveTab(), confirm(), fmt2(), isHourDisabled(), scrollTo(), selectHour(), snapMin(), toAmPm()

### Community 21 - "Community 21"
Cohesion: 0.27
Nodes (12): androidSplashIconSvg(), glyph(), main(), out(), png(), render(), splashSvg(), squareIcon() (+4 more)

### Community 22 - "Community 22"
Cohesion: 0.24
Nodes (6): dayStr(), isDisabled(), isSelected(), isToday(), select(), toStr()

### Community 24 - "Community 24"
Cohesion: 0.18
Nodes (3): handleCheckIn(), handleCheckOut(), handleRegister()

### Community 26 - "Community 26"
Cohesion: 0.36
Nodes (7): detectBrowser(), detectOs(), getDeviceName(), getDeviceToken(), randomCookieName(), readCookie(), writeCookie()

### Community 27 - "Community 27"
Cohesion: 0.25
Nodes (2): ServiceChip(), useServices()

### Community 28 - "Community 28"
Cohesion: 0.32
Nodes (4): formatDate(), formatRelativeTime(), getDaysUntil(), isOverdue()

### Community 29 - "Community 29"
Cohesion: 0.25
Nodes (6): code:bash (node preview-server.js), Files, Fixes Applied, Preview Login, Viewing It, WordPress Integration Direction

### Community 31 - "Community 31"
Cohesion: 0.29
Nodes (1): sendComment()

### Community 32 - "Community 32"
Cohesion: 0.47
Nodes (6): renderAdminTeams(), renderEmpTeams(), renderSprintCards(), renderSprintStats(), renderSprintTeamTabs(), renderTeamCards()

### Community 35 - "Community 35"
Cohesion: 0.6
Nodes (5): canFulfillPayouts(), canGovernGamification(), canParticipate(), canRecognize(), has()

### Community 36 - "Community 36"
Cohesion: 0.33
Nodes (2): itemCls(), cn()

### Community 38 - "Community 38"
Cohesion: 0.33
Nodes (5): code:js (export default defineConfig([), code:js (// eslint.config.js), Expanding the ESLint configuration, React Compiler, React + TypeScript + Vite

### Community 40 - "Community 40"
Cohesion: 0.5
Nodes (3): moreNavItems(), visibleNavItems(), isAuthoritative()

### Community 41 - "Community 41"
Cohesion: 0.5
Nodes (2): isIos(), usePwaInstall()

### Community 43 - "Community 43"
Cohesion: 0.5
Nodes (1): handleRegister()

### Community 45 - "Community 45"
Cohesion: 0.5
Nodes (1): save()

### Community 47 - "Community 47"
Cohesion: 0.5
Nodes (3): Answer, Q: Why does cn() connect Community 0 to Community 1, Community 10, Community 3, and Community 5?, Source Nodes

### Community 86 - "Community 86"
Cohesion: 1.0
Nodes (1): graphify

## Knowledge Gaps
- **237 isolated node(s):** `graphify`, `Color Naming Convention`, `Typography`, `Border Radius`, `Internal Portal (dark mode — default)` (+232 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 27`** (8 nodes): `ServiceChip()`, `ServiceChip.tsx`, `useServices.ts`, `useCreateService()`, `useDeleteService()`, `useServices()`, `useServiceUsage()`, `useUpdateService()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (7 nodes): `TaskDetailPage.tsx`, `addSubtask()`, `formatDate()`, `formatRelTime()`, `getInitials()`, `sendComment()`, `toggleSubtask()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (6 nodes): `itemCls()`, `cn()`, `FileTypeIcon()`, `formatDate()`, `BottomTabBar.tsx`, `FilesPage.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (5 nodes): `usePwaInstall.ts`, `emit()`, `isIos()`, `isStandalone()`, `usePwaInstall()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (4 nodes): `fmtDate()`, `handleRegister()`, `statusMeta()`, `MyDevicesCard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (4 nodes): `cn()`, `save()`, `visibleSectionsFor()`, `SettingsPage.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 86`** (2 nodes): `AGENTS.md`, `graphify`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `toast()` connect `Community 0` to `Community 1`, `Community 5`, `Community 43`, `Community 12`, `Community 13`, `Community 24`, `Community 31`?**
  _High betweenness centrality (0.105) - this node is a cross-community bridge._
- **Why does `update()` connect `Community 1` to `Community 8`, `Community 12`, `Community 45`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Why does `handleAdd()` connect `Community 1` to `Community 0`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Are the 93 inferred relationships involving `select()` (e.g. with `fetchLeaderboard()` and `fetchProfileDirectory()`) actually correct?**
  _`select()` has 93 INFERRED edges - model-reasoned connections that need verification._
- **Are the 40 inferred relationships involving `toast()` (e.g. with `add()` and `handleRegister()`) actually correct?**
  _`toast()` has 40 INFERRED edges - model-reasoned connections that need verification._
- **What connects `graphify`, `Color Naming Convention`, `Typography` to the rest of the system?**
  _237 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.03 - nodes in this community are weakly interconnected._