# Claude Design Prompt

Here is the prompt — start with Phase 1 (design system) and use subsequent prompts for each screen.

## Design System Prompt

```md
Design a comprehensive UI design system for a product called the Linknbit Unified Operations Portal — an internal SaaS portal for a Pakistan-based software agency called Linknbit.

What the product is:
A multi-role operations portal combining a client-facing project tracking dashboard, an internal employee task and performance management system, a gamified reward system with XP, coins, badges, leaderboards, and quests, service-based project workflows for Design, Development, and Marketing services, and ClickUp integration for task execution.

User roles: Super Admin, Admin/Ops Manager, Project Manager, Team Lead, Employee, Client Owner, Client Member.

Design direction:
Desktop-first, professional SaaS aesthetic. Dark-mode primary using deep navy and slate backgrounds, not pure black. The feel should be sophisticated but energetic — premium enough to impress clients, engaging enough that employees want to use the gamification layer daily. The three service types must each carry a distinct accent color used consistently as a visual tag throughout the entire UI. Use violet/purple for Design, cyan/teal for Development, and orange/amber for Marketing. Typography should pair a strong geometric display font for headings with a clean, highly legible UI font for data, labels, and body text. Avoid Inter paired with purple gradients, avoid Notion-clone layouts, avoid anything that looks like a generic AI-generated dashboard.

Deliverables:

1. Color system
Define: primary brand color, surface levels (background, card, elevated card, overlay), border colors (default and subtle), text hierarchy (4 levels: primary, secondary, muted, disabled), semantic colors (success, warning, error, info), and the three service-type accent colors for Design, Development, and Marketing. Show each color as a swatch with its hex value and token name.

2. Typography scale
Define tokens for: display (hero text), H1, H2, H3, H4, body large, body default, body small, caption, label (uppercase tracking), and monospace/code. For each, show font family, weight, size, and line height. Use real example text relevant to the product — project names, task titles, status labels — not lorem ipsum.

3. Spacing and layout grid
Define a base spacing scale (4px base unit), standard component padding values, section gaps, and the main layout grid: sidebar width (collapsed and expanded), top bar height, content max-width, and column grid for dashboard layouts.

4. Core component library
Produce a visual reference sheet showing every component below in all relevant states. Use real placeholder data throughout — names like Ahmad Karimi, Zain Malik, Sara Qureshi, project names like Cricket Sansar Website Redesign, Linknbit Brand Identity, VPNGuider SEO Campaign.

Buttons: primary, secondary, ghost, danger — each in default, hover, and disabled states.

Input fields: default, focused, error, disabled — with label, placeholder, and helper text.

Badges and chips: role badges for each of the 7 roles (Super Admin, Admin, Project Manager, Team Lead, Employee, Client Owner, Client Member), service-type chips for Design/Development/Marketing using their accent colors, task status chips (Backlog, To Do, In Progress, Review, Approved, Completed, Blocked), priority chips (Critical, High, Medium, Low), and approval status chips (Pending, Approved, Rejected, Revision Requested).

Cards: a project card showing project name, client name, service-type chip, current stage, progress bar, deadline, assigned PM avatar, and ClickUp sync status. A task card showing task title, assignee avatar, priority chip, status chip, due date, and XP reward value. An employee card showing avatar, name, role badge, level, XP bar, and current task count.

Sidebar navigation: collapsed state showing only icons with tooltips, and expanded state showing icons plus labels. Nav items are Dashboard, Projects, Clients, Teams, Tasks, Reports, Gamification, ClickUp, Settings. Show active state, hover state, and a notification count badge on relevant items.

Data table row: showing a project row with columns for project name, client, service type chip, stage, status, deadline, PM, and ClickUp sync icon.

Avatar component: small, medium, and large sizes. With online/offline indicator. Stacked avatar group (show 3 avatars overlapping with a +N overflow indicator).

XP progress bar: showing current level label, XP count, a styled progress bar with fill, and next level label. Make it feel like a game stat, not a boring progress indicator.

Notification pill: unread count badge on a bell icon. A single notification item in a dropdown showing avatar, action text, project name, and timestamp. Mark as read state.

ClickUp sync status indicator: three states — Synced (green check), Pending sync (amber spinner or clock), Sync error (red warning). Small enough to sit inline on a table row or card.

Client visibility toggle: a toggle switch used on tasks and files to control whether a client can see the item. Show on and off states with a clear label. When off, the row or card should have a subtle visual treatment (slightly dimmed or with a lock icon) to make the hidden state immediately obvious at a glance.

Empty states: a generic empty state illustration or icon treatment with heading and subtext, for use when a list or table has no data yet.

Loading skeleton: show a card and a table row in skeleton/shimmer loading state.

The entire output should be presented as a single cohesive design system reference page. Everything must be dark-mode, production-ready, and visually consistent. No lorem ipsum anywhere. Every component should look like it belongs to the same product.
```

___

## Phase 1 — Design System & Visual Language

```md
Design a comprehensive UI design system for a product called the **Linknbit Unified Operations Portal** — an internal SaaS portal for a Pakistan-based software agency called Linknbit.

**What the product is:**
A multi-role operations portal combining:
- A client-facing project tracking dashboard
- An internal employee task & performance management system
- A gamified reward system (XP, coins, badges, leaderboards, quests)
- Service-based project workflows for Design, Development, and Marketing services
- ClickUp integration for task execution

**User roles (7):** Super Admin, Admin/Ops Manager, Project Manager, Team Lead, Employee, Client Owner, Client Member

**Design direction:**
- Desktop-first, professional SaaS aesthetic
- Dark-mode primary (deep navy/slate background, not pure black)
- Sophisticated but energetic — this needs to feel premium to clients AND engaging to employees (gamification layer must feel rewarding, not corporate)
- The three service types (Design, Development, Marketing) should each have a distinct accent color used as a visual tag/chip throughout the UI
- Suggest: Design = violet/purple, Development = cyan/teal, Marketing = orange/amber — but feel free to refine
- Typography: pair a strong geometric display font for headings with a clean, highly legible UI font for body/labels
- Avoid generic aesthetics: no Inter + purple gradient combos, no Notion-clone layouts

**Deliverables for this phase:**
1. Color system — primary, surface, border, text hierarchy (4 levels), success, warning, error, and the 3 service-type accent colors
2. Typography scale — display, heading (H1–H4), body, caption, label, code
3. Spacing & layout grid
4. Core component library preview:
   - Buttons (primary, secondary, ghost, danger)
   - Input fields
   - Badges/chips (role badges, service-type chips, status chips, priority chips)
   - Cards (project card, task card, employee card)
   - Sidebar navigation (collapsed + expanded states)
   - Data table row
   - Avatar + name combo
   - XP progress bar
   - Notification pill
   - ClickUp sync status indicator (synced, pending, error)

Produce this as a visual design system reference page. Use real placeholder names (e.g. "Ahmad Karimi", "Cricket Sansar Website", "UI Design stage") — not lorem ipsum. Everything should feel production-ready.
```

