# Graph Report - linknbit-portal  (2026-08-21)

## Corpus Check
- 403 files · ~529,973 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2862 nodes · 4039 edges · 77 communities detected
- Extraction: 82% EXTRACTED · 18% INFERRED · 0% AMBIGUOUS · INFERRED: 741 edges (avg confidence: 0.79)
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
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 167|Community 167]]
- [[_COMMUNITY_Community 212|Community 212]]
- [[_COMMUNITY_Community 213|Community 213]]
- [[_COMMUNITY_Community 214|Community 214]]
- [[_COMMUNITY_Community 215|Community 215]]
- [[_COMMUNITY_Community 216|Community 216]]
- [[_COMMUNITY_Community 217|Community 217]]
- [[_COMMUNITY_Community 218|Community 218]]
- [[_COMMUNITY_Community 219|Community 219]]
- [[_COMMUNITY_Community 220|Community 220]]
- [[_COMMUNITY_Community 221|Community 221]]
- [[_COMMUNITY_Community 222|Community 222]]
- [[_COMMUNITY_Community 223|Community 223]]
- [[_COMMUNITY_Community 224|Community 224]]
- [[_COMMUNITY_Community 225|Community 225]]
- [[_COMMUNITY_Community 226|Community 226]]
- [[_COMMUNITY_Community 227|Community 227]]

## God Nodes (most connected - your core abstractions)
1. `select()` - 217 edges
2. `toast()` - 106 edges
3. `$()` - 85 edges
4. `switchPanel()` - 42 edges
5. `useAuthContext()` - 36 edges
6. `BdProvider()` - 32 edges
7. `openModal()` - 29 edges
8. `Linknbit Operations Portal — Development Rules` - 28 edges
9. `Linknbit Unified Operations Portal — Development Rules` - 28 edges
10. `closeModal()` - 25 edges

## Surprising Connections (you probably didn't know these)
- `handleRegister()` --calls--> `toast()`  [INFERRED]
  src/components/shared/MyDevicesCard.tsx → references/office-quest-app/assets/js/office-quest.js
- `handleCheckIn()` --calls--> `toast()`  [INFERRED]
  src/components/shared/AttendanceCheckInCard.tsx → references/office-quest-app/assets/js/office-quest.js
- `handleRegister()` --calls--> `toast()`  [INFERRED]
  src/components/shared/AttendanceCheckInCard.tsx → references/office-quest-app/assets/js/office-quest.js
- `handleUnlink()` --calls--> `toast()`  [INFERRED]
  src/components/shared/BiometricTerminalsTab.tsx → references/office-quest-app/assets/js/office-quest.js
- `handleChangePassword()` --calls--> `toast()`  [INFERRED]
  src/pages/ProfilePage.tsx → references/office-quest-app/assets/js/office-quest.js

## Communities

### Community 0 - "Community 0"
Cohesion: 0.01
Nodes (203): fetchApprovals(), requestApproval(), reviewApproval(), inferContentType(), addAttachmentLink(), fetchAttachmentById(), fetchAttachments(), fetchProjectFiles() (+195 more)

### Community 1 - "Community 1"
Cohesion: 0.02
Nodes (235): submit(), approve(), confirmDelete(), confirmDeleteDevice(), confirmReject(), deleteType(), exportCsv(), handleAdd() (+227 more)

### Community 2 - "Community 2"
Cohesion: 0.02
Nodes (52): AddProjectMemberModal(), useBd(), remove(), ClientFormModal(), CreateChannelModal(), HandoffModal(), ImpersonationBanner(), LeadDrawer() (+44 more)

### Community 3 - "Community 3"
Cohesion: 0.02
Nodes (104): Always-active conventions (every phase), code:block1 (Phase 0: Project Setup), code:block10 (src/api/gamification.ts     — fetchXpTransactions(), fetchRe), code:block11 (src/hooks/useGamification.ts    — useXpTransactions(), useRe), code:block12 (src/lib/deviceUtils.ts), code:bash (supabase migration new create_teams_table), code:block14 (src/api/attendance.ts   — checkIn(), checkOut(), fetchMyAtte), code:block15 (src/hooks/useAttendance.ts   — useMyAttendance(), useAllAtte) (+96 more)

