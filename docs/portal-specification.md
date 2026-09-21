# Agency Operations Portal — Software Specification

**Version:** 1.0 · **Status:** Requirements baseline for a ground-up build

---

## 1. Product Definition

A multi-role operations portal for a software/creative agency (10–150 people) delivering client work across multiple disciplines.

It holds five things in one system, pre-structured, with no configuration required to be useful:

1. Client delivery — projects, services, stages, tasks
2. The working day — attendance, leave, time tracking
3. Business development — leads, outreach, meetings, targets
4. People — directory, teams, roles, permissions
5. Recognition — XP, quests, shoutouts, rewards

Two separate surfaces:

- **Internal portal** — staff. Sidebar navigation, dense, data-heavy.
- **Client portal** — the agency's clients. Separate theme, top navigation, zero internal metrics.

---

## 2. Roles & Permissions

### 2.1 Base roles

| Role | Surface |
|---|---|
| Super Admin | Internal |
| Admin / Ops Manager | Internal |
| Project Manager | Internal |
| Team Lead | Internal |
| Employee | Internal |
| HR | Internal |
| Finance | Internal |
| Client Owner | Client |
| Client Member | Client |

### 2.2 Permission model (mandatory)

- A role is a **named bag of permission keys**. Nothing is attached to a role name.
- Every gate — UI, route, API, row-level security — tests a **permission key**, never a role name.
- A person may hold **multiple roles**; their permissions are the union.
- Roles carry a **rank**; a person may only grant roles at or below their own rank.
- Roles and their permissions are editable in-product (create role → tick permissions → assign).
- Permissions may be marked hidden so they are grantable but not discoverable.
- Only two exceptions to "never test a role": the internal/client boundary, and displaying a role as a label.

### 2.3 Representative permission keys

`can_manage_projects`, `can_manage_clients`, `can_view_reports`, `can_view_all_tasks`, `can_view_team_tasks`, `can_approve_tasks`, `can_manage_attendance`, `can_approve_requests`, `can_apply_attendance_directly`, `can_view_all_attendance`, `can_view_team_attendance`, `can_delete_attendance_records`, `can_manage_people`, `can_delete_people`, `can_edit_any_profile`, `can_view_salaries`, `can_grant_role`, `can_manage_roles`, `can_impersonate`, `can_view_audit_log`, `can_manage_services`, `can_manage_job_types`, `can_manage_standups`, `can_view_standups`, `can_view_team_standups`, `can_govern_gamification`, `can_recognize`, `can_fulfill_payouts`, `can_view_bd`, `can_manage_bd`, `can_submit_bd_updates`, `can_view_bd_team_updates`, `can_manage_target`, `can_view_budget`, `can_view_confidential`, `can_view_backlog`, `can_manage_timesheets`, `can_manage_team_templates`, `can_mention_teams`, `can_administer_channels`, `can_moderate_comments`, `can_publish_releases`, `can_use_sticky_notes`.

### 2.4 Data-derived rights (not permissions)

Facts about a record grant their own access: being a project's manager, being staffed on a service, being a task assignee or reviewer, being the author of a request, being a channel member.

---

## 3. Navigation

Sidebar grouped by kind of work, not by role. Sections a person cannot access are absent, not disabled.

| Group | Items |
|---|---|
| **Workspace** | My Day · Notifications · Chat · Standup (My Standup, Team, History) · My Notes · My Meetings |
| **Delivery** | Business Dev (Pipeline, Projects, Tasks, Meetings, Outreach, Daily Updates, Performance) · Clients · Projects · Tasks · Reports |
| **People** | My Team · Teams · People · Attendance (Today, Calendar, Requests, My Attendance, Daily Records) · Gamification (Leaderboard, Quest Board, Shoutouts, Badges, Rewards Shop, Points History, Approvals, Governance) |
| **Admin** | Terminals · Enrolled Devices · Schedule & Holidays · Audit Log |
| **Footer** | Settings |

