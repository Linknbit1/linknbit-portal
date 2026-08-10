# Graph Report - linknbit-portal  (2026-08-10)

## Corpus Check
- 330 files · ~424,673 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2414 nodes · 3366 edges · 62 communities detected
- Extraction: 84% EXTRACTED · 16% INFERRED · 0% AMBIGUOUS · INFERRED: 542 edges (avg confidence: 0.78)
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
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 155|Community 155]]
- [[_COMMUNITY_Community 195|Community 195]]
- [[_COMMUNITY_Community 196|Community 196]]
- [[_COMMUNITY_Community 197|Community 197]]

## God Nodes (most connected - your core abstractions)
1. `select()` - 196 edges
2. `toast()` - 94 edges
3. `$()` - 85 edges
4. `switchPanel()` - 42 edges
5. `openModal()` - 29 edges
6. `Linknbit Operations Portal — Development Rules` - 28 edges
7. `Linknbit Unified Operations Portal — Development Rules` - 28 edges
8. `useAuthContext()` - 27 edges
9. `closeModal()` - 25 edges
10. `**C. MARKETING SERVICE**` - 25 edges

## Surprising Connections (you probably didn't know these)
- `handleRegister()` --calls--> `toast()`  [INFERRED]
  src/components/shared/MyDevicesCard.tsx → references/office-quest-app/assets/js/office-quest.js
- `handleCheckIn()` --calls--> `toast()`  [INFERRED]
  src/components/shared/AttendanceCheckInCard.tsx → references/office-quest-app/assets/js/office-quest.js
- `handleRegister()` --calls--> `toast()`  [INFERRED]
  src/components/shared/AttendanceCheckInCard.tsx → references/office-quest-app/assets/js/office-quest.js
- `handleUnlink()` --calls--> `toast()`  [INFERRED]
  src/components/shared/BiometricTerminalsTab.tsx → references/office-quest-app/assets/js/office-quest.js
- `submitLog()` --calls--> `toast()`  [INFERRED]
  src/components/shared/TaskTimeTracker.tsx → references/office-quest-app/assets/js/office-quest.js

## Communities

### Community 0 - "Community 0"
Cohesion: 0.01
Nodes (184): fetchApprovals(), requestApproval(), reviewApproval(), inferContentType(), addAttachmentLink(), fetchAttachmentById(), fetchAttachments(), fetchProjectFiles() (+176 more)

### Community 1 - "Community 1"
Cohesion: 0.02
Nodes (212): submit(), handleSend(), $(), addColumn(), addCommentLink(), addImage(), addLink(), addReaction() (+204 more)

### Community 2 - "Community 2"
Cohesion: 0.02
Nodes (68): AppShell(), AttendancePage(), AuthProvider(), useAuthContext(), ClientFormModal(), CreateChannelModal(), ImpersonationBanner(), NewDMPicker() (+60 more)

### Community 3 - "Community 3"
Cohesion: 0.02
Nodes (14): filterNavItems(), groupNavItems(), useMoreNavGroups(), useMoreNavItems(), useNavGroups(), useNavItems(), useAllAttendanceExceptions(), useAllLeaveRequests() (+6 more)

### Community 4 - "Community 4"
Cohesion: 0.02
Nodes (104): Always-active conventions (every phase), code:block1 (Phase 0: Project Setup), code:block10 (src/api/gamification.ts     — fetchXpTransactions(), fetchRe), code:block11 (src/hooks/useGamification.ts    — useXpTransactions(), useRe), code:block12 (src/lib/deviceUtils.ts), code:bash (supabase migration new create_teams_table), code:block14 (src/api/attendance.ts   — checkIn(), checkOut(), fetchMyAtte), code:block15 (src/hooks/useAttendance.ts   — useMyAttendance(), useAllAtte) (+96 more)

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (46): Config, _int_env(), load(), _load_env_file(), Configuration for the ZKTeco bridge.  Everything is environment-driven so the te, Minimal .env reader — avoids a python-dotenv dependency on the Pi.      Existing, commit(), Exception (+38 more)