### Community 4 - "Community 4"
Cohesion: 0.02
Nodes (20): filterNavItems(), groupNavItems(), useMoreNavGroups(), useMoreNavItems(), useNavGroups(), useNavItems(), useAllAttendanceExceptions(), useAllLeaveRequests() (+12 more)

### Community 5 - "Community 5"
Cohesion: 0.03
Nodes (57): AppShell(), AttendancePage(), AuthProvider(), useAuthContext(), useMeMode(), PermissionDetailModal(), HomeRedirect(), PrivateRoute() (+49 more)

### Community 6 - "Community 6"
Cohesion: 0.03
Nodes (53): fileKind(), parseCsv(), previewMode(), validateAttachmentFile(), deleteAttachment(), getAttachmentUrl(), handleDownload(), handleFiles() (+45 more)

### Community 7 - "Community 7"
Cohesion: 0.05
Nodes (48): str(), Config, _int_env(), load(), _load_env_file(), Configuration for the ZKTeco bridge.  Everything is environment-driven so the te, Minimal .env reader — avoids a python-dotenv dependency on the Pi.      Existing, commit() (+40 more)

### Community 8 - "Community 8"
Cohesion: 0.02
Nodes (83): **10\. Final Notes**, **1\. Overview**, **2\. Core Objectives**, **3\. Core Architecture Philosophy**, **4\. Service-Based System (Core Backbone)**, **5.1 Super Admin**, **5.2 Admin / Operations Manager**, **5.3 Project Manager** (+75 more)

### Community 9 - "Community 9"
Cohesion: 0.04
Nodes (40): checkIn(), registerDevice(), checkDayGates(), computeStatus(), localParts(), minutesOf(), resolveCutoffs(), bffFetch() (+32 more)

### Community 10 - "Community 10"
Cohesion: 0.03
Nodes (13): GamificationRulesPanel(), isAuthoritative(), officeTime(), MyStandup(), StandupPage(), useGamificationParticipants(), useSetRestriction(), useSetStandupParticipation() (+5 more)

### Community 11 - "Community 11"
Cohesion: 0.03
Nodes (68): 11. SaaS Scalability, 1. Architecture Overview, 2. Role-Based Access Control, 3. Database Schema, 4. ClickUp Integration, 5. Discord Integration, 6. Real-time Strategy, 7. Audit Logging (+60 more)

### Community 12 - "Community 12"
Cohesion: 0.04
Nodes (43): createBdTask(), createLead(), fetchActivities(), fetchBdComments(), fetchBdProjects(), fetchBdTasks(), fetchDailyUpdates(), fetchHandoffs() (+35 more)

### Community 13 - "Community 13"
Cohesion: 0.05
Nodes (45): fetchTargetTotals(), datesInRange(), formatDayHeading(), groupByDate(), isoDayKey(), TODAY_KEY(), toDayKey(), formatClock() (+37 more)

### Community 14 - "Community 14"
Cohesion: 0.04
Nodes (28): patch(), showNewEntries(), saveEdit(), send(), BdDocEditor(), DocEditor(), addFiles(), onDrop() (+20 more)

### Community 15 - "Community 15"
Cohesion: 0.05
Nodes (58): AI Collaboration Rules, API keys, Applying migrations, Approval Flow States, Architecture Discipline, Border Radius, ClickUp Integration UI, Client Portal (light mode — completely separate theme) (+50 more)

### Community 16 - "Community 16"
Cohesion: 0.05
Nodes (25): dayStr(), isDisabled(), isSelected(), isToday(), select(), toggleOpen(), toStr(), clickDay() (+17 more)

### Community 17 - "Community 17"
Cohesion: 0.09
Nodes (41): BdProvider(), headOfLane(), leadPositionFor(), nextLeadPosition(), positionFor(), positionInLane(), useActorId(), useBdActivities() (+33 more)

### Community 18 - "Community 18"
Cohesion: 0.06
Nodes (31): saveMeeting(), addTask(), patch(), toggleChannel(), toggleMember(), submit(), createTask(), submit() (+23 more)