___

## Phase 2 — Admin Dashboard (use after Phase 1 is locked)

```md
Using the Linknbit Unified Operations Portal design system established in Phase 1, design the **Admin / Operations Manager Dashboard**.

**Context:**
This is the command center for the operations manager. They oversee all active projects, team performance, delays, and XP leaderboard. They do not do tasks themselves — they monitor and intervene.

**Layout:**
- Fixed left sidebar (collapsed icon-only by default, expands on hover)
- Top bar with: page title, global search, notification bell (with count), user avatar + role badge
- Main content area

**Sidebar nav items:**
Dashboard, Projects, Clients, Teams, Tasks, Reports, Gamification, ClickUp, Settings

**Dashboard content sections:**

1. **Stats row (top):** 4 KPI cards
   - Active Projects (with count + change vs last month)
   - Overdue Tasks (count + warning state if >0)
   - Team Utilization % (gauge or bar)
   - XP Awarded This Month

2. **Project Status Overview** — horizontal bar or progress rings showing projects by status (In Progress, Blocked, Awaiting Client, Completed). Filterable by service type (Design / Dev / Marketing chips).

3. **At-Risk Projects** — a table or card list of projects with deadline < 7 days or status = Blocked. Columns: Project Name, Client, Service Type (chip), Stage, Deadline, Assigned PM, Action button.

4. **Team Performance** — leaderboard-style table of team leads + their team metrics: tasks completed, avg completion time, XP earned, current workload (light/medium/heavy badge).

5. **Recent Activity Feed** — right panel. Real-time-style feed of actions: task completed, client approved, file uploaded, XP earned, stage moved. Each item has avatar, action text, timestamp, and project link.

6. **XP Leaderboard Preview** — top 5 employees this week with rank, avatar, name, role, XP bar, and total XP. "View Full Leaderboard" link.

**Design notes:**
- Service type chips must be visually prominent throughout
- ClickUp sync status should be visible on project rows (small icon: synced ✓, pending ⟳, error ✗)
- Blocked/overdue items must use warning/error colors — make them feel urgent without being alarming
- Dark mode, production-grade, real placeholder data
```

## Phase 3 — Admin Dashboard

```md
Using the Linknbit Unified Operations Portal design system, design the Admin / Operations Manager Dashboard.

Layout:
Fixed left sidebar (use the expanded state from the design system). Top bar with: page title "Dashboard", global search bar, notification bell with unread count, and user avatar with name and role badge (Admin). Main content area to the right.

Dashboard sections:

1. Stats row — 4 KPI cards in a row across the top:
Active Projects: 18, up 3 from last month (show positive trend indicator).
Overdue Tasks: 7, up 2 from last month (show warning/error state — this card should feel urgent).
Team Utilization: 84%, show as a small arc gauge or inline bar.
XP Awarded This Month: 12,400 XP, show a coin or star icon with it.

2. Project Status Overview — a horizontal grouped bar or segmented ring chart showing all projects broken down by status: In Progress (9), Awaiting Client (4), Blocked (2), Completed (3). Above the chart, show three filter chips for Design, Development, Marketing — default state shows all selected. Use service-type accent colors where appropriate.

3. At-Risk Projects — a table or dense card list. Show 4 projects:
- Cricket Sansar App, Client: Cricket Sansar, Service: Development chip, Stage: Internal QA, Deadline: 3 days, PM: Ahmad Karimi, Status: Blocked chip.
- Rahim Gul Transport Website, Client: Rahim Gul GLT, Service: Design chip, Stage: Client Review, Deadline: 5 days, PM: Sara Qureshi, Status: Awaiting Client chip.
- VPNGuider SEO Campaign, Client: VPNGuider, Service: Marketing chip, Stage: Optimization, Deadline: 2 days, PM: Zain Malik, Status: Blocked chip.
- Linknbit Brand Identity, Client: Internal, Service: Design chip, Stage: UI Design, Deadline: 6 days, PM: Ahmad Karimi, Status: In Progress chip.
Each row has a ClickUp sync status icon and a quick action button (View Project).

4. Team Performance — a table showing 4 team leads:
- Ahmad Karimi, Development Lead, 23 tasks completed, avg 1.8 days, 3,200 XP, Workload: Heavy badge.
- Sara Qureshi, Design Lead, 18 tasks completed, avg 2.1 days, 2,800 XP, Workload: Medium badge.
- Zain Malik, Marketing Lead, 31 tasks completed, avg 1.2 days, 4,100 XP, Workload: Heavy badge.
- Bilal Ahmed, Design Lead, 11 tasks completed, avg 3.0 days, 1,600 XP, Workload: Light badge.

5. Recent Activity Feed — right-side panel (narrower column). Show 8 activity items in reverse chronological order:
- Ahmad Karimi completed task "API endpoint for match scores" in Cricket Sansar App — 2 min ago
- Sara Qureshi uploaded file "Homepage_v3.fig" in Linknbit Brand Identity — 14 min ago
- Client (Cricket Sansar) approved Stage: Wireframing — 1 hr ago
- Zain Malik moved VPNGuider SEO Campaign to Optimization stage — 2 hrs ago
- Bilal Ahmed earned badge "First Approval" — 3 hrs ago
- Sara Qureshi requested revision on task "Mobile Navigation Design" — 4 hrs ago
- ClickUp sync error on Cricket Sansar App — 5 hrs ago (show this item with error styling)
- Ahmad Karimi earned 450 XP for completing sprint — 6 hrs ago

6. XP Leaderboard Preview — show top 5 employees this week:
1. Zain Malik — Level 8 — 4,100 XP
2. Ahmad Karimi — Level 7 — 3,200 XP
3. Sara Qureshi — Level 6 — 2,800 XP
4. Usman Tariq — Level 5 — 2,100 XP
5. Bilal Ahmed — Level 4 — 1,600 XP
Each entry has rank number, avatar, name, role, XP bar, and total XP. Show a "View Full Leaderboard" link at the bottom.

Design notes:
This is the most information-dense screen in the product. Prioritize scanability — use clear visual hierarchy to separate sections. Blocked and overdue states must feel urgent. ClickUp sync error in the activity feed should be visually distinct. Dark mode, production-ready, all real placeholder data.
```

