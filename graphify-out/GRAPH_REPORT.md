# Graph Report - linknbit-portal  (2026-07-22)

## Corpus Check
- 220 files · ~333,289 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1825 nodes · 2513 edges · 39 communities detected
- Extraction: 88% EXTRACTED · 12% INFERRED · 0% AMBIGUOUS · INFERRED: 289 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
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
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 115|Community 115]]

## God Nodes (most connected - your core abstractions)
1. `select()` - 147 edges
2. `toast()` - 87 edges
3. `$()` - 85 edges
4. `switchPanel()` - 42 edges
5. `openModal()` - 29 edges
6. `Linknbit Operations Portal — Development Rules` - 28 edges
7. `Linknbit Unified Operations Portal — Development Rules` - 28 edges
8. `closeModal()` - 25 edges
9. `**C. MARKETING SERVICE**` - 25 edges
10. `updateTopbar()` - 23 edges

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
Cohesion: 0.02
Nodes (211): deleteAttachment(), handleCheckIn(), handleCheckOut(), $(), addColumn(), addCommentLink(), addImage(), addLink() (+203 more)

### Community 1 - "Community 1"
Cohesion: 0.01
Nodes (144): fetchApprovals(), requestApproval(), reviewApproval(), addAttachmentLink(), fetchAttachmentById(), fetchAttachments(), fetchProjectFiles(), setAttachmentConfidential() (+136 more)

### Community 2 - "Community 2"
Cohesion: 0.02
Nodes (104): Always-active conventions (every phase), code:block1 (Phase 0: Project Setup), code:block10 (src/api/gamification.ts     — fetchXpTransactions(), fetchRe), code:block11 (src/hooks/useGamification.ts    — useXpTransactions(), useRe), code:block12 (src/lib/deviceUtils.ts), code:bash (supabase migration new create_teams_table), code:block14 (src/api/attendance.ts   — checkIn(), checkOut(), fetchMyAtte), code:block15 (src/hooks/useAttendance.ts   — useMyAttendance(), useAllAtte) (+96 more)

### Community 3 - "Community 3"
Cohesion: 0.02
Nodes (83): **10\. Final Notes**, **1\. Overview**, **2\. Core Objectives**, **3\. Core Architecture Philosophy**, **4\. Service-Based System (Core Backbone)**, **5.1 Super Admin**, **5.2 Admin / Operations Manager**, **5.3 Project Manager** (+75 more)

### Community 4 - "Community 4"
Cohesion: 0.04
Nodes (48): approve(), closeModal(), cn(), confirmDelete(), confirmReject(), deleteType(), exportCsv(), fmtDate() (+40 more)

### Community 5 - "Community 5"
Cohesion: 0.03
Nodes (68): 11. SaaS Scalability, 1. Architecture Overview, 2. Role-Based Access Control, 3. Database Schema, 4. ClickUp Integration, 5. Discord Integration, 6. Real-time Strategy, 7. Audit Logging (+60 more)

### Community 7 - "Community 7"
Cohesion: 0.05
Nodes (58): AI Collaboration Rules, API keys, Applying migrations, Approval Flow States, Architecture Discipline, Border Radius, ClickUp Integration UI, Client Portal (light mode — completely separate theme) (+50 more)

### Community 8 - "Community 8"
Cohesion: 0.05
Nodes (28): checkIn(), registerDevice(), bffFetch(), bffRefreshSession(), bffSignIn(), bffSignOut(), fetchActiveProfiles(), fetchProfile() (+20 more)

### Community 9 - "Community 9"
Cohesion: 0.05
Nodes (30): AttendancePage(), if(), useAuthContext(), filterNavItems(), useMoreNavItems(), useNavItems(), HomeRedirect(), PrivateRoute() (+22 more)

### Community 10 - "Community 10"
Cohesion: 0.04
Nodes (19): AppShell(), ClientFormModal(), SalaryCard(), SalaryForm(), StageFormModal(), AddMemberModal(), TeamModal(), useToast() (+11 more)

### Community 12 - "Community 12"
Cohesion: 0.05
Nodes (42): 10. Row Level Security Policies, Attachments, Attendance, Audit Logs, Checklists & Checklist Items, ClickUp Status Mappings, Clients, code:sql (CREATE OR REPLACE FUNCTION current_user_role() RETURNS text ) (+34 more)