### Community 6 - "Community 6"
Cohesion: 0.02
Nodes (83): **10\. Final Notes**, **1\. Overview**, **2\. Core Objectives**, **3\. Core Architecture Philosophy**, **4\. Service-Based System (Core Backbone)**, **5.1 Super Admin**, **5.2 Admin / Operations Manager**, **5.3 Project Manager** (+75 more)

### Community 7 - "Community 7"
Cohesion: 0.03
Nodes (68): 11. SaaS Scalability, 1. Architecture Overview, 2. Role-Based Access Control, 3. Database Schema, 4. ClickUp Integration, 5. Discord Integration, 6. Real-time Strategy, 7. Audit Logging (+60 more)

### Community 8 - "Community 8"
Cohesion: 0.04
Nodes (43): approve(), closeModal(), cn(), confirmDelete(), confirmReject(), deleteType(), exportCsv(), fmtDate() (+35 more)

### Community 9 - "Community 9"
Cohesion: 0.04
Nodes (30): formatRelativeTime(), DocEditor(), grantLp(), asDifficulty(), difficultyMeta(), handleClaim(), handleGrant(), handleRedeem() (+22 more)

### Community 10 - "Community 10"
Cohesion: 0.05
Nodes (58): AI Collaboration Rules, API keys, Applying migrations, Approval Flow States, Architecture Discipline, Border Radius, ClickUp Integration UI, Client Portal (light mode — completely separate theme) (+50 more)

### Community 11 - "Community 11"
Cohesion: 0.05
Nodes (25): checkIn(), registerDevice(), checkDayGates(), computeStatus(), localParts(), minutesOf(), resolveCutoffs(), bffFetch() (+17 more)

### Community 12 - "Community 12"
Cohesion: 0.05
Nodes (30): itemCls(), chatContentType(), safeStorageName(), validateChatAttachmentFile(), cn(), formatDate(), calcStreak(), deleteMessageAttachment() (+22 more)

### Community 13 - "Community 13"
Cohesion: 0.05
Nodes (42): 10. Row Level Security Policies, Attachments, Attendance, Audit Logs, Checklists & Checklist Items, ClickUp Status Mappings, Clients, code:sql (CREATE OR REPLACE FUNCTION current_user_role() RETURNS text ) (+34 more)

### Community 14 - "Community 14"
Cohesion: 0.06
Nodes (18): validateAvatarFile(), run(), dcExport(), dcFlatten(), DCSection(), DesignCanvas(), insertEmoji(), close() (+10 more)

### Community 15 - "Community 15"
Cohesion: 0.06
Nodes (19): fileKind(), previewMode(), validateAttachmentFile(), deleteAttachment(), getAttachmentUrl(), handleDownload(), handleFiles(), bucketOf() (+11 more)

### Community 16 - "Community 16"
Cohesion: 0.08
Nodes (26): formatClock(), formatEstimate(), formatMinutes(), parseDuration(), secondsBetween(), DurationInput(), _ask(), detect() (+18 more)

### Community 17 - "Community 17"
Cohesion: 0.06
Nodes (12): patch(), showNewEntries(), scrollAncestorToTop(), centerActiveTab(), toggleComplete(), confirm(), fmt2(), isHourDisabled() (+4 more)

### Community 18 - "Community 18"
Cohesion: 0.07
Nodes (27): Claude Design Prompt, code:md (Design a comprehensive UI design system for a product called), code:md (Using the Linknbit Unified Operations Portal design system, ), code:md (Using the Linknbit Unified Operations Portal design system, ), code:md (Using the Linknbit Unified Operations Portal design system, ), code:md (Using the Linknbit Unified Operations Portal design system, ), code:md (Design a comprehensive UI design system for a product called), code:md (Using the Linknbit Unified Operations Portal design system e) (+19 more)