___

## Phase 4 — Project Management (List + Kanban Views)

```md
Using the Linknbit Unified Operations Portal design system, design the Projects section with two views: List View and Kanban View.

Layout:
Same sidebar and top bar as the Admin Dashboard. Page title: "Projects". 

Top controls row:
Left side — search input ("Search projects..."), filter dropdowns for Service Type (All / Design / Development / Marketing), Status (All / In Progress / Blocked / Awaiting Client / Completed), and Assigned PM. Right side — a view toggle (List icon | Kanban icon | Timeline icon — Timeline is inactive/coming soon), and a "New Project" primary button.

Screen 1: List View
A full-width data table. Columns: Project Name, Client, Service Type, Current Stage, Status, Progress, Deadline, PM, ClickUp, Actions.

Show 8 rows:
1. Cricket Sansar App | Cricket Sansar | Development chip | Internal QA | Blocked chip | 68% progress bar | May 15 2026 | Ahmad Karimi avatar | ClickUp synced icon | View button
2. Linknbit Brand Identity | Internal | Design chip | UI Design | In Progress chip | 45% | May 18 2026 | Sara Qureshi | ClickUp synced | View
3. VPNGuider SEO Campaign | VPNGuider | Marketing chip | Optimization | Blocked chip | 72% | May 14 2026 | Zain Malik | ClickUp error icon | View
4. Rahim Gul Transport Website | Rahim Gul GLT | Design chip | Client Review | Awaiting Client chip | 80% | May 17 2026 | Sara Qureshi | ClickUp synced | View
5. Starr Luxury Cars Portal | Starr Luxury Cars | Development chip | Development | In Progress chip | 35% | Jun 2 2026 | Ahmad Karimi | ClickUp pending icon | View
6. Irene Teo Coaching Website | Irene Teo | Design chip | Wireframing | In Progress chip | 25% | May 28 2026 | Bilal Ahmed | ClickUp synced | View
7. Offsite Pro Directory | Offsite Pro | Development chip | Setup & Architecture | In Progress chip | 15% | Jun 10 2026 | Usman Tariq | ClickUp synced | View
8. MediGrow App | MediGrow | Development chip | Requirement Finalization | In Progress chip | 8% | Jun 20 2026 | Ahmad Karimi | ClickUp pending | View

Show one row in a selected/highlighted state (Cricket Sansar App — since it is blocked).
Show a pagination control at the bottom: "Showing 8 of 14 projects", with page controls.

Screen 2: Kanban View
Group projects into columns by status: In Progress, Awaiting Client, Blocked, Completed. Each column has a header with column name, a count badge, and a subtle colored left border or top strip.

Distribute the same 8 projects across the columns. Each project card shows: project name, client name, service-type chip, current stage, deadline, PM avatar, progress bar, and ClickUp sync icon.

The Blocked column cards should have a visually distinct treatment — a warning border or tinted background — to make them feel urgent.

Show a collapsed empty state for a "Completed" column with an empty state treatment.

Design notes:
The toggle between List and Kanban should feel smooth and obvious. Service-type chips must be consistently styled. Progress bars should use a subtle color relative to completion percentage (low = muted, high = accent). All real placeholder data, dark mode, production-ready.
```

___

## Phase 5 — Project Detail Page

```md
Using the Linknbit Unified Operations Portal design system, design the Project Detail page.

Context:
This page is reached by clicking any project. It shows everything about a single project — its stage pipeline, task list, team, files, and approvals. It is used by Admins, PMs, Team Leads, and Employees. Clients see a stripped-down version of this same page (handle that with a visible toggle or note — do not design the client version here).

Use this project as the example: Cricket Sansar App | Client: Cricket Sansar | Service: Development | PM: Ahmad Karimi | Status: Blocked | Deadline: May 15 2026.

Layout:
Same sidebar. Top bar shows breadcrumb: Projects > Cricket Sansar App. Right side of top bar has: Edit Project button (ghost), Archive button (ghost/danger), and a ClickUp sync status indicator with last synced time ("Synced 3 hrs ago" with error state since this project has a sync error).

Page structure — two columns: main content (wider left) and right panel (narrower).

Main content:

1. Project header
Project name as large heading. Below it: client name, service-type chip (Development), status chip (Blocked), deadline, budget (PKR 850,000), assigned PM avatar + name. A one-line internal note field (editable inline): "Client delayed UAT sign-off. Following up Friday."

2. Stage pipeline
A horizontal stage stepper showing all 9 Development stages:
Requirement Finalization (completed), Technical Planning (completed), Setup & Architecture (completed), Development (completed), Internal QA (current — blocked), Client Testing/UAT (upcoming), Bug Fixing (upcoming), Deployment (upcoming), Support (upcoming).

Completed stages have a check mark. Current stage is highlighted with the Development accent color. Blocked stages have a warning indicator. Each stage is clickable to expand its task list below.

3. Task list (for current stage: Internal QA)
A table or dense list of tasks within this stage. Show 5 tasks:
- "Write test cases for match scores API" | Ahmad Karimi | In Progress | High priority | Due May 13 | 120 XP | Client hidden (lock icon) | ClickUp synced
- "QA: Player statistics endpoint" | Usman Tariq | Review | High priority | Due May 13 | 100 XP | Client hidden | ClickUp synced
- "Fix pagination bug on fixtures list" | Ahmad Karimi | Blocked | Critical priority | Due May 12 | 150 XP | Client hidden | ClickUp error
- "Performance test: live score updates" | Usman Tariq | To Do | Medium priority | Due May 14 | 80 XP | Client hidden | ClickUp synced
- "Document API response schemas" | Bilal Ahmed | To Do | Low priority | Due May 15 | 60 XP | Client visible (eye icon) | ClickUp pending

Each row has: task title, assignee avatar, status chip, priority chip, due date, XP badge, client visibility icon (lock = hidden, eye = visible), ClickUp sync icon, and a quick open button.

Show an "Add Task" button at the bottom of the list.

4. Stage approval bar
Below the task list, a full-width approval action bar: "Internal QA stage is ready for review." with an "Approve Stage" primary button and a "Request Revision" ghost button. Show this in pending approval state.

Right panel:

1. Project team
List of assigned team members: Ahmad Karimi (PM), Usman Tariq (Developer), Bilal Ahmed (Developer). Each with avatar, name, role badge, and current workload indicator.

2. Upcoming deadlines
A short list of the next 3 task deadlines across the project with task name, assignee, and date.

3. Files & deliverables
Show 3 uploaded files: "API_Schema_v2.pdf" (uploaded by Ahmad, 2 days ago, client hidden), "DB_Structure.png" (uploaded by Usman, 4 days ago, client hidden), "Project_Brief.pdf" (uploaded by client, 1 week ago, client visible). Each file has a visibility toggle.

4. ClickUp sync panel
Shows ClickUp folder name "Cricket Sansar App", last sync time, sync status (error), and a "Retry Sync" button.

Design notes:
The stage pipeline is the most important visual element on this page — it must communicate progress and blockage at a glance. Client visibility icons must be immediately readable. Blocked tasks need visual urgency without making the entire page feel alarming. Dark mode, all real data, production-ready.
```