### Community 13 - "Community 13"
Cohesion: 0.06
Nodes (18): fileKind(), previewMode(), validateAttachmentFile(), getAttachmentUrl(), handleDownload(), handleFiles(), download(), open() (+10 more)

### Community 14 - "Community 14"
Cohesion: 0.07
Nodes (24): uploadAttachment(), detectBrowser(), detectOs(), fallbackHash(), getDeviceFingerprint(), getDeviceName(), getDeviceToken(), randomCookieName() (+16 more)

### Community 15 - "Community 15"
Cohesion: 0.07
Nodes (10): formatRelativeTime(), grantLp(), asDifficulty(), difficultyMeta(), handleClaim(), handleGrant(), handleRedeem(), nameOf() (+2 more)

### Community 16 - "Community 16"
Cohesion: 0.08
Nodes (12): validateAvatarFile(), dcExport(), dcFlatten(), DCSection(), DesignCanvas(), onPickAvatar(), save(), add() (+4 more)

### Community 17 - "Community 17"
Cohesion: 0.07
Nodes (27): Claude Design Prompt, code:md (Design a comprehensive UI design system for a product called), code:md (Using the Linknbit Unified Operations Portal design system, ), code:md (Using the Linknbit Unified Operations Portal design system, ), code:md (Using the Linknbit Unified Operations Portal design system, ), code:md (Using the Linknbit Unified Operations Portal design system, ), code:md (Design a comprehensive UI design system for a product called), code:md (Using the Linknbit Unified Operations Portal design system e) (+19 more)

### Community 18 - "Community 18"
Cohesion: 0.13
Nodes (22): **1.10 Special Shoutouts (Examples)**, **1.11 System Discipline & Participation Restrictions**, **1.12 System Rules Summary**, **1.13 Simple Understanding of System**, **1.14 Final Note**, **1.1 Purpose of the System**, **1.2 System Overview**, **1.3 Currency System (Link Points \- LP)** (+14 more)