### Community 19 - "Community 19"
Cohesion: 0.09
Nodes (15): AddProjectMemberModal(), remove(), AddMemberModal(), removeMember(), TeamModal(), useAddProjectService(), useAddServiceMembers(), useProjectInvalidation() (+7 more)

### Community 20 - "Community 20"
Cohesion: 0.09
Nodes (9): isAuthoritative(), officeTime(), MyStandup(), StandupPage(), useSetStandupParticipation(), useSetStandupRoleRequirement(), useSettingsInvalidation(), useStandupWindow() (+1 more)

### Community 21 - "Community 21"
Cohesion: 0.13
Nodes (22): **1.10 Special Shoutouts (Examples)**, **1.11 System Discipline & Participation Restrictions**, **1.12 System Rules Summary**, **1.13 Simple Understanding of System**, **1.14 Final Note**, **1.1 Purpose of the System**, **1.2 System Overview**, **1.3 Currency System (Link Points \- LP)** (+14 more)

### Community 22 - "Community 22"
Cohesion: 0.1
Nodes (9): handleCreate(), handleUnlink(), mintSecret(), SecretReveal(), TerminalCard(), clockSkewLabel(), terminalHealth(), useRotateTerminalSecret() (+1 more)

### Community 23 - "Community 23"
Cohesion: 0.15
Nodes (14): detectBrowser(), detectOs(), fallbackHash(), getDeviceFingerprint(), getDeviceName(), getDeviceToken(), randomCookieName(), readCookie() (+6 more)

### Community 25 - "Community 25"
Cohesion: 0.14
Nodes (10): assignRole(), createRole(), fetchPermissionCatalog(), fetchProfileRoles(), fetchRolePermissions(), fetchRoles(), revokeRole(), handleCreate() (+2 more)