### Community 19 - "Community 19"
Cohesion: 0.05
Nodes (20): validateAvatarFile(), run(), dcExport(), dcFlatten(), DCSection(), DesignCanvas(), validateImageFile(), insertEmoji() (+12 more)

### Community 20 - "Community 20"
Cohesion: 0.05
Nodes (42): 10. Row Level Security Policies, Attachments, Attendance, Audit Logs, Checklists & Checklist Items, ClickUp Status Mappings, Clients, code:sql (CREATE OR REPLACE FUNCTION current_user_role() RETURNS text ) (+34 more)

### Community 21 - "Community 21"
Cohesion: 0.06
Nodes (24): daysSince(), end(), endDrag(), followUpTone(), handleDrop(), ScheduleLine(), TaskCardProgress(), taskProgress() (+16 more)

### Community 22 - "Community 22"
Cohesion: 0.06
Nodes (11): formatRelativeTime(), grantLp(), asDifficulty(), difficultyMeta(), handleGrant(), handleRedeem(), nameOf(), onSubmit() (+3 more)

### Community 23 - "Community 23"
Cohesion: 0.07
Nodes (27): Claude Design Prompt, code:md (Design a comprehensive UI design system for a product called), code:md (Using the Linknbit Unified Operations Portal design system, ), code:md (Using the Linknbit Unified Operations Portal design system, ), code:md (Using the Linknbit Unified Operations Portal design system, ), code:md (Using the Linknbit Unified Operations Portal design system, ), code:md (Design a comprehensive UI design system for a product called), code:md (Using the Linknbit Unified Operations Portal design system e) (+19 more)

### Community 25 - "Community 25"
Cohesion: 0.11
Nodes (14): ProjectBacklogDetailPage(), useUrlRange(), iso(), resolvePreset(), at(), iso(), shiftDay(), TimesheetPage() (+6 more)

### Community 26 - "Community 26"
Cohesion: 0.13
Nodes (22): **1.10 Special Shoutouts (Examples)**, **1.11 System Discipline & Participation Restrictions**, **1.12 System Rules Summary**, **1.13 Simple Understanding of System**, **1.14 Final Note**, **1.1 Purpose of the System**, **1.2 System Overview**, **1.3 Currency System (Link Points \- LP)** (+14 more)

### Community 27 - "Community 27"
Cohesion: 0.1
Nodes (9): handleCreate(), handleUnlink(), mintSecret(), SecretReveal(), TerminalCard(), clockSkewLabel(), terminalHealth(), useRotateTerminalSecret() (+1 more)

### Community 28 - "Community 28"
Cohesion: 0.13
Nodes (14): closeModal(), cn(), fmtDate(), fmtRange(), fmtTimeStr(), handleDeparture(), handleReturn(), handleSubmit() (+6 more)

### Community 29 - "Community 29"
Cohesion: 0.14
Nodes (10): assignRole(), createRole(), fetchPermissionCatalog(), fetchProfileRoles(), fetchRolePermissions(), fetchRoles(), revokeRole(), handleCreate() (+2 more)