### Community 19 - "Community 19"
Cohesion: 0.12
Nodes (13): Attendance, code:php (wp_insert_user([), code:php ([), code:php (current_user_can('manage_options')), code:php (current_user_can('linknbit_war_room_manage')), code:js (const apiRoot = window.linknbitWarRoomSettings.restUrl;), code:php (wp_localize_script('linknbit-war-room', 'linknbitWarRoomSett), Database (+5 more)

### Community 20 - "Community 20"
Cohesion: 0.13
Nodes (4): handleCheckIn(), handleCheckOut(), handleRegister(), handleSync()

### Community 21 - "Community 21"
Cohesion: 0.19
Nodes (8): centerActiveTab(), confirm(), fmt2(), isHourDisabled(), scrollTo(), selectHour(), snapMin(), toAmPm()

### Community 22 - "Community 22"
Cohesion: 0.27
Nodes (12): androidSplashIconSvg(), glyph(), main(), out(), png(), render(), splashSvg(), squareIcon() (+4 more)

### Community 23 - "Community 23"
Cohesion: 0.17
Nodes (2): fmtClock(), fmtDay()

### Community 24 - "Community 24"
Cohesion: 0.24
Nodes (6): dayStr(), isDisabled(), isSelected(), isToday(), select(), toStr()

### Community 28 - "Community 28"
Cohesion: 0.4
Nodes (8): b64urlToUint8(), bufToB64url(), getCurrentSubscription(), permissionState(), pushSupported(), subscribeThisDevice(), toBrowserSubscription(), unsubscribeThisDevice()

### Community 30 - "Community 30"
Cohesion: 0.25
Nodes (2): ServiceChip(), useServices()

### Community 32 - "Community 32"
Cohesion: 0.32
Nodes (4): formatDate(), formatRelativeTime(), getDaysUntil(), isOverdue()

### Community 33 - "Community 33"
Cohesion: 0.43
Nodes (7): deleteProjectCascade(), deleteStorageObjects(), deleteTaskCascade(), fetchProjectDeleteImpact(), fetchTaskDeleteImpact(), readCount(), taskIdsForProject()

### Community 34 - "Community 34"
Cohesion: 0.25
Nodes (6): code:bash (node preview-server.js), Files, Fixes Applied, Preview Login, Viewing It, WordPress Integration Direction

### Community 37 - "Community 37"
Cohesion: 0.38
Nodes (5): handleSubmit(), isPriority(), isStatus(), toPriority(), toStatus()

### Community 39 - "Community 39"
Cohesion: 0.33
Nodes (3): useFileViewer(), RichRenderer(), useFileRefClick()

### Community 42 - "Community 42"
Cohesion: 0.33
Nodes (2): itemCls(), cn()

### Community 44 - "Community 44"
Cohesion: 0.33
Nodes (5): code:js (export default defineConfig([), code:js (// eslint.config.js), Expanding the ESLint configuration, React Compiler, React + TypeScript + Vite

### Community 46 - "Community 46"
Cohesion: 0.4
Nodes (2): fileRefExtension(), renderSuggestion()

### Community 48 - "Community 48"
Cohesion: 0.5
Nodes (2): isIos(), usePwaInstall()

### Community 49 - "Community 49"
Cohesion: 0.4
Nodes (1): fetchTeamMembers()

### Community 53 - "Community 53"
Cohesion: 0.5
Nodes (1): handleRegister()

### Community 58 - "Community 58"
Cohesion: 0.5
Nodes (3): Answer, Q: Why does cn() connect Community 0 to Community 1, Community 10, Community 3, and Community 5?, Source Nodes

### Community 64 - "Community 64"
Cohesion: 1.0
Nodes (2): handleDrop(), statusOf()

### Community 115 - "Community 115"
Cohesion: 1.0
Nodes (1): graphify

## Knowledge Gaps
- **237 isolated node(s):** `graphify`, `Color Naming Convention`, `Typography`, `Border Radius`, `Internal Portal (dark mode — default)` (+232 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 23`** (13 nodes): `ChipRow()`, `count()`, `Empty()`, `fmtClock()`, `fmtDay()`, `fmtShort()`, `fmtTime()`, `leaveColor()`, `nameOf()`, `periodLabel()`, `SectionCard()`, `StatTile()`, `MemberProfilePage.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (8 nodes): `ServiceChip()`, `ServiceChip.tsx`, `useServices.ts`, `useCreateService()`, `useDeleteService()`, `useServices()`, `useServiceUsage()`, `useUpdateService()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (6 nodes): `itemCls()`, `cn()`, `FileTypeIcon()`, `formatDate()`, `BottomTabBar.tsx`, `FilesPage.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (5 nodes): `fileRefExtension()`, `iconFor()`, `fileMention.tsx`, `suggestionUtils.tsx`, `renderSuggestion()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (5 nodes): `usePwaInstall.ts`, `emit()`, `isIos()`, `isStandalone()`, `usePwaInstall()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (5 nodes): `teamMembers.ts`, `addTeamMember()`, `fetchTeamMembers()`, `removeTeamMember()`, `setProfileTeams()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (4 nodes): `fmtDate()`, `handleRegister()`, `statusMeta()`, `MyDevicesCard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 64`** (3 nodes): `TaskBoard.tsx`, `handleDrop()`, `statusOf()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 115`** (2 nodes): `AGENTS.md`, `graphify`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `toast()` connect `Community 0` to `Community 4`, `Community 37`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 20`, `Community 53`?**
  _High betweenness centrality (0.130) - this node is a cross-community bridge._
- **Why does `select()` connect `Community 1` to `Community 8`, `Community 49`, `Community 14`, `Community 33`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **Why does `uploadAttachment()` connect `Community 14` to `Community 0`, `Community 1`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Are the 145 inferred relationships involving `select()` (e.g. with `fetchComments()` and `createComment()`) actually correct?**
  _`select()` has 145 INFERRED edges - model-reasoned connections that need verification._
- **Are the 44 inferred relationships involving `toast()` (e.g. with `add()` and `handleRegister()`) actually correct?**
  _`toast()` has 44 INFERRED edges - model-reasoned connections that need verification._
- **What connects `graphify`, `Color Naming Convention`, `Typography` to the rest of the system?**
  _237 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.02 - nodes in this community are weakly interconnected._