___

## Phase 6 — Task Detail (Drawer / Modal)

```md
Using the Linknbit Unified Operations Portal design system, design the Task Detail view as a right-side drawer that slides in over the Project Detail page (the background page is dimmed but visible).

Use this task as the example: "Fix pagination bug on fixtures list" | Project: Cricket Sansar App | Stage: Internal QA | Service: Development | Assignee: Ahmad Karimi | Status: Blocked | Priority: Critical | Due: May 12 2026 | XP Reward: 150 XP | ClickUp: Sync error | Client visibility: Hidden.

Drawer layout (right-side panel, roughly 520px wide):

Header:
Task title as large text. Below it: project name link (Cricket Sansar App), stage label (Internal QA), and service-type chip (Development). Top-right corner: close button (X), and a "Open in ClickUp" icon button.

Section 1: Task metadata (two-column grid of fields)
Status: Blocked chip (editable — clicking opens a dropdown of all statuses)
Priority: Critical chip (editable)
Assignee: Ahmad Karimi avatar + name (editable — clicking opens team member picker)
Due Date: May 12 2026 (editable — date picker)
Stage: Internal QA
XP Reward: 150 XP (with coin/star icon)
Client Visible: Toggle switch — Off (locked state with a lock icon and label "Hidden from client")
ClickUp ID: CS-247 (with sync error indicator and "Retry Sync" link)
Created by: Usman Tariq | Created: May 8 2026
Last updated: 2 hours ago

Section 2: Description
A rich text area showing: "The pagination on the fixtures list endpoint is returning incorrect page counts when filters are applied. This is blocking UAT sign-off. Root cause suspected in the query builder logic. Needs investigation and fix before client testing."
Show this in read mode with an "Edit" icon on hover.

Section 3: Subtasks
Show 3 subtasks as a checklist:
- [x] Reproduce the bug with test data (Ahmad Karimi — completed)
- [ ] Identify root cause in query builder (Ahmad Karimi — in progress)
- [ ] Write regression test after fix (Bilal Ahmed — to do)
Show an "Add subtask" input at the bottom.

Section 4: Files
Show 2 attached files: "bug_screenshot.png" (thumbnail preview, uploaded by Ahmad, 1 day ago) and "fixtures_api_log.txt" (file icon, uploaded by Ahmad, 1 day ago). Both marked client hidden. Show an upload dropzone below.

Section 5: Comments
Tab bar: "All Comments" | "Internal Only" | "Client Visible" — default on Internal Only since this task is client hidden.

Show 3 comments:
- Ahmad Karimi | 2 hours ago | "Traced it to the filter_by_date logic in the query builder. Working on a fix now." | Internal tag
- Usman Tariq | 5 hours ago | "This is the blocker for UAT. Priority fix." | Internal tag
- Ahmad Karimi | 1 day ago | "Reproduced consistently with date range filter + competition filter combined." | Internal tag

Comment input at bottom: textarea with placeholder "Write an internal comment...", a toggle to switch to client-visible comment (changes placeholder and adds a warning label "This will be visible to the client"), and a Send button.

Section 6: XP & Activity log (collapsed by default, expandable)
Shows XP history for this task and a timeline of all actions (status changes, assignments, file uploads, comments).

Footer (sticky at bottom of drawer):
Left: "Mark as Completed" primary button | Right: "Block Task" danger ghost button and "Delete Task" ghost button.

Design notes:
The drawer should feel like a focused workspace, not a form. The internal-only comment state is default and important — the visual separation between internal and client-visible comments must be obvious. Blocked status and Critical priority should create a clear sense of urgency without being distracting. The ClickUp sync error should be visible but not the most prominent element. Dark mode, real data, production-ready.
```

___

## Phase 7 — Client Dashboard

