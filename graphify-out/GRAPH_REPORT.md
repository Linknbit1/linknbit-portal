# Graph Report - linknbit-portal  (2026-05-13)

## Corpus Check
- 45 files · ~92,315 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 372 nodes · 632 edges · 27 communities (25 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c34113a4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

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
- [[_COMMUNITY_Community 24|Community 24]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 48 edges
2. `**C. MARKETING SERVICE**` - 24 edges
3. `Linknbit Unified Operations Portal — Development Rules` - 21 edges
4. `Claude Design Prompt` - 14 edges
5. `Avatar()` - 12 edges
6. `**Linknbit Unified Operations Portal**` - 11 edges
7. `formatDate()` - 9 edges
8. `Topbar()` - 8 edges
9. `Button()` - 8 edges
10. `formatRelativeTime()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `AvatarGroup()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/Avatar.tsx → src/lib/cn.ts
- `Topbar()` --calls--> `cn()`  [EXTRACTED]
  src/components/layout/Topbar.tsx → src/lib/cn.ts
- `RoleBadge()` --calls--> `cn()`  [EXTRACTED]
  src/components/shared/RoleBadge.tsx → src/lib/cn.ts
- `ServiceChip()` --calls--> `cn()`  [EXTRACTED]
  src/components/shared/ServiceChip.tsx → src/lib/cn.ts
- `StatusChip()` --calls--> `cn()`  [EXTRACTED]
  src/components/shared/StatusChip.tsx → src/lib/cn.ts

## Communities (27 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (36): FILE_ICONS, ProjectDetailPage(), TaskDetailDrawer(), TaskDetailDrawerProps, TASKS, cn(), formatCurrency(), formatDate() (+28 more)

### Community 1 - "Community 1"
Cohesion: 0.09
Nodes (29): KPI_CARDS, WORKLOAD_STYLE, KANBAN_COLUMNS, ViewMode, ACTIVITY_FEED, BADGES, LEADERBOARD, QUESTS (+21 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (31): Approval Flow States, Border Radius, ClickUp Integration UI, Client Portal (light mode — completely separate theme), Client Visibility, Code Style, code:block1 (src/), code:block2 (AppShell) (+23 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (19): PlaceholderPageProps, NOTIFICATIONS, USERS, AppShell(), CLIENT_NAV, ClientShell(), NAV_ITEMS, Sidebar() (+11 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (29): **1\. Overview**, **2\. Core Objectives**, **3\. Core Architecture Philosophy**, **4\. Service-Based System (Core Backbone)**, **5.1 Super Admin**, **5.2 Admin / Operations Manager**, **5.3 Project Manager**, **5.4 Team Lead** (+21 more)

### Community 5 - "Community 5"
Cohesion: 0.1
Nodes (25): CLIENT_PROJECTS, DELIVERED_FILES, RECENT_UPDATES, SERVICE_LABEL, STAGE_DESCRIPTIONS, APPROVALS, DESIGN_STAGES, DEV_STAGES (+17 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (27): Claude Design Prompt, code:md (Design a comprehensive UI design system for a product called), code:md (Using the Linknbit Unified Operations Portal design system, ), code:md (Using the Linknbit Unified Operations Portal design system, ), code:md (Using the Linknbit Unified Operations Portal design system, ), code:md (Using the Linknbit Unified Operations Portal design system, ), code:md (Design a comprehensive UI design system for a product called), code:md (Using the Linknbit Unified Operations Portal design system e) (+19 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (22): **1.10 Special Shoutouts (Examples)**, **1.11 System Discipline & Participation Restrictions**, **1.12 System Rules Summary**, **1.13 Simple Understanding of System**, **1.14 Final Note**, **1.1 Purpose of the System**, **1.2 System Overview**, **1.3 Currency System (Link Points \- LP)** (+14 more)

### Community 8 - "Community 8"
Cohesion: 0.14
Nodes (6): AuthView, BootStep, DEMO_ACCOUNTS, ForgotSent(), maskEmail(), SplashUser

### Community 9 - "Community 9"
Cohesion: 0.16
Nodes (6): DC, DCCtx, dcFlatten(), DCSection(), DesignCanvas(), s

### Community 10 - "Community 10"
Cohesion: 0.18
Nodes (11): getDaysUntil(), isOverdue(), PRIORITY_LABELS, PROJECT_STATUS_LABELS, ROLE_LABELS, SERVICE_LABELS, STATUS_LABELS, ROLE_CONFIG (+3 more)

### Community 11 - "Community 11"
Cohesion: 0.14
Nodes (14): **10\. Final Notes**, **6.12 Team Management**, **6.15 Files & Deliverables**, **6.17 Reports**, **6.18 Permissions System**, **6.19 Settings**, **6.20 Audit Logs**, **6.5 Stage Template System** (+6 more)

### Community 12 - "Community 12"
Cohesion: 0.33
Nodes (5): code:js (export default defineConfig([), code:js (// eslint.config.js), Expanding the ESLint configuration, React Compiler, React + TypeScript + Vite

### Community 13 - "Community 13"
Cohesion: 0.33
Nodes (6): **6.11 Gamification System**, **Design:**, **Development:**, **Features:**, **Marketing:**, **XP Logic:**

### Community 14 - "Community 14"
Cohesion: 0.4
Nodes (5): **6.7 Task Templates (Service-Based)**, **Design:**, **Development:**, **Example:**, **Marketing:**

### Community 15 - "Community 15"
Cohesion: 0.4
Nodes (5): **8\. Tech Stack**, **Auth:**, **Backend:**, **Frontend:**, **Integrations:**

### Community 16 - "Community 16"
Cohesion: 0.5
Nodes (4): **6.13 Dashboards**, **Admin Dashboard**, **Client Dashboard**, **Employee Dashboard**

### Community 17 - "Community 17"
Cohesion: 0.67
Nodes (3): **6.16 Notifications**, **Channels:**, **Types:**

### Community 18 - "Community 18"
Cohesion: 0.67
Nodes (3): **9\. MVP Scope**, **Exclude:**, **Include:**

### Community 19 - "Community 19"
Cohesion: 0.67
Nodes (3): **6.10 ClickUp Integration**, **Mapping:**, **Sync:**

### Community 20 - "Community 20"
Cohesion: 0.67
Nodes (3): **6.14 Communication System**, **Features:**, **Rules:**

### Community 21 - "Community 21"
Cohesion: 0.67
Nodes (3): **6.9 Approval System**, **Status:**, **Types:**

### Community 22 - "Community 22"
Cohesion: 0.67
Nodes (3): **6.6 Task Management**, **Fields:**, **Statuses:**

## Knowledge Gaps
- **185 isolated node(s):** `DC`, `s`, `DCCtx`, `CLIENT_NAV`, `NAV_ITEMS` (+180 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Community 0` to `Community 1`, `Community 10`, `Community 3`, `Community 5`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `**C. MARKETING SERVICE**` connect `Community 11` to `Community 4`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 24`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **What connects `DC`, `s`, `DCCtx` to the rest of the system?**
  _185 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._