### Community 26 - "Community 26"
Cohesion: 0.12
Nodes (13): Attendance, code:php (wp_insert_user([), code:php ([), code:php (current_user_can('manage_options')), code:php (current_user_can('linknbit_war_room_manage')), code:js (const apiRoot = window.linknbitWarRoomSettings.restUrl;), code:php (wp_localize_script('linknbit-war-room', 'linknbitWarRoomSett), Database (+5 more)

### Community 27 - "Community 27"
Cohesion: 0.17
Nodes (12): deletePerson(), fetchPeople(), fetchPerson(), fetchPersonProjects(), fetchPersonTeams(), fetchSalary(), functionErrorMessage(), inviteUser() (+4 more)

### Community 28 - "Community 28"
Cohesion: 0.23
Nodes (9): clickDay(), dayStr(), fmt2(), label(), parseStr(), snap(), toAmPm(), toggleOpen() (+1 more)

### Community 29 - "Community 29"
Cohesion: 0.24
Nodes (10): useCreateTemplate(), useCreateTemplateStage(), useCreateTemplateTask(), useDeleteTemplate(), useDeleteTemplateStage(), useDeleteTemplateTask(), useTemplateInvalidation(), useUpdateTemplate() (+2 more)

### Community 30 - "Community 30"
Cohesion: 0.15
Nodes (3): fmtClock(), fmtDay(), handleImpersonate()

### Community 31 - "Community 31"
Cohesion: 0.24
Nodes (6): dayStr(), isDisabled(), isSelected(), isToday(), select(), toStr()

### Community 33 - "Community 33"
Cohesion: 0.23
Nodes (8): formatDate(), formatRelativeTime(), fromDateTimeInput(), getDaysUntil(), isOverdue(), pad2(), toDateInput(), toTimeInput()

### Community 35 - "Community 35"
Cohesion: 0.4
Nodes (9): glyph(), main(), maskableIconSvg(), out(), png(), render(), splashSvg(), squareIcon() (+1 more)

### Community 36 - "Community 36"
Cohesion: 0.31
Nodes (6): useDeleteTimeEntry(), useInvalidateTime(), useLogTime(), useStartTimer(), useStopTimer(), useUpdateTimeEntry()

### Community 38 - "Community 38"
Cohesion: 0.4
Nodes (8): b64urlToUint8(), bufToB64url(), getCurrentSubscription(), permissionState(), pushSupported(), subscribeThisDevice(), toBrowserSubscription(), unsubscribeThisDevice()

### Community 39 - "Community 39"
Cohesion: 0.22
Nodes (2): handleCheckIn(), handleRegister()

### Community 41 - "Community 41"
Cohesion: 0.25
Nodes (2): ServiceChip(), useServices()

### Community 43 - "Community 43"
Cohesion: 0.29
Nodes (2): useFlatMessages(), useMessages()

### Community 44 - "Community 44"
Cohesion: 0.43
Nodes (7): deleteProjectCascade(), deleteStorageObjects(), deleteTaskCascade(), fetchProjectDeleteImpact(), fetchTaskDeleteImpact(), readCount(), taskIdsForProject()

### Community 45 - "Community 45"
Cohesion: 0.25
Nodes (6): code:bash (node preview-server.js), Files, Fixes Applied, Preview Login, Viewing It, WordPress Integration Direction

### Community 46 - "Community 46"
Cohesion: 0.43
Nodes (6): handleDrop(), ScheduleLine(), stamp(), statusOf(), TaskCardProgress(), taskProgress()

### Community 48 - "Community 48"
Cohesion: 0.33
Nodes (3): useFileViewer(), RichRenderer(), useFileRefClick()

### Community 49 - "Community 49"
Cohesion: 0.4
Nodes (3): begin(), onToggleTimer(), submitLog()

### Community 50 - "Community 50"
Cohesion: 0.47
Nodes (4): AttendanceChips(), Dash(), dayPartSuffix(), isFullDayOff()

### Community 54 - "Community 54"
Cohesion: 0.4
Nodes (3): fetchChannelMembers(), leaveChannel(), removeChannelMember()

### Community 57 - "Community 57"
Cohesion: 0.33
Nodes (5): code:js (export default defineConfig([), code:js (// eslint.config.js), Expanding the ESLint configuration, React Compiler, React + TypeScript + Vite

### Community 60 - "Community 60"
Cohesion: 0.4
Nodes (2): fileRefExtension(), renderSuggestion()

### Community 61 - "Community 61"
Cohesion: 0.5
Nodes (2): isIos(), usePwaInstall()

### Community 62 - "Community 62"
Cohesion: 0.6
Nodes (3): useAddChannelRole(), useRemoveChannelRole(), useRoleMutation()

### Community 63 - "Community 63"
Cohesion: 0.4
Nodes (1): fetchTeamMembers()

### Community 67 - "Community 67"
Cohesion: 0.5
Nodes (1): handleRegister()

### Community 68 - "Community 68"
Cohesion: 0.83
Nodes (3): CustomRoleBadge(), RoleBadge(), sizeClass()

### Community 72 - "Community 72"
Cohesion: 0.83
Nodes (3): ipInCidr(), parseIpv4(), toInt()

### Community 73 - "Community 73"
Cohesion: 0.67
Nodes (2): afterCreate(), openChannel()

### Community 74 - "Community 74"
Cohesion: 0.5
Nodes (3): Answer, Q: Why does cn() connect Community 0 to Community 1, Community 10, Community 3, and Community 5?, Source Nodes

### Community 75 - "Community 75"
Cohesion: 0.67
Nodes (1): handleCheckIn()

### Community 88 - "Community 88"
Cohesion: 0.67
Nodes (1): handleSync()

### Community 90 - "Community 90"
Cohesion: 0.67
Nodes (1): handleSubmit()

### Community 155 - "Community 155"
Cohesion: 1.0
Nodes (1): graphify

### Community 195 - "Community 195"
Cohesion: 1.0
Nodes (1): One device read: sync clock, pull the log into the spool, report health.

### Community 196 - "Community 196"
Cohesion: 1.0
Nodes (1): Send unacked punches in batches. Returns how many were acked.

### Community 197 - "Community 197"
Cohesion: 1.0
Nodes (1): Push enrolled users so admins can link enroll numbers by name.          Names tr

## Knowledge Gaps
- **256 isolated node(s):** `Configuration for the ZKTeco bridge.  Everything is environment-driven so the te`, `Minimal .env reader — avoids a python-dotenv dependency on the Pi.      Existing`, `Durable local punch spool.  The Pi must never lose a punch to a WAN outage, so e`, `Stable idempotency key. Must be computed identically on every retry.`, `Record a punch. Returns True if it was new to the spool.` (+251 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 39`** (9 nodes): `CheckInCardSkeleton()`, `DeviceNotice()`, `ErrorBanner()`, `fmtHHMM()`, `fmtIso()`, `handleCheckIn()`, `handleRegister()`, `tick()`, `AttendanceCheckInCard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (8 nodes): `ServiceChip()`, `ServiceChip.tsx`, `useServices.ts`, `useCreateService()`, `useDeleteService()`, `useServices()`, `useServiceUsage()`, `useUpdateService()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (8 nodes): `useMessages.ts`, `useDeleteMessage()`, `useEditMessage()`, `useFlatMessages()`, `useMarkChannelRead()`, `useMessages()`, `useMessageSearch()`, `useSendMessage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 60`** (5 nodes): `fileRefExtension()`, `iconFor()`, `fileMention.tsx`, `suggestionUtils.tsx`, `renderSuggestion()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 61`** (5 nodes): `usePwaInstall.ts`, `emit()`, `isIos()`, `isStandalone()`, `usePwaInstall()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 63`** (5 nodes): `teamMembers.ts`, `addTeamMember()`, `fetchTeamMembers()`, `removeTeamMember()`, `setProfileTeams()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 67`** (4 nodes): `fmtDate()`, `handleRegister()`, `statusMeta()`, `MyDevicesCard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 73`** (4 nodes): `afterCreate()`, `afterRemoved()`, `openChannel()`, `ChatPage.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 75`** (3 nodes): `formatTime()`, `handleCheckIn()`, `DashboardPage.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 88`** (3 nodes): `cn()`, `handleSync()`, `ClickUpPage.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 90`** (3 nodes): `handleSubmit()`, `isStatus()`, `ProjectFormModal.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 155`** (2 nodes): `AGENTS.md`, `graphify`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 195`** (1 nodes): `One device read: sync clock, pull the log into the spool, report health.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 196`** (1 nodes): `Send unacked punches in batches. Returns how many were acked.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 197`** (1 nodes): `Push enrolled users so admins can link enroll numbers by name.          Names tr`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `toast()` connect `Community 1` to `Community 67`, `Community 39`, `Community 8`, `Community 9`, `Community 75`, `Community 14`, `Community 15`, `Community 49`, `Community 17`, `Community 22`, `Community 23`, `Community 88`, `Community 25`, `Community 90`, `Community 30`?**
  _High betweenness centrality (0.187) - this node is a cross-community bridge._
- **Why does `select()` connect `Community 0` to `Community 11`, `Community 12`, `Community 44`, `Community 54`, `Community 25`, `Community 27`, `Community 63`?**
  _High betweenness centrality (0.185) - this node is a cross-community bridge._
- **Why does `useToast()` connect `Community 2` to `Community 19`, `Community 22`, `Community 15`?**
  _High betweenness centrality (0.145) - this node is a cross-community bridge._
- **Are the 194 inferred relationships involving `select()` (e.g. with `isDeactivated()` and `auditOnce()`) actually correct?**
  _`select()` has 194 INFERRED edges - model-reasoned connections that need verification._
- **Are the 51 inferred relationships involving `toast()` (e.g. with `add()` and `openFile()`) actually correct?**
  _`toast()` has 51 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Configuration for the ZKTeco bridge.  Everything is environment-driven so the te`, `Minimal .env reader — avoids a python-dotenv dependency on the Pi.      Existing`, `Durable local punch spool.  The Pi must never lose a punch to a WAN outage, so e` to the rest of the system?**
  _256 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.01 - nodes in this community are weakly interconnected._