```md
Using the Linknbit Unified Operations Portal design system, design the Client Dashboard — the view seen by a Client Owner after login.

Context:
The client sees a completely different experience from internal users. No task management, no XP, no team data. Their world is: what are my projects, where are they, what do I need to approve, and what has been delivered. The design should feel polished and professional — this is what Linknbit clients see, so it needs to feel premium.

Use this client as the example: Cricket Sansar — Client Owner: Imran Shah.

Layout:
Simplified top navigation bar (no sidebar). Nav items: My Projects, Approvals, Files & Deliverables, Reports, and a right-side section with notification bell and avatar + name (Imran Shah | Client Owner badge). Linknbit logo top-left with a subtle "Powered by Linknbit" label.

Dashboard sections:

1. Welcome header
"Good morning, Imran." Large, warm heading. Below it: "You have 2 items waiting for your approval." with a link "Review now" that scrolls to the approvals section.

2. Active Projects — card grid (2 columns)
Show 2 active projects for this client:

Card 1: Cricket Sansar App
Service: Development chip. Current stage: Internal QA. Status: In Progress. Progress bar: 68%. Deadline: May 15 2026. A brief stage description visible to client: "Our team is running quality checks before handing the app over to you for testing." Next step label: "Client Testing starts after QA approval." PM: Ahmad Karimi avatar + name. "View Project" button.

Card 2: Cricket Sansar Brand Identity
Service: Design chip. Current stage: Client Review. Status: Awaiting Your Review. Progress bar: 80%. Deadline: May 18 2026. Stage description: "We've completed the UI designs and need your feedback before finalizing." Next step label: "Approve designs to proceed to handover." PM: Sara Qureshi. "Review Now" button (primary — more prominent since action is needed).

3. Pending Approvals section
Heading: "Waiting for You (2)". Show 2 approval cards:

Approval 1: Stage Approval
Project: Cricket Sansar Brand Identity | Stage: Client Review | Submitted by: Sara Qureshi | Submitted: 2 days ago
Message: "Hi Imran, the UI designs for all 12 screens are ready. Please review the Figma file and approve or request revisions."
Attached file: "CS_UI_Designs_v3.fig" (Figma icon, view button)
Action buttons: "Approve Stage" (primary green) | "Request Revision" (ghost)

Approval 2: File Approval
Project: Cricket Sansar App | File: "API_Documentation_v2.pdf" | Submitted by: Ahmad Karimi | Submitted: 1 day ago
Message: "Please review and approve the API documentation before we proceed to client testing."
Action buttons: "Approve" (primary) | "Request Revision" (ghost)

4. Recent Updates feed
A clean activity timeline showing project updates that are client-visible:
- Sara Qureshi uploaded "CS_UI_Designs_v3.fig" to Cricket Sansar Brand Identity — 2 days ago
- Ahmad Karimi moved Cricket Sansar App to Internal QA stage — 4 days ago
- You approved Wireframing stage in Cricket Sansar Brand Identity — 6 days ago
- Project Cricket Sansar App moved to Development stage — 1 week ago

5. Delivered Files
A simple file gallery or list showing all files that have been shared with the client across both projects. Show 4 files with project label, file name, uploaded by, date, and a download button.

Design notes:
No internal data leaks into this view — no XP, no employee performance, no ClickUp references, no internal task names. The language throughout should be friendly and non-technical. Stage descriptions visible to clients must be written in plain language. The "Awaiting Your Review" state on the brand identity card should be visually distinct and feel like a gentle call to action. This dashboard must feel like a premium client portal, not an internal tool. Light mode is acceptable here as an alternative to dark mode if it better serves the premium client-facing feel — use your judgment.
```

___

## Phase 8 — Employee Dashboard

```md
Using the Linknbit Unified Operations Portal design system, design the Employee Dashboard — the view seen by a standard Employee after login.

Context:
Employees care about three things: their tasks, their XP progress, and how they rank against teammates. This dashboard needs to feel motivating and clear. The gamification layer is prominent here in a way it is not on the admin or client dashboards.

Use this employee as the example: Usman Tariq | Role: Developer | Level 5 | Current XP: 2,100 | XP to next level: 400 | This week: 320 XP earned | Rank: 4th on team leaderboard.

Layout:
Same sidebar as admin (but with fewer nav items: Dashboard, My Tasks, My Projects, Leaderboard, Rewards). Top bar with notification bell and avatar + name + role badge.

Dashboard sections:

1. Personal hero section (top of main content)
A wide card or banner personalized to Usman. Left side: avatar (large), name, role badge, "Level 5 Developer" label. Center: XP progress bar showing 2,100 / 2,500 XP to Level 6 with a styled progress bar and "400 XP to Level 6" label. Right side: this week's stats — XP Earned This Week: 320 XP, Tasks Completed: 4, Current Streak: 3 days (with a flame icon or similar). Make this section feel like a game profile card, not a boring stat box.

2. My Tasks — today and upcoming
Tab bar: "Today" | "This Week" | "All Tasks"

Default on Today. Show 4 tasks:
- "QA: Player statistics endpoint" | Cricket Sansar App | Internal QA stage | Development chip | Review status | High priority | Due today | 100 XP | "Open Task" button
- "Performance test: live score updates" | Cricket Sansar App | Internal QA stage | Development chip | To Do | Medium priority | Due today | 80 XP | "Open Task"
- "Fix pagination bug on fixtures list" | Cricket Sansar App | Internal QA stage | Development chip | Blocked status | Critical priority | Overdue (May 12) | 150 XP | "Open Task" — this row should have a visible overdue/blocked treatment
- "Review DB schema for match events" | Starr Luxury Cars Portal | Setup & Architecture stage | Development chip | To Do | Medium priority | Due tomorrow | 90 XP | "Open Task"

Show a task completion input at the top of the list: a subtle progress indicator "3 of 7 tasks completed today" with a mini bar.

3. Active Quests
A horizontal scroll row or card grid showing current quests. Show 3 quest cards:

Quest 1: "Bug Slayer" — Complete 5 bug fix tasks this week. Progress: 2/5. XP Reward: 500 XP. Deadline: Sunday. Status: In Progress.
Quest 2: "First Blood" — Get your first task approved by a client. Progress: 0/1. XP Reward: 300 XP. Status: Not started.
Quest 3: "Speed Demon" — Complete 3 tasks before their due date in a row. Progress: 2/3. XP Reward: 400 XP. Status: Almost done — show this one with a highlighted/urgent treatment.

Each quest card has a progress bar, XP reward badge, and deadline.

4. Team Leaderboard (this week)
Show the top 5 for Usman's team. Highlight Usman's row:
1. Ahmad Karimi — 680 XP this week
2. Zain Malik — 540 XP
3. Sara Qureshi — 410 XP
4. Usman Tariq — 320 XP (highlighted — this is the logged in user)
5. Bilal Ahmed — 210 XP

Show rank change indicators (up/down arrows) next to each name. "View Full Leaderboard" link.

5. Recent Rewards & Badges
Show 3 recently earned items:
- Badge: "Team Player" earned 3 days ago (icon + label)
- 200 XP bonus for completing Cricket Sansar sprint — 5 days ago
- Badge: "First Approval" earned 1 week ago

A "View All Rewards" link at the bottom.

Design notes:
The gamification elements must feel genuinely exciting, not like a corporate HR metric system. The XP bar, quest cards, and leaderboard should borrow visual energy from games — without being childish. The overdue/blocked task in the task list needs to stand out urgently. The personal hero section at the top should make Usman feel like the main character. Dark mode, real data, production-ready.
```

___

## Phase 9 — Approval Flow

