import type { ChangelogRelease } from '../../types'

/**
 * Release history, newest first.
 *
 * Milestones are curated: they group the commit history into the changes a user
 * would actually notice, dated from the last change in each group. Internal
 * refactors, migrations and governance plumbing are left out on purpose — this
 * is read by everyone in the company, not by whoever is editing the schema.
 *
 * `RELEASES[0]` is rendered as "Latest" on this page and as the What's new
 * callout at the top of the handbook, so a new milestone goes on top.
 */
export const RELEASES: ChangelogRelease[] = [
  {
    version: 'v1.5',
    date: '2026-08-17',
    title: 'Business Development goes live',
    highlight:
      'The BD module now saves. Your pipeline, outreach and campaigns are shared with the department and kept between sessions, and every record carries a live comment thread.',
    entries: [
      {
        kind: 'added',
        text: 'Business Development is no longer a preview. Leads, outreach, meetings, campaigns, tasks, daily check-ins and targets are all saved and shared — what you change, your colleagues see.',
      },
      {
        kind: 'added',
        text: 'Comment threads on leads, BD tasks and campaigns. Type “@” to tag a colleague and they are notified; comments from other people appear as they are posted, without reloading.',
      },
      {
        kind: 'added',
        text: 'Lead notes, BD task descriptions and campaign briefs are now written with the same editor as the rest of the portal — formatting, links and @mentions included.',
      },
      {
        kind: 'added',
        text: 'A BD meeting you are invited to now shows under Workspace → My Meetings even if you have no access to the BD module itself, with a count in the sidebar of how many you still have coming up.',
      },
      {
        kind: 'added',
        text: 'Being added to a client meeting now reaches you: a notification in the portal, and an email carrying a calendar invitation you can add to Outlook, Gmail or Apple Calendar in one click. You are told again if the meeting is moved or cancelled.',
      },
      {
        kind: 'added',
        text: 'Meetings carry a joining link. Paste the Zoom or Meet URL when you book one and everybody gets a Join button — on the meeting card, in the email, and in their calendar entry.',
      },
      {
        kind: 'fixed',
        text: 'Coming in for the second half of a day off is no longer recorded as late. Lateness on a first-half leave is now measured from the time the second half starts, and the attendance records that were wrongly marked late have been corrected.',
      },
      {
        kind: 'improved',
        text: 'Leave and WFH now appear under every day they cover, so you can see who is off on a given date. Each remains one request — the Approve and Reject buttons sit on its first day only.',
      },
      {
        kind: 'improved',
        text: 'A WFH request now takes a date range, so a whole week working remotely is one request and one approval instead of five.',
      },
      {
        kind: 'added',
        text: 'Partial WFH: request half a day from home and work the other half from the office. Say which half — it shows on your attendance as WFH · 1st or WFH · 2nd, and both halves count as worked.',
      },
      {
        kind: 'improved',
        text: 'Every BD change applies the moment you make it — dragging a card, ticking a step, editing a field. Nothing waits on a spinner, and if a save is refused the screen puts itself back and tells you.',
      },
      {
        kind: 'improved',
        text: 'The people pickers throughout BD now list your actual colleagues rather than sample names, and reassigning a lead or a task notifies whoever picks it up.',
      },
      {
        kind: 'fixed',
        text: 'Performance reporting is now measured off real records: the funnel counts your live pipeline, and the revenue chart books each deal to the month it closed rather than the month the lead arrived.',
      },
      {
        kind: 'fixed',
        text: 'You can now file a lead or a campaign for a colleague. Choosing anyone but yourself as the owner used to refuse the save; the record is now created and stays yours to edit as well as theirs.',
      },
      {
        kind: 'improved',
        text: 'Leave, WFH Requests, Exceptions and Overtime now look and work the same: one list on each, with the same filters in the same places and the pending count on the panel header. The stat cards that sat above each list are gone — they repeated what the list already shows and pushed the actual requests below the fold.',
      },
      {
        kind: 'added',
        text: 'Admins can remove an enrolled device outright, for a replaced handset or a duplicate enrolment that blocking alone never cleared off the list. Attendance history is untouched and the owner can enrol again.',
      },
      {
        kind: 'fixed',
        text: 'Profile photos now appear throughout Business Development. Lead cards, the pipeline table, the task board, meetings, targets and daily check-ins were all drawing initials even for people who had uploaded a picture.',
      },
      {
        kind: 'fixed',
        text: 'Last contacted no longer shows the day a lead was added. It stays blank until outreach is actually logged, and a lead nobody has contacted reads “Not contacted” rather than appearing to have been spoken to today.',
      },
      {
        kind: 'added',
        text: 'A deal can be quoted in any currency — 166 of them, covering every country that has one. Pick it beside the estimated value, search the list by country if the code escapes you, and the lead keeps showing that currency everywhere while the pipeline totals convert it to PKR. Rates refresh daily, and the one used is shown as you type and frozen onto the lead when you save.',
      },
      {
        kind: 'added',
        text: 'Import a list of prospects into the pipeline from a spreadsheet. Pipeline → Import CSV takes the file, shows you exactly what it is about to create, and lists any row it could not read with its line number — the rows it can read still go in.',
      },
    ],
  },
  {
    version: 'v1.4',
    date: '2026-08-10',
    title: 'The task timer replaces the daily standup',
    entries: [
      {
        kind: 'added',
        text: 'Track your day with the task timer instead of a written standup. Start it from any task, and it stays pinned to the screen while it runs.',
      },
      {
        kind: 'added',
        text: 'Standups can now be switched off per role, or per person, from Standup → Settings.',
      },
      {
        kind: 'improved',
        text: 'People who have left the company no longer vanish from the records that still point at them. A project they managed shows their name flagged “Left” instead of silently reading Unassigned, and their terminal fingerprint is no longer offered to somebody else.',
      },
      {
        kind: 'improved',
        text: 'Settings has moved to the bottom of the sidebar, pinned below a divider, and stays put while the rest of the list scrolls. Delivery now reads in the order work actually travels — clients, then projects, then tasks — and the People section groups the directory pages together above Attendance and Gamification.',
      },
    ],
  },
  {
    version: 'v1.3',
    date: '2026-08-07',
    title: 'Time backlog and cleaner attendance records',
    entries: [
      { kind: 'added', text: 'Time backlog: who tracked how long, on which project and task, with per-person totals.' },
      {
        kind: 'improved',
        text: 'Attendance now records what kind of day it was separately from whether you were present, so a half day reads as a half day rather than a contradiction.',
      },
      {
        kind: 'improved',
        text: 'Deactivating someone revokes their access everywhere at once, and signs them out within seconds rather than whenever their session happened to expire.',
      },
      {
        kind: 'improved',
        text: 'The office network is recognised automatically from the attendance terminal, so on-site check-in stops failing after a router change.',
      },
    ],
  },
  {
    version: 'v1.2',
    date: '2026-08-04',
    title: 'Task time tracking',
    entries: [
      { kind: 'added', text: 'Start/stop timer on any task, plus manual time entries with a note and a billable flag.' },
      { kind: 'added', text: 'Tracked time is measured against the task estimate and warns once you pass it.' },
      { kind: 'added', text: 'Card and table view toggles across the project, task and people lists.' },
      { kind: 'added', text: 'Employee of the Month is announced to the whole company.' },
      { kind: 'improved', text: 'Notifications now cover task activity and chat mentions, and honour your per-type preferences.' },
    ],
  },
  {
    version: 'v1.1',
    date: '2026-07-31',
    title: 'Fingerprint check-in and task history',
    entries: [
      { kind: 'added', text: 'Fingerprint check-in through the office terminal, with the portal button kept as a fallback when the device is offline.' },
      { kind: 'added', text: 'Every task now carries a full activity feed of what changed, when and by whom.' },
      { kind: 'improved', text: 'Names are clickable everywhere — task, comment, standup, leaderboard, chat — and all open the same profile.' },
    ],
  },
  {
    version: 'v1.0',
    date: '2026-07-27',
    title: 'Team chat and the services model',
    entries: [
      { kind: 'added', text: 'Team chat: channels, direct messages, file sharing, reactions, replies, @-mentions and content search.' },
      { kind: 'added', text: 'Private channels with managed membership.' },
      {
        kind: 'added',
        text: 'Projects are now organised by service — Design, Development and Marketing each carry their own stages, tasks and people, so you only see the pipeline you work in.',
      },
      { kind: 'added', text: 'Team pages, with reusable project templates a team can apply to a new service in one action.' },
      { kind: 'added', text: 'Standup history, team board and participation settings.' },
    ],
  },
  {
    version: 'v0.9',
    date: '2026-07-22',
    title: 'Files everywhere',
    entries: [
      { kind: 'added', text: 'File attachments on tasks and projects, with an in-portal viewer.' },
      { kind: 'added', text: 'Mention a file by name to link something already stored in the portal.' },
      { kind: 'added', text: 'Confidential documents, readable only by the domains entitled to them.' },
      { kind: 'added', text: 'Bulk-add people to a project.' },
    ],
  },
  {
    version: 'v0.8',
    date: '2026-07-20',
    title: 'Tasks and the daily standup',
    entries: [
      { kind: 'added', text: 'The task module: create, assign, prioritise, estimate and comment.' },
      { kind: 'added', text: 'Daily standup with a submission window, an on-time cutoff worth 5 XP, and a team roster.' },
      { kind: 'added', text: 'Member profile pages.' },
      { kind: 'improved', text: 'The sidebar is grouped into Workspace, Delivery, People and Admin rather than one flat list of fourteen entries.' },
    ],
  },
  {
    version: 'v0.7',
    date: '2026-07-15',
    title: 'Push notifications and group rewards',
    entries: [
      { kind: 'added', text: 'Push notifications, enabled per device, with per-event-type preferences.' },
      { kind: 'added', text: 'Group rewards — club together on a pooled reward and contribute an equal share each.' },
      { kind: 'added', text: 'Company-wide work-from-home days.' },
    ],
  },
  {
    version: 'v0.6',
    date: '2026-06-23',
    title: 'Designations and check-in policy',
    entries: [
      { kind: 'added', text: 'Designations, and team membership management.' },
      { kind: 'added', text: 'Per-person allowed check-in time, for anyone on a different schedule.' },
      { kind: 'added', text: 'Attendance exclusion for roles that are not tracked.' },
    ],
  },
  {
    version: 'v0.5',
    date: '2026-06-18',
    title: 'Profiles, mobile and installable app',
    entries: [
      { kind: 'added', text: 'Profile page with avatar upload and password change.' },
      { kind: 'added', text: 'A mobile layout with a bottom tab bar, and the portal became installable as an app.' },
      { kind: 'added', text: 'Points history — a full ledger of every point earned and spent.' },
      { kind: 'added', text: 'Device enrolment and approval for shared check-in devices.' },
      { kind: 'added', text: 'Password reset by email.' },
    ],
  },
  {
    version: 'v0.4',
    date: '2026-06-05',
    title: 'Recognition, people and services',
    entries: [
      { kind: 'added', text: 'Gamification rebuilt: quest board, shoutouts, badges, rewards shop and a monthly reset.' },
      { kind: 'added', text: 'People management — invite staff, set roles, control access.' },
      { kind: 'added', text: 'Work-from-home and leave requests, synced into the attendance record.' },
      { kind: 'added', text: 'A configurable service catalogue.' },
    ],
  },
  {
    version: 'v0.3',
    date: '2026-05-24',
    title: 'Attendance',
    entries: [
      { kind: 'added', text: 'Check in and out, with attendance history and monthly stats.' },
      { kind: 'added', text: 'Overtime, out-of-office and exception requests.' },
      { kind: 'added', text: 'Schedule-aware check-in that knows your working day.' },
    ],
  },
  {
    version: 'v0.2',
    date: '2026-05-20',
    title: 'Accounts',
    entries: [
      { kind: 'added', text: 'Sign-in, invitations and role-based access to the portal.' },
    ],
  },
  {
    version: 'v0.1',
    date: '2026-05-18',
    title: 'First build',
    entries: [
      { kind: 'added', text: 'The portal shell: dashboard, projects, tasks, teams, settings and the client-facing views.' },
    ],
  },
]