Additional navigation requirements:

- **Pinned section** — any nav row or any page can be pinned to a personal shortcut list above the groups. Per-user, private.
- **Command palette** (⌘K / Ctrl+K) — searches every screen the person can open, plus projects, people and tasks. Empty state lists the full accessible menu.
- **Badge counts** — on Notifications (items awaiting the person's action), Attendance (pending requests they can approve), Gamification Approvals, Chat (unread), My Meetings (upcoming).
- **Mobile** — bottom tab bar with 4–5 primary destinations, plus a hub screen listing everything else; section sub-pages open as pushed stack screens with a back control.

---

## 4. Delivery Module

### 4.1 Data structure

```
Client → Project → Service (design | development | marketing) → Stage → Task → Subtask
```

- A project belongs to exactly one client and runs **one or more services**.
- Each service has **its own stages, its own tasks and its own staffed people**.
- Service list is admin-editable; each service carries a name, colour and icon.

### 4.2 Project

- Fields: name, client, description, status, start/target dates, budget (permission-gated), services, project managers (multiple), watchers.
- Status: To Do · In Progress · Blocked · Awaiting Client · Completed · On Hold.
- Views: card grid and table, filterable by client, service, status, PM, date range.
- Scope switch: **Mine / My Team / Everyone** — persists across Projects and Tasks screens; reach is capped by permissions.
- Project detail tabs: **Board · Pipeline · Overview · Files · Team · Backlog**.

### 4.3 Task

- Fields: title, description (rich text), status, priority, assignees (multiple), reviewers (multiple), estimate, due date, service, stage, labels, client-visibility flag.
- Priority: Critical · High · Medium · Low.
- Default statuses: **Backlog · To Do · In Progress · In Review · Approved · Completed · Blocked**.
- Statuses are **configurable**: add, rename, recolour, reorder columns; mark which status triggers reviewer notification; each status has an icon.
- Sub-objects: subtasks with checkboxes, comments with @mentions, file attachments, external document links, watchers, full activity history.
- Views: Kanban board (drag between columns), list/table, per-project pipeline view, personal task list.
- Task detail opens as a **side panel over the board** from board context, or as a full page from a direct link.

### 4.4 Approvals

- Flow: `pending → approved | revision_requested | rejected`.
- Applies to tasks and stages submitted for sign-off, and to client-facing deliverables.
- Approval requests land in the reviewer's Notifications "Waiting on you" queue.

### 4.5 Files

- Files attach to tasks, stages and projects; also external links (e.g. Google Docs).
- Each file carries a **client-visible** toggle and a **confidential** flag (permission-gated).
- Project Files tab aggregates everything on the project.

### 4.6 Templates

- A team owns reusable project templates: a named set of stages and seed tasks.
- Applying a template to a service creates its stages and tasks in one action.

---

## 5. Time Tracking

- **Task timer** — start/stop on a task; one running timer per person; visible from My Day, the board card and the task detail.
- **Manual entries** — add time retroactively with date, duration and note.
- **Timesheet** — every person gets a row whether or not they tracked anything: expected working window, actual check-in/out, leave or holiday state, and logged timer hours. Filterable by date range, team, person.
- **Backlog reports** — logged time by project and by person over any range, with CSV export.
- Timer data and standup data are separate measures and are never summed together.

---

## 6. Attendance & Time Off

### 6.1 Check-in

- Methods: fingerprint/biometric terminal punch, portal button while on the office network, or portal marking for a work-from-home day.
- **Job types** determine the rules: on-site, hybrid, remote — each with its own meaning for a day with no check-in (on-site → absent; hybrid/remote → recorded as working from home).
- Per-person **working days**: the company calendar by default, or an individual week (e.g. includes weekends), or flexible hours.
- Device enrolment: a person's device must be approved before it can be used to check in.

### 6.2 Views

- **Today** — company roster for any date: in office, working from home, off, not yet checked in. Private detail is withheld rather than the whole screen.
- **Calendar** — the month ahead: public holidays, company off days, working Saturdays, who is away and for how much of a day, and what is pending a decision.
- **Daily Records** — every recorded day over any span, with the source of each record and a per-person roll-up. Records are correctable by authorised staff.
- **My Attendance** — own day, upcoming, this month's record, and own enrolled devices.
- **Team Attendance** — one team at a time, on the team's page.

### 6.3 Requests

Four types, one shared queue and one approval flow: **Leave · Work From Home · Overtime · Correction**.

- Submit → notify approver → approve/reject → notify requester.
- Leave requests carry a leave type and draw against a balance; balances are visible to the requester.
- WFH requests support a date range and half days (partial day = half at home, half in office).
- A single day can be withdrawn from a longer approved request.
- A person may edit or withdraw their own request while pending.
- Half day is modelled as *leave with a day-part*, not as a separate status. Counters count whole days per predicate; no fractional weighting.

### 6.4 Company calendar

- Public holidays, company-wide WFH days, working Saturdays, per-year setup.
- Company-wide events override individual check-in and leave rules.

---

## 7. Business Development

### 7.1 Pipeline

- **Lead stages:** New Lead · Contacted · Qualified · Meeting · Proposal Sent · Negotiation · Won · Lost · Unqualified.
- Kanban board with drag-to-move; cards manually reorderable within a column.
- Lead fields: company, contact name and title, channel, value, currency, temperature (hot/warm/cold), ICP fit (strong/partial/none), owner, next action date, notes.
- **Channels:** Upwork · Fiverr · LinkedIn · Email · Cold Call · Inbound · Referral.
- Bulk lead import from a spreadsheet.
- Attachments and external proposal links on a lead.
- Activity log and comment thread per lead, live-updating for everyone with it open.

### 7.2 Outreach

- Every unit of effort is one record: a single call on a named lead, or a batch (e.g. 20 proposals sent).
- The Outreach page and a lead's own log are two views of the same records.
- Per-channel reporting derives from these records.

### 7.3 Campaigns & BD tasks

- A campaign is the BD equivalent of a project; BD tasks hang off it using the same board columns as delivery.
- Campaign visibility is limited to its team.
- Tasks carry checklists, comments, attachments and document links.

### 7.4 Meetings

- Booked against a lead, with internal attendees invited from anywhere in the company.
- Attendees see the meeting in **My Meetings** without needing BD access — time, platform, join link and who else is attending, never the deal behind it.
- Calendar invitation email with `.ics` attachment and a 15-minute reminder.
- Outcome recorded after the meeting.
- Notifications on invite, reschedule and cancellation, individually mutable.

### 7.5 Daily updates

- A written end-of-day check-in from the people holding the submit permission.
- Editable until midnight; personal history kept by month.
- A manager view shows who has filed today and who has not.

### 7.6 Targets & performance

- Monthly per-person quotas: revenue, outreach volume, meetings.
- Measured against actual pipeline records; funnel, channel report and target all read the same data.

### 7.7 Handoff

- A won lead converts in one action into a delivery project: client record, project, services, starting stages and the people on each — no retyping.

---

## 8. People & Teams

- **Directory** — everyone internal with role, designation, teams and status. Names are clickable everywhere in the portal (tasks, comments, standups, leaderboards) and open the same profile.
- **Member profile** — one page per person: teams, projects and services staffed on, attendance summary, recognition, and compensation (permission-gated).
- **Teams** — grouped under a lead, with their own page: members, projects, attendance, and owned project templates.
- **My Team** — direct shortcut for anyone who leads a team; absent for everyone else.
- **Designations** — job titles, managed separately from roles.
- **Invitations** — accounts are created by invitation only; the invite email carries a one-time link that sets the password. No self-registration.
- **Deactivation** — means "left the company": access revoked immediately (including any live session), removed from rosters and pickers, but retained on all historical records with a visible "departed" marker.

---

## 9. Recognition & Rewards

- **XP and levels** — XP earned from defined actions (completing tasks, punctuality, helping others, quests, shoutouts). XP accumulates into levels. Points are spendable currency, reset monthly with full history retained.
- **Quest board** — optional work posted with a points value and a claim limit. Claim → do → submit proof → reviewer approves. Claimant identity is public; the submitted proof is private to reviewers.
- **Shoutouts** — peer-to-peer public thank-yous, moderated before publishing.
- **Badges** — milestone awards, plus Employee of the Month announced company-wide.
- **Rewards shop** — catalogue with images, point costs and stock. Redemption requires approval and then fulfilment.
- **Pooled rewards** — a group of 2+ people clubs together on one reward with equal per-person shares; points are reserved on join and refunded if the pool is cancelled or expires.
- **Leaderboard** — monthly standings with distinct treatment for the top three.
- **Points history** — full ledger of every point earned and spent.
- **Approvals** — quest proofs, shoutouts and redemptions in one queue with a per-person count.
- **Governance** — granting XP manually and setting who takes part.

---

## 10. Daily Rhythm

### 10.1 My Day (landing screen)

- Today's meetings, with the next one ahead marked and a join link.
- Your work: overdue first, then due today, then in progress. Only your own open work; finished work drops off.
- Inline timer start on any listed task.
- Check-in card.
- Standup prompt while the window is open.
- Who is out today (people you share a team with; wider for HR/admin).
- No charts — company-wide numbers live in Reports.

### 10.2 Standup

- A written daily entry: what was done, how long it took, what is blocking.
- Participation is settings-driven: a default per role plus per-person overrides.
- Configurable window, minimum length and XP value.
- Owner may edit only until the window closes; after that XP and lateness are frozen.
- Team board scoped to teams the viewer shares.
- Personal history.

### 10.3 Chat

- Channels (public and private) grouped under renameable categories, plus direct messages.
- Channels have **managers** (any number, not a single owner) who rename, recategorise, set posting rights, and manage membership.
- Announcement mode: only managers post; everyone else reads and reacts.
- Composer: multi-line with Ctrl+Enter to send (Enter never sends), bulleted lists, slash menu, paste-to-upload images, drag-and-drop attachments, `@` person mentions, `@team` mentions (permission-gated, shown in service colour), `#` to link an existing project file.
- Messages: one reaction per person per message (changing moves it), reply-with-quote via hover arrow or swipe/drag, edit and delete (deleting removes its attachments and reactions, leaving a tombstone).
- Read state: per-message tick states — sending, sent, read by some, read by all — with hover to see who; mirrored in the conversation list.
- Unread counts in the browser tab title and app badge, counting DMs and channels only.
- Conversations ordered by last activity including reactions; unsent drafts preserved and shown in the list.
- Mentions and `@everyone` messages visually banded so they are findable when scrolling.
- Sticky date dividers; per-message time with hover for full date.
- Mute a conversation; mark a read conversation unread.

### 10.4 Notifications

- Two lists: **Waiting on you** (approvals in your queue, requests you can review, unreplied mentions) and **All / Unread** (news).
- The sidebar badge counts only "waiting on you" — it clears by acting, not by reading.
- Every notification deep-links to the task, message or request it refers to.
- Per-person preferences by notification category.
- Web push to installed devices, per device.

### 10.5 Personal notes

- A private pin-board of sticky notes: drag to position, resize, colour, z-order control, rich text (bold, italic, strikethrough, alignment), handwritten display font.
- Owner-only. Granted via a hidden permission; never surfaced in documentation or release notes.

---

## 11. Reports

- **Backlog reports** — logged hours by project and by person over any range, drill-down per project or per person, CSV export.
- **Time backlog** — who tracked how long, on which project and task, with per-person totals.
- **Timesheet** — see §5.
- Charts: distribution by service, status breakdown, trend over range, per-person utilisation.

---

## 12. Governance

- **Audit log** — trigger-level capture of changes across attendance, people and gamification: actor, action, target, before/after, timestamp. Flags for the edits worth noticing (grace-period dodges, holiday tampering, self-grants). Restricted to administrators; not part of the staff handbook.
- **Impersonation** — an authorised admin signs in as a member for support, under a persistent banner, with a clean exit back to their own session and a log of every session.
- **Terminal provisioning** — register and manage biometric terminals.
- **Device approval** — approve the devices people check in from.
- **Working calendar** — holidays, company off days, working Saturdays.

---

## 13. Settings

| Section | Contents |
|---|---|
| My Devices | The devices this person checks in from |
| Notifications | Per-category notification and push preferences |
| Participation | One grid: who is expected to check in, submit a standup, appear on the timesheet, run the timer, earn points — by role default and per-person override |
| Attendance | Grace periods, expected hours, job-type rules, what a day with no check-in means |
| Standup | Window, XP value, minimum length, whether standups are required at all |
| Gamification | XP rules and values, level thresholds, reset behaviour |
| Services | Service list, colours, icons |
| Statuses | Board columns: add, rename, recolour, reorder, choose which notifies reviewers, set icons |
| Designations | Job titles |
| Permissions | Roles, their permission sets, and ranks |

Rule: **Settings changes how the portal behaves for everyone. Admin acts on one person or record.**

---

## 14. Client Portal

A separate surface with its own theme and layout. Top horizontal navigation, no sidebar.

| Screen | Contents |
|---|---|
| Dashboard | Active projects, progress, what needs their approval, recent activity |
| Projects | Their projects; detail shows milestones, progress, client-visible tasks and files |
| Approvals | Deliverables awaiting their decision: approve, request revision, or reject with a reason |
| Files | All client-visible deliverables, filterable by project, downloadable |
| Reports | Progress and delivery summaries |
| Account | Their company, their team members on the portal |
| Settings | Profile and notification preferences |
| Help | How to use the portal, how to reach the agency |

Constraints:

- **No internal metric ever reaches a client view** — no XP, no timers, no team performance, no internal comments, no budget, no staff attendance.
- A task or file appears only when its `client_visible` flag is set.
- Client Owner may invite Client Members from their own company; Client Member is read-and-approve only.

---

## 15. Cross-Cutting Requirements

### 15.1 Self-documentation

- An in-portal **handbook**, chaptered and role-gated: a reader is never shown instructions for a screen they cannot open.
- A **changelog**, newest first, gated the same way, with a "what's new" indicator that clears on read.
- A deliberate broadcast action to announce a release to everyone, distinct from the passive indicator, and usable only once per version.
- Governance internals and hidden modules are never documented.

### 15.2 Real-time

- Live updates without refresh for: chat messages, reactions and read receipts; comments; notifications; board card movement; approval queues; presence/online state.

### 15.3 Installability

- Installable app that runs in its own window, stays signed in, and delivers push notifications.
- Cached shell must be invalidated on any release that changes the data shape.

### 15.4 Security

- Row-level security on every table; every policy tests a permission key or a data fact.
- No auth tokens or personal data in browser storage.
- Server-only keys never present in client code.
- Confidential attachments enforced server-side, not merely hidden in the UI.

### 15.5 Data & search

- Global search across screens, projects, people and tasks, filtered to what the viewer may open.
- CSV export on every report.
- Soft delete on tasks and projects with cascade rules.

### 15.6 Accessibility & quality

- Keyboard navigation on every interactive element; visible focus states.
- Semantic HTML and correct ARIA on custom controls.
- Skeleton loading states — no layout shift.
- Empty states on every list that carry the action that fills them.
- Full support down to phone width for every screen, not a subset.

---

## 16. Non-Goals

- Multi-company / multi-tenant hosting (single agency per deployment in v1).
- Self-serve sign-up — accounts are created by invitation.
- Invoicing, payroll and accounting.
- External project-management tool sync (ClickUp/Jira) beyond a per-record sync status indicator.