```md
Using the Linknbit Unified Operations Portal design system, design the Approval Flow screens — used by Project Managers to submit approvals and by clients (or admins) to review and act on them.

Design four screens:

Screen 1: Submit for Approval (PM view)
A modal or full drawer that a PM opens when a stage is ready for client review. Use this context: Sara Qureshi (PM) is submitting the Client Review stage of Cricket Sansar Brand Identity for client approval.

Modal contains:
Header: "Submit for Client Approval" | Stage: Client Review | Project: Cricket Sansar Brand Identity
A summary field (pre-filled editable): "Hi Imran, all 12 UI screens are complete and ready for your review. Please check the attached Figma file and let us know if you'd like any changes."
File attachments section: shows "CS_UI_Designs_v3.fig" already attached (pulled from stage files). Option to attach additional files.
Checklist before submission (internal only, not visible to client): 3 checkboxes:
- [x] Internal review completed
- [x] All stage tasks marked complete
- [ ] PM sign-off given (required — show this as blocking submission until checked)
Client recipient: Imran Shah (Client Owner) — auto-populated, not editable.
Notify via: In-app (checked, locked), Email (checked, toggleable).
Footer: "Cancel" ghost button | "Submit for Approval" primary button (disabled until checklist complete, then enabled).

Screen 2: Approval Pending state (PM view, after submission)
The stage row on the project detail page should now show a "Pending Client Approval" status badge, a timestamp "Submitted 2 days ago", and a "Send Reminder" ghost button. Show this inline within the stage pipeline from Phase 5 — just update the Internal QA stage to show this pending state as a reference.

Screen 3: Client Approval Review (Client view)
Full-page or large modal that the client sees when they click "Review Now" on their dashboard. Use same context: Imran Shah reviewing Cricket Sansar Brand Identity — Client Review stage.

Layout: Two-column. Left: file preview panel (show a mockup of a Figma embed or large file preview placeholder with the filename "CS_UI_Designs_v3.fig" and an "Open in Figma" button). Right: approval panel.

Right panel contains:
Project name and stage label at top.
Message from PM: Sara Qureshi avatar + "Hi Imran, all 12 UI screens are complete..." message with timestamp.
Attached files: the Figma file with open button. Any additional files.
A comment/feedback textarea: "Add your feedback or revision notes (optional)"
Three action buttons stacked:
- "Approve Stage" — primary green, full width, large
- "Request Revision" — secondary/outline, full width
- "Reject" — ghost danger, smaller, below the others with a warning note "This will stop the project at this stage."

Screen 4: Post-decision states
Show two end states:

Approved state: A success banner or card shown to the PM and team after client approval. "Imran Shah approved Client Review stage." Timestamp. Confetti or a subtle celebration animation suggestion. "Next Stage: Final Approval" button to advance the pipeline.

Revision Requested state: A card shown to the PM with the client's feedback message (if any), the stage moved back to revision state, and a task automatically created: "Address client revisions — Client Review" assigned to Sara Qureshi with a due date. Show this task being created inline with a "View Task" link.

Design notes:
The approval flow is a high-stakes moment for both Linknbit and the client. The client-facing review screen (Screen 3) must feel premium and trustworthy — this is the moment clients decide to approve or push back. The revision requested state should feel constructive, not alarming. All actions must be clearly labeled with consequences. Dark mode for internal screens, use your judgment on the client review screen (light or dark depending on what feels more premium). Real data throughout.
```

___

## Phase 10 — Gamification Center

```md
Using the Linknbit Unified Operations Portal design system, design the Gamification Center — a dedicated section accessible to all internal users (Employees, Team Leads, PMs, Admins).

This section has four sub-pages. Design all four.

Sub-page 1: Leaderboard
Top of page: a period selector — "This Week" (selected), "This Month", "All Time". Below it, a service-type filter: All | Design | Development | Marketing.

Full leaderboard table for "This Week — All Services":
Rank | Avatar | Name | Role | Department | XP This Period | Level | Badges (count) | Change vs last week

Show 10 rows:
1. Zain Malik | Marketing Lead | Marketing | 680 XP | Level 8 | 12 badges | +2 (moved up)
2. Ahmad Karimi | Developer | Development | 640 XP | Level 7 | 9 badges | 0 (no change)
3. Sara Qureshi | Designer | Design | 410 XP | Level 6 | 11 badges | +1
4. Usman Tariq | Developer | Development | 320 XP | Level 5 | 6 badges | -1 (moved down)
5. Bilal Ahmed | Designer | Design | 210 XP | Level 4 | 4 badges | 0
6. Hina Rizvi | Marketing | Marketing | 190 XP | Level 3 | 3 badges | +2
7. Kamran Ali | Developer | Development | 175 XP | Level 3 | 2 badges | -1
8. Ayesha Noor | Designer | Design | 150 XP | Level 2 | 1 badge | 0
9. Omar Siddiqui | Marketing | Marketing | 120 XP | Level 2 | 1 badge | +1
10. Raza Khan | Developer | Development | 90 XP | Level 1 | 0 badges | -2

Top 3 ranks should have a special visual treatment: gold/silver/bronze styling, not just numbers. Highlight the current user's row (assume Usman Tariq is logged in — row 4).

Sub-page 2: Badges
A grid of all available badges in the system, organized by category. Show earned (full color) and locked (greyed out, blurred or dimmed) states.

Categories and badges:

Milestone badges (earned by hitting targets):
- First Task (earned by Usman) — Complete your first task
- First Approval (earned) — Get your first client approval
- Speed Demon (locked) — Complete 10 tasks before deadline
- Century (locked) — Complete 100 tasks total
- Bug Slayer (locked) — Fix 50 bugs

Consistency badges:
- 3-Day Streak (earned) — Complete tasks 3 days in a row
- 7-Day Streak (locked)
- 30-Day Streak (locked)

Team badges:
- Team Player (earned) — Collaborate on 5 team tasks
- Mentor (locked) — Help a junior complete their first task

Service badges (per service type with respective accent colors):
- Design Master (locked) — Complete 20 Design tasks
- Dev Guru (locked) — Complete 20 Development tasks
- Growth Hacker (locked) — Complete 20 Marketing tasks

Special badges:
- Client Favorite (locked) — Receive 5 client approvals
- Zero Bugs (locked) — Complete a sprint with no bugs
- Overachiever (locked) — Earn 10,000 XP in a month

Each badge has an icon, name, description, and for earned badges: the date it was earned.

Sub-page 3: Quests
Active Quests section at the top showing current in-progress quests (same 3 from the Employee Dashboard but shown in a more detailed layout with full descriptions and progress).

Available Quests section below — quests the user can work toward but hasn't started. Show 4:
- "Perfectionist" — Complete 5 tasks with no revisions needed. Reward: 600 XP + Badge.
- "Client Whisperer" — Get 3 consecutive client approvals. Reward: 800 XP.
- "Sprint Champion" — Be the top XP earner on your team for a full week. Reward: 1,000 XP + Special Badge.
- "Reliability" — Submit all tasks on or before deadline for 2 weeks. Reward: 750 XP.

Completed Quests section — collapsed by default, expandable. Shows a count "12 quests completed".

Sub-page 4: Rewards Shop
A grid of rewards that employees can purchase with coins (a secondary currency earned alongside XP).

Show current coin balance at the top: "You have 1,240 Coins" with a coin icon.

Reward cards (8 rewards in a grid):
- Half Day Off — 500 coins — Available
- Work From Home Day — 800 coins — Available
- Team Lunch Nomination — 1,200 coins — Can afford (highlight since user has enough)
- Choose Your Next Project — 2,000 coins — Locked (not enough coins)
- Mentorship Session with CTO — 1,500 coins — Locked
- Linknbit Merch Box — 3,000 coins — Locked
- Extended Deadline Pass (1 task) — 400 coins — Available
- Featured on Linknbit Showcase — 600 coins — Available

Each card shows reward name, icon or illustration, coin cost, and a "Redeem" button (enabled or disabled based on balance). Redeemable items should feel exciting. Locked items should feel aspirational, not discouraging.

Design notes:
This entire section should feel like a game hub, not a corporate HR page. Use the most visual energy here compared to any other section — richer backgrounds, more use of accent colors, more expressive typography for headings. The badges should have real iconographic character. The rewards shop should feel like something employees actually want to use. Dark mode, real data, production-ready.
```