### Community 30 - "Community 30"
Cohesion: 0.12
Nodes (13): Attendance, code:php (wp_insert_user([), code:php ([), code:php (current_user_can('manage_options')), code:php (current_user_can('linknbit_war_room_manage')), code:js (const apiRoot = window.linknbitWarRoomSettings.restUrl;), code:php (wp_localize_script('linknbit-war-room', 'linknbitWarRoomSett), Database (+5 more)

### Community 31 - "Community 31"
Cohesion: 0.13
Nodes (5): itemCls(), cn(), formatDate(), fmtDay(), fmtRange()

### Community 32 - "Community 32"
Cohesion: 0.24
Nodes (10): useCreateTemplate(), useCreateTemplateStage(), useCreateTemplateTask(), useDeleteTemplate(), useDeleteTemplateStage(), useDeleteTemplateTask(), useTemplateInvalidation(), useUpdateTemplate() (+2 more)

### Community 33 - "Community 33"
Cohesion: 0.15
Nodes (3): fmtClock(), fmtDay(), handleImpersonate()

### Community 34 - "Community 34"
Cohesion: 0.17
Nodes (2): TaskDetailPage(), useTask()

### Community 35 - "Community 35"
Cohesion: 0.22
Nodes (3): asString(), isExceptionType(), parseExceptions()

### Community 37 - "Community 37"
Cohesion: 0.4
Nodes (9): glyph(), main(), maskableIconSvg(), out(), png(), render(), splashSvg(), squareIcon() (+1 more)

### Community 38 - "Community 38"
Cohesion: 0.4
Nodes (8): b64urlToUint8(), bufToB64url(), getCurrentSubscription(), permissionState(), pushSupported(), subscribeThisDevice(), toBrowserSubscription(), unsubscribeThisDevice()

### Community 39 - "Community 39"
Cohesion: 0.22
Nodes (2): exceptionSpan(), parseClock()

### Community 40 - "Community 40"
Cohesion: 0.22
Nodes (2): handleCheckIn(), handleRegister()

### Community 42 - "Community 42"
Cohesion: 0.29
Nodes (2): useFlatMessages(), useMessages()

### Community 43 - "Community 43"
Cohesion: 0.43
Nodes (7): deleteProjectCascade(), deleteStorageObjects(), deleteTaskCascade(), fetchProjectDeleteImpact(), fetchTaskDeleteImpact(), readCount(), taskIdsForProject()

### Community 44 - "Community 44"
Cohesion: 0.25
Nodes (6): code:bash (node preview-server.js), Files, Fixes Applied, Preview Login, Viewing It, WordPress Integration Direction

### Community 45 - "Community 45"
Cohesion: 0.33
Nodes (3): StatusChip(), useStatusLabels(), useStatusOverrides()

### Community 48 - "Community 48"
Cohesion: 0.47
Nodes (4): AttendanceChips(), Dash(), dayPartSuffix(), isFullDayOff()

### Community 49 - "Community 49"
Cohesion: 0.33
Nodes (3): useFileViewer(), RichRenderer(), useFileRefClick()

### Community 53 - "Community 53"
Cohesion: 0.4
Nodes (3): fetchChannelMembers(), leaveChannel(), removeChannelMember()

### Community 54 - "Community 54"
Cohesion: 0.47
Nodes (5): cn(), CollapsedLane(), endDrag(), handleDrop(), moveTask()

### Community 55 - "Community 55"
Cohesion: 0.33
Nodes (1): handleDrop()

### Community 57 - "Community 57"
Cohesion: 0.33
Nodes (5): code:js (export default defineConfig([), code:js (// eslint.config.js), Expanding the ESLint configuration, React Compiler, React + TypeScript + Vite

### Community 59 - "Community 59"
Cohesion: 0.5
Nodes (2): addMinutes(), minusMinutes()

### Community 63 - "Community 63"
Cohesion: 0.4
Nodes (2): fileRefExtension(), renderSuggestion()

### Community 65 - "Community 65"
Cohesion: 0.5
Nodes (2): isIos(), usePwaInstall()

### Community 66 - "Community 66"
Cohesion: 0.6
Nodes (3): useAddChannelRole(), useRemoveChannelRole(), useRoleMutation()

### Community 67 - "Community 67"
Cohesion: 0.7
Nodes (4): isoToZonedMinutes(), tzOffsetMinutes(), zonedParts(), zonedWallTimeToIso()

### Community 72 - "Community 72"
Cohesion: 0.5
Nodes (1): handleRegister()

### Community 73 - "Community 73"
Cohesion: 0.83
Nodes (3): CustomRoleBadge(), RoleBadge(), sizeClass()

### Community 75 - "Community 75"
Cohesion: 0.83
Nodes (3): useCurrencyRates(), useCurrencyRateSnapshot(), useRatesFreshness()

### Community 76 - "Community 76"
Cohesion: 0.83
Nodes (3): ipInCidr(), parseIpv4(), toInt()

### Community 77 - "Community 77"
Cohesion: 0.67
Nodes (2): afterCreate(), openChannel()

### Community 79 - "Community 79"
Cohesion: 0.5
Nodes (3): Answer, Q: Why does cn() connect Community 0 to Community 1, Community 10, Community 3, and Community 5?, Source Nodes

### Community 167 - "Community 167"
Cohesion: 1.0
Nodes (1): graphify

### Community 212 - "Community 212"
Cohesion: 1.0
Nodes (1): Configuration for the ZKTeco bridge.  Everything is environment-driven so the te

### Community 213 - "Community 213"
Cohesion: 1.0
Nodes (1): Minimal .env reader — avoids a python-dotenv dependency on the Pi.      Existing

### Community 214 - "Community 214"
Cohesion: 1.0
Nodes (1): One device read: sync clock, pull the log into the spool, report health.

### Community 215 - "Community 215"
Cohesion: 1.0
Nodes (1): Send unacked punches in batches. Returns how many were acked.

### Community 216 - "Community 216"
Cohesion: 1.0
Nodes (1): Resolve the office's public IPv4 address from the Pi.  This is deliberately NOT

### Community 217 - "Community 217"
Cohesion: 1.0
Nodes (1): Pin name resolution to A records for the duration of the block.      Belt and br

### Community 218 - "Community 218"
Cohesion: 1.0
Nodes (1): Accept only a bare, globally routable IPv4 address.      A captive portal or a p

### Community 219 - "Community 219"
Cohesion: 1.0
Nodes (1): Return the public IPv4 two providers agree on, or None.      Providers are tried

### Community 220 - "Community 220"
Cohesion: 1.0
Nodes (1): HTTP client for the attendance-biometric-punch edge function.  All three Pi→serv

### Community 221 - "Community 221"
Cohesion: 1.0
Nodes (1): Raised when a message could not be delivered after all retries.

### Community 222 - "Community 222"
Cohesion: 1.0
Nodes (1): Deliver a batch. A 200 means every punch in it is durably stored.

### Community 223 - "Community 223"
Cohesion: 1.0
Nodes (1): Report terminal health, and let the server refresh the office IP.          `info

### Community 224 - "Community 224"
Cohesion: 1.0
Nodes (1): Push enrolled users so admins can link enroll numbers by name.          Names tr

### Community 225 - "Community 225"
Cohesion: 1.0
Nodes (1): One device read: sync clock, pull the log into the spool, report health.

### Community 226 - "Community 226"
Cohesion: 1.0
Nodes (1): Send unacked punches in batches. Returns how many were acked.

### Community 227 - "Community 227"
Cohesion: 1.0
Nodes (1): Push enrolled users so admins can link enroll numbers by name.          Names tr

## Knowledge Gaps
- **269 isolated node(s):** `Configuration for the ZKTeco bridge.  Everything is environment-driven so the te`, `Minimal .env reader — avoids a python-dotenv dependency on the Pi.      Existing`, `Durable local punch spool.  The Pi must never lose a punch to a WAN outage, so e`, `Stable idempotency key. Must be computed identically on every retry.`, `Record a punch. Returns True if it was new to the spool.` (+264 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 34`** (12 nodes): `useTasks.ts`, `TaskDetailPage.tsx`, `TaskDetailPage()`, `invalidateTasks()`, `useCreateTask()`, `useDeleteTask()`, `useMoveTask()`, `useTask()`, `useTaskDeleteImpact()`, `useTasks()`, `useUpdateTask()`, `useUpdateTaskStatus()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (10 nodes): `timesheet.ts`, `clockAt()`, `dayState()`, `exceptionSpan()`, `formatClock12()`, `hourTick()`, `isDayOff()`, `minutesInto()`, `parseClock()`, `spanOn()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (9 nodes): `CheckInCardSkeleton()`, `DeviceNotice()`, `ErrorBanner()`, `fmtHHMM()`, `fmtIso()`, `handleCheckIn()`, `handleRegister()`, `tick()`, `AttendanceCheckInCard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (8 nodes): `useMessages.ts`, `useDeleteMessage()`, `useEditMessage()`, `useFlatMessages()`, `useMarkChannelRead()`, `useMessages()`, `useMessageSearch()`, `useSendMessage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (6 nodes): `handleDrop()`, `openNew()`, `openProject()`, `sortProjects()`, `taskCountOf()`, `BdProjectsPage.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 59`** (5 nodes): `StandupRulesPanel.tsx`, `addMinutes()`, `formatMinutes()`, `handleSave()`, `minusMinutes()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 63`** (5 nodes): `fileRefExtension()`, `iconFor()`, `fileMention.tsx`, `suggestionUtils.tsx`, `renderSuggestion()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 65`** (5 nodes): `usePwaInstall.ts`, `emit()`, `isIos()`, `isStandalone()`, `usePwaInstall()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 72`** (4 nodes): `fmtDate()`, `handleRegister()`, `statusMeta()`, `MyDevicesCard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 77`** (4 nodes): `afterCreate()`, `afterRemoved()`, `openChannel()`, `ChatPage.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 167`** (2 nodes): `AGENTS.md`, `graphify`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 212`** (1 nodes): `Configuration for the ZKTeco bridge.  Everything is environment-driven so the te`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 213`** (1 nodes): `Minimal .env reader — avoids a python-dotenv dependency on the Pi.      Existing`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 214`** (1 nodes): `One device read: sync clock, pull the log into the spool, report health.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 215`** (1 nodes): `Send unacked punches in batches. Returns how many were acked.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 216`** (1 nodes): `Resolve the office's public IPv4 address from the Pi.  This is deliberately NOT`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 217`** (1 nodes): `Pin name resolution to A records for the duration of the block.      Belt and br`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 218`** (1 nodes): `Accept only a bare, globally routable IPv4 address.      A captive portal or a p`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 219`** (1 nodes): `Return the public IPv4 two providers agree on, or None.      Providers are tried`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 220`** (1 nodes): `HTTP client for the attendance-biometric-punch edge function.  All three Pi→serv`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 221`** (1 nodes): `Raised when a message could not be delivered after all retries.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 222`** (1 nodes): `Deliver a batch. A 200 means every punch in it is durably stored.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 223`** (1 nodes): `Report terminal health, and let the server refresh the office IP.          `info`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 224`** (1 nodes): `Push enrolled users so admins can link enroll numbers by name.          Names tr`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 225`** (1 nodes): `One device read: sync clock, pull the log into the spool, report health.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 226`** (1 nodes): `Send unacked punches in batches. Returns how many were acked.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 227`** (1 nodes): `Push enrolled users so admins can link enroll numbers by name.          Names tr`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `toast()` connect `Community 1` to `Community 33`, `Community 6`, `Community 72`, `Community 40`, `Community 12`, `Community 13`, `Community 14`, `Community 18`, `Community 19`, `Community 21`, `Community 54`, `Community 55`, `Community 22`, `Community 27`, `Community 28`, `Community 29`?**
  _High betweenness centrality (0.167) - this node is a cross-community bridge._
- **Why does `select()` connect `Community 0` to `Community 6`, `Community 9`, `Community 43`, `Community 12`, `Community 13`, `Community 16`, `Community 18`, `Community 53`, `Community 29`?**
  _High betweenness centrality (0.149) - this node is a cross-community bridge._
- **Why does `useToast()` connect `Community 2` to `Community 5`, `Community 6`, `Community 10`, `Community 17`, `Community 25`, `Community 27`?**
  _High betweenness centrality (0.105) - this node is a cross-community bridge._
- **Are the 215 inferred relationships involving `select()` (e.g. with `isDeactivated()` and `auditOnce()`) actually correct?**
  _`select()` has 215 INFERRED edges - model-reasoned connections that need verification._
- **Are the 63 inferred relationships involving `toast()` (e.g. with `add()` and `openFile()`) actually correct?**
  _`toast()` has 63 INFERRED edges - model-reasoned connections that need verification._
- **Are the 35 inferred relationships involving `useAuthContext()` (e.g. with `BdProvider()` and `GamificationRulesPanel()`) actually correct?**
  _`useAuthContext()` has 35 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Configuration for the ZKTeco bridge.  Everything is environment-driven so the te`, `Minimal .env reader — avoids a python-dotenv dependency on the Pi.      Existing`, `Durable local punch spool.  The Pi must never lose a punch to a WAN outage, so e` to the rest of the system?**
  _269 weakly-connected nodes found - possible documentation gaps or missing edges._