___

## Phase 11 — Reports & Analytics

```md
Using the Linknbit Unified Operations Portal design system, design the Reports & Analytics section — used by Admins and Project Managers to monitor performance across projects, teams, and service types.

This section has three report views. Design all three as separate screens with a shared tab navigation at the top: "Project Reports" | "Team Performance" | "Marketing Performance" (Marketing Performance tab is only relevant for marketing service projects).

Screen 1: Project Reports
Filters at top: Date Range picker (default: last 30 days), Service Type (All / Design / Development / Marketing), Project dropdown (All Projects), and an Export button (CSV, PDF options).

Report sections:

1. Summary stats row — 4 metric cards:
Projects Completed (last 30 days): 3
On-Time Delivery Rate: 71%
Average Project Duration: 28 days
Client Approval Rate: 88%

2. Project Progress Overview — a horizontal bar chart showing all active projects with their completion percentage. Group by service type (use accent colors). X-axis is 0–100%, each bar is a project with its name on the Y-axis. Show 8 projects.

3. Stage Bottleneck Analysis — a table showing which stages are causing the most delays across all projects. Columns: Stage Name, Service Type, Avg Time Spent (days), Expected Time (days), Delay (days), Projects Affected. Sort by delay descending. Show 6 rows — highlight the worst offender (Client Review for Design — 4.2 days avg vs 2 days expected — 2.2 days over).

4. Deadline Adherence — a simple donut or bar chart: On Time (71%), Slightly Late 1–3 days (18%), Significantly Late 4+ days (11%). Below it, a table of the 3 most overdue projects with project name, deadline, days overdue, PM, and a "View" button.

5. Client Approval Turnaround — a bar chart showing average time (in days) for clients to respond to approval requests, grouped by client. Show 4 clients. One bar (Cricket Sansar — 3.8 days) should be noticeably higher than others.

Screen 2: Team Performance
Filters: Date Range, Department (All / Design / Development / Marketing), Team Lead.

Report sections:

1. Team summary row — 4 metric cards:
Total Tasks Completed: 87
Average Task Completion Time: 1.9 days
XP Awarded Total: 12,400
Bug Rate (Development only): 8.2%

2. Individual Performance Table — columns: Employee, Role, Department, Tasks Completed, Avg Completion Time, On-Time Rate %, XP Earned, Current Level, Workload. Show 8 employees. Allow sorting by any column.

3. Workload Distribution — a stacked bar chart per team lead showing their team's current tasks by status (To Do, In Progress, Review, Blocked). Makes it easy to see where work is piling up.

4. XP Distribution chart — a bar chart showing XP earned per employee this period. Overlay the team average as a horizontal line. Employees above average should have a slightly highlighted bar.

5. Task Completion Trend — a line chart showing tasks completed per day over the last 30 days for the whole team. Show as a smooth area chart with a subtle gradient fill.

Screen 3: Marketing Performance
Context: This view is only relevant when filtering for Marketing service projects. It shows performance metrics specific to marketing campaigns.

Filters: Date Range, Campaign/Project dropdown (all marketing projects).

Report sections:

1. Campaign summary — 4 metric cards:
Active Campaigns: 2
Total Spend This Month: PKR 180,000
Overall ROI: 2.4x
Avg CTR: 3.8%

2. Campaign Performance Table — columns: Campaign Name, Client, Stage, Spend, Impressions, Clicks, CTR, Conversions, ROI. Show 2 campaigns (VPNGuider SEO Campaign, a second fictional one). Allow row expansion to see channel breakdown.

3. Performance Trend — a dual-axis line chart. Left Y-axis: spend (bars). Right Y-axis: conversions (line). X-axis: past 4 weeks. Shows how spend and results trend together.

4. Task completion by stage — which marketing stages are taking longest vs expected. Same format as stage bottleneck analysis on Screen 1 but filtered to marketing stages.

Design notes:
Reports should feel analytical and dense but not overwhelming. Charts must be properly labeled with legends, axis titles, and value labels where space allows. Use the service-type accent colors in charts wherever service type is being distinguished. The Export button should feel prominent enough to find easily. Avoid chart types that are hard to read at small sizes — prefer horizontal bars, area charts, and clean donut charts. Dark mode, real data, production-ready.
```

___

## Phase 12 — Settings

```md
Using the Linknbit Unified Operations Portal design system, design the Settings section — accessible to Super Admins and Admins only.

Settings is a left-nav sub-section layout: a secondary sidebar within the main layout showing settings categories, and a content panel on the right showing the selected settings page.

Settings categories in secondary sidebar:
General, Branding, Service Stages, XP & Gamification, Rewards, Permissions, Integrations, Notifications, Audit Logs.

Design all nine settings pages:

Page 1: General
Company name: Linknbit. Timezone: Asia/Karachi (PKT). Date format: DD/MM/YYYY. Language: English. Working days: checkboxes for Mon–Fri checked, Sat–Sun unchecked. Default currency: PKR. A "Save Changes" button.

Page 2: Branding
Logo upload area (show current logo placeholder). Primary color picker (with hex input). Portal name: "Linknbit Unified Operations Portal". Client portal subtitle: "Your project hub." Favicon upload. Email header logo upload. Preview panel on the right showing how the branding looks in context (a miniature version of the top bar and login screen). "Save Changes" button.

Page 3: Service Stages
Three tabs: Design | Development | Marketing.

For each service, show the list of stages in their current order with drag handles (reorderable). Each stage row has: stage name (editable inline), client visibility toggle (on/off), required approval toggle (on/off), and a delete icon. An "Add Stage" button at the bottom of each list.

Show the Development stages as the active tab: Requirement Finalization, Technical Planning, Setup & Architecture, Development, Internal QA, Client Testing/UAT, Bug Fixing, Deployment, Support. Show "Client Testing/UAT" with client visibility ON and required approval ON. Show "Internal QA" with client visibility OFF and required approval OFF.

Page 4: XP & Gamification
Master toggle at top: "Gamification Enabled" (currently on).

XP Rules section — a table of XP events:
Task Completed on time: +80 XP
Task Completed late: +40 XP
Task Approved by client: +120 XP (bonus)
Stage Approved: +200 XP
Revision Requested by client: -30 XP penalty
Bug reported in completed task: -50 XP penalty
Quest Completed: variable (set per quest)
Each row is editable inline (click to edit XP value). A toggle per row to enable/disable that rule.

Level System section — a table showing Level thresholds:
Level 1: 0–500 XP | Level 2: 501–1,200 XP | Level 3: 1,201–2,500 XP | etc. up to Level 10: 15,000+ XP. Each threshold is editable. An "Add Level" button.

Penalty Cap setting: "Maximum XP penalty per task: -100 XP" — editable.
Reset option: "Reset all XP data" — danger ghost button with a confirmation warning.

Page 5: Rewards
Two sections: Coin Earning Rules and Reward Items.

Coin Earning Rules — a table similar to XP rules but for coins:
Task Completed: +20 coins
Stage Approved: +50 coins
Quest Completed: +100 coins
Each editable and toggleable.

Reward Items — a table of all rewards in the shop with columns: Reward Name, Coin Cost, Status (Active/Inactive toggle), Category, Redemption Limit (per month), and Edit/Delete actions. Show 8 rows matching the rewards from Phase 10.
An "Add Reward" button opens an inline form or modal.

Page 6: Permissions
A permission matrix table. Rows are actions (View Projects, Edit Projects, Create Tasks, Approve Stages, Manage Clients, View Reports, Manage XP, Access Settings, View Audit Logs, etc. — show 12 actions). Columns are roles (Super Admin, Admin, PM, Team Lead, Employee, Client Owner, Client Member). Each cell is a checkbox or toggle. Super Admin column is fully checked and locked (greyed out, not editable). Show some interesting variation — Employees cannot manage clients or access settings. Client Owner can view projects and approve stages but nothing else internal.

Page 7: Integrations
ClickUp Integration section:
Connection status: Connected (show green badge). Workspace: Linknbit Workspace. Connected by: Ghayas (Super Admin). Connected on: March 10 2026.
Settings: Default sync direction (Portal → ClickUp, bidirectional toggle). Auto-create ClickUp tasks when portal tasks are created (toggle, currently on). Sync task status updates (toggle, on). Sync assignees (toggle, on).
A "Test Connection" button and a "Disconnect" danger ghost button.

Discord Integration section:
Connection status: Not connected. A "Connect Discord Server" button. Below it, a section explaining Discord role mapping (shown as disabled/locked until connected): a table mapping Discord roles to portal roles.

Email Notifications section:
SMTP settings: Host, Port, Username, Password (masked), From Name, From Email. A "Send Test Email" button.

Page 8: Notifications
A table of notification types with toggles for each delivery channel. Rows are notification events (Task Assigned, Task Due Soon, Task Overdue, Stage Approved, Revision Requested, New Comment, New File Uploaded, XP Earned, Badge Earned, Quest Completed, ClickUp Sync Error, New Client Login). Columns: In-App, Email. Each cell is a toggle. Some are locked on (Task Overdue — always in-app).

Below the table: Notification Frequency settings — "Digest emails: Daily at 9:00 AM PKT" with a time picker.

Page 9: Audit Logs
A filterable, searchable log table. Filters: Date Range, User, Action Type (All / Task Updated / Approval / Role Change / Integration / Settings Changed / Login).

Show 12 log rows with columns: Timestamp, User (avatar + name), Action, Details, IP Address.

Example rows:
- May 12 2026 09:14 | Ghayas (Super Admin) | Settings Changed | Updated XP rule: Task Completed on time: 80→100 | 182.180.x.x
- May 12 2026 08:52 | Ahmad Karimi | Task Updated | Status changed: In Progress → Blocked on "Fix pagination bug" | 182.180.x.x
- May 11 2026 17:30 | Sara Qureshi | Approval Submitted | Stage: Client Review submitted for Cricket Sansar Brand Identity | 182.180.x.x
- May 11 2026 16:10 | Imran Shah (Client) | Login | Client login from new device | 203.x.x.x
- May 11 2026 14:00 | Ghayas | Role Change | Usman Tariq role changed: Junior Dev → Developer | 182.180.x.x
Show pagination at bottom. Export button (CSV) top right of the table.

Design notes:
Settings pages should feel clean, functional, and scannable — this is not a place for decorative elements. Clear section headings, consistent form patterns, and obvious save/cancel actions on every editable section. The permission matrix is the most complex element — make sure it reads clearly at a glance. Danger actions (disconnect, reset XP, delete) must always have a visual warning state and require confirmation. Dark mode, real data, production-ready.
```
