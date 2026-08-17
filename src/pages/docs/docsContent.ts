import type { DocChapter, DocGate } from '../../types'

/**
 * The portal handbook, as data.
 *
 * Two rules govern what belongs here:
 *
 * 1. **User-facing only.** This documents what someone *does* with the portal.
 *    Governance plumbing — the audit log, the role/permission editor, terminal
 *    provisioning, impersonation — is deliberately absent: it is operated by two
 *    people and reads as noise to the other five roles.
 * 2. **Never describe an unreachable screen.** Every chapter and topic carries
 *    the same `roles` / `feature` gate the sidebar uses, so the handbook a reader
 *    sees matches the portal they can actually open.
 */

/** Everyone who is asked to report their day. Mirrors STANDUP_ROLES in navItems. */
const DELIVERY_ROLES = ['super_admin', 'admin', 'hr', 'project_manager', 'team_lead', 'employee'] as const

/** Roles with people to review rather than only their own work. */
const REVIEWER_ROLES = ['super_admin', 'admin', 'hr', 'project_manager', 'team_lead'] as const

export const DOC_CHAPTERS: DocChapter[] = [
  // ── 1 ────────────────────────────────────────────────────────────────────────
  {
    id: 'getting-started',
    title: 'Getting started',
    blurb: 'Signing in, finding your way around, and getting the portal onto your phone.',
    topics: [
      {
        id: 'signing-in',
        title: 'Signing in',
        summary:
          'You are invited by an admin — accounts cannot be self-created. The invite email carries a one-time link that sets your password.',
        where: 'Sign-in page',
        procedures: [
          {
            title: 'First sign-in',
            steps: [
              'Open the invite link from your email.',
              'Choose a password and confirm it.',
              'You land on your Dashboard, already signed in.',
            ],
          },
          {
            title: 'Forgotten password',
            steps: [
              'On the sign-in page, choose “Forgot password”.',
              'Enter your work email and submit.',
              'Open the reset link in your inbox and set a new password.',
            ],
          },
        ],
        notes: [
          'Your session stays signed in across restarts. Signing out clears it on that device only.',
          'If your account is deactivated you are signed out within seconds, on every device, and told why.',
        ],
      },
      {
        id: 'navigation',
        title: 'Finding your way around',
        summary:
          'The left sidebar is grouped by the kind of work rather than by your role: Workspace (your own day), Delivery (client work), People, and Admin. Sections you have no access to are not shown at all.',
        where: 'Sidebar',
        notes: [
          'Delivery is ordered the way a piece of work travels — clients, then projects, then tasks.',
          'Settings sits on its own below the divider at the very bottom, and stays there while the sections above scroll.',
          'Red count badges mark things waiting on you — unread chat, claimable quests, requests to approve.',
          'On a phone the same destinations live in the bottom bar and behind the “More” tab.',
          'The arrow beside the Linknbit logo opens this handbook and the changelog.',
        ],
      },
      {
        id: 'install-app',
        title: 'Installing the app',
        summary:
          'The portal is installable — it runs in its own window, keeps you signed in, and can deliver push notifications.',
        where: 'Sidebar → Install app',
        procedures: [
          {
            title: 'Install on your device',
            steps: [
              'Look for the “Install app” button at the bottom of the sidebar. It only appears when your browser supports installing.',
              'Confirm the browser prompt.',
              'On iPhone, use Safari’s Share menu → “Add to Home Screen” instead.',
            ],
          },
        ],
      },
      {
        id: 'profile-and-notifications',
        title: 'Your profile and notifications',
        summary:
          'Set your display name, photo and theme, and choose which events are allowed to interrupt you.',
        where: 'Profile · Settings → Notifications',
        procedures: [
          {
            title: 'Update your details',
            steps: [
              'Open your avatar in the top bar and choose Profile.',
              'Edit your name or upload a photo, then save.',
              'Change your password from the same page.',
            ],
          },
          {
            title: 'Turn push notifications on',
            steps: [
              'Go to Settings → Notifications.',
              'Enable push for this device and accept the browser permission prompt.',
              'Untick any event type you would rather not be told about.',
            ],
          },
        ],
        notes: [
          'Push is granted per device — enabling it on your laptop does not enable it on your phone.',
          'Muting a chat conversation silences it regardless of your global preferences.',
        ],
      },
    ],
  },

  // ── 2 ────────────────────────────────────────────────────────────────────────
  {
    id: 'your-day',
    title: 'Your day',
    blurb: 'The screens you open first: what is waiting for you, and where you talk to people.',
    topics: [
      {
        id: 'dashboard',
        title: 'Dashboard',
        summary:
          'Your landing page: today’s attendance, the tasks assigned to you, what you have earned this month, and anything blocked.',
        where: 'Workspace → Dashboard',
      },
      {
        id: 'inbox',
        title: 'Inbox',
        summary:
          'Every notification in one list — task assignments, mentions, comments, approvals and request decisions. Reading it here clears the badge.',
        where: 'Workspace → Inbox',
        notes: ['Clicking a notification takes you straight to the task, message or request it refers to.'],
      },
      {
        // Ungated on purpose. The people most likely to need this are the ones
        // pulled into a client call from outside sales — they cannot open the
        // Business development chapter, so it cannot be explained only there.
        id: 'my-meetings',
        title: 'My Meetings',
        summary:
          'Client meetings you are hosting or have been invited to, newest first. The number beside it in the sidebar is how many you still have coming up.',
        where: 'Workspace → My Meetings',
        procedures: [
          {
            title: 'Join a meeting',
            steps: [
              'Open Workspace → My Meetings and find it under Upcoming.',
              'Press Join. If the organiser did not add a link, the card shows the platform instead and they will send one.',
            ],
          },
          {
            title: 'Put it in your own calendar',
            steps: [
              'Open the invitation email and use its attachment.',
              'Outlook, Gmail and Apple Mail all offer “Add to calendar” from it, with a reminder 15 minutes before.',
            ],
          },
        ],
        notes: [
          'You are notified in the portal when someone adds you, and again if the meeting is moved or cancelled. You can turn either off under Settings → Notifications → Meetings.',
          'You see only your own meetings here, and only the time, platform and who else is coming — never the deal behind them.',
          'The sidebar count covers meetings that have not started yet. It drops off on its own once one has passed.',
        ],
      },
      {
        id: 'chat',
        title: 'Chat',
        summary:
          'Team channels and direct messages, with file sharing, reactions, replies and @-mentions.',
        where: 'Workspace → Chat',
        procedures: [
          {
            title: 'Mention someone or attach a file',
            steps: [
              'Type @ and pick a name to notify that person directly.',
              'Drag a file onto the composer, or use the attachment button.',
              'Type # to link a project file that is already in the portal.',
            ],
          },
          {
            title: 'Quieten a conversation',
            steps: [
              'Open the conversation and use its info panel.',
              'Turn on Mute — you stay a member but stop being notified.',
            ],
          },
        ],
        notes: ['Some channels are private; you will only see them if you have been added.'],
      },
    ],
  },

  // ── 3 ────────────────────────────────────────────────────────────────────────
  {
    id: 'delivery',
    title: 'Projects and tasks',
    blurb: 'How client work is organised, and how you record what you did.',
    topics: [
      {
        id: 'project-structure',
        title: 'How a project is put together',
        summary:
          'A project belongs to a client and runs one or more services — Design, Development or Marketing. Each service has its own stages, its own tasks and its own people, so a designer never wades through the development pipeline.',
        where: 'Delivery → Projects',
        notes: [
          'The service switcher at the top of a project changes everything below it.',
          'You are staffed onto a service, not onto the project as a whole.',
        ],
      },
      {
        id: 'working-a-task',
        title: 'Working a task',
        summary:
          'A task carries its status, priority, assignees, estimate, subtasks, comments, files and full activity history.',
        where: 'Delivery → Tasks, or from inside a project',
        procedures: [
          {
            title: 'Move a task forward',
            steps: [
              'Open the task from the board, the list, or your Dashboard.',
              'Change its status — Backlog, To Do, In Progress, Review, Approved, Completed or Blocked.',
              'Tick off subtasks as you finish them; the progress bar follows.',
              'Leave a comment to bring someone in, using @ to notify them.',
            ],
          },
          {
            title: 'Ask for approval',
            steps: [
              'Open the stage or task that is ready to be signed off.',
              'Request approval — the reviewer is notified.',
              'They respond with Approved, Revision requested, or Rejected. A revision comes back with a note, not a dead end.',
            ],
          },
        ],
        notes: [
          'Files and tasks carry a client-visible switch. When it is off, the client portal never shows the item.',
          'Watch a task to be notified about it even when it is not assigned to you.',
        ],
      },
      {
        id: 'time-tracking',
        title: 'Tracking your time',
        summary:
          'Start a timer on the task you are working on and stop it when you move on. This is now how you report your day — it has replaced writing a daily standup.',
        where: 'Any task → Time',
        procedures: [
          {
            title: 'Time a task while you work',
            steps: [
              'Open the task and find the Time section.',
              'Press Start. The running timer stays pinned to the bottom-right of the screen wherever you navigate.',
              'Press Stop when you finish, or when you switch tasks.',
            ],
          },
          {
            title: 'Add time you forgot to track',
            steps: [
              'Open the task and choose “Log time”.',
              'Enter how long — “45m” or “1h 30m” both work.',
              'Add a short note on what you did, mark it billable if it is, and save.',
            ],
          },
        ],
        notes: [
          'Only one timer runs at a time. Starting one on another task moves it there rather than running two.',
          'Tracked time is compared against the task’s estimate, and turns amber once you pass it.',
          'Because the timer records what you worked on and for how long, a written standup is no longer required.',
        ],
      },
      {
        id: 'standup',
        title: 'Daily standup',
        summary:
          'The written standup — what you did, how long it took, and anything blocking you. Superseded by the task timer, and switched off per role or per person from Standup → Settings.',
        where: 'Workspace → Standup',
        roles: DELIVERY_ROLES,
        procedures: [
          {
            title: 'Submit one (while it is still required of you)',
            steps: [
              'Open Workspace → Standup during the submission window.',
              'Add a line per project you worked on, with the time spent and anything that blocked you.',
              'Submit. You can correct it for as long as the window stays open.',
            ],
          },
        ],
        notes: [
          'Submitting before the on-time cutoff earns 5 XP; after it, the entry is marked late.',
          'If your role or your account has been excluded, the page tells you no standup is expected today.',
        ],
      },
      {
        id: 'time-backlog',
        title: 'Time backlog',
        summary:
          'Who tracked how long, on which project and task, with per-person totals.',
        where: 'Delivery → Tasks → Backlog',
        feature: 'can_view_backlog',
      },
    ],
  },

  // ── 4 ────────────────────────────────────────────────────────────────────────
  {
    id: 'attendance',
    title: 'Attendance and time off',
    blurb: 'Marking your day, and asking for leave, remote days or overtime.',
    topics: [
      {
        id: 'check-in',
        title: 'Checking in and out',
        summary:
          'How you mark your day depends on your job type. On-site staff use the fingerprint terminal; hybrid and remote staff use the button in the portal.',
        where: 'People → Attendance',
        procedures: [
          {
            title: 'Check in at the office',
            steps: [
              'Put your finger on the terminal on your way in.',
              'The portal picks the punch up on its own — there is nothing to press.',
              'Do the same on your way out.',
            ],
          },
          {
            title: 'Check in from the portal',
            steps: [
              'Open People → Attendance.',
              'Press Check in. The button is only offered if your job type allows it.',
              'Press Check out at the end of your day.',
            ],
          },
        ],
        notes: [
          'The on-site check-in button reappears automatically if the terminal is offline, so a broken device never costs you a day.',
          'Arriving after your allowed start time is recorded as late; the allowance can be adjusted per person.',
          'The portal decides the time from the server clock, never your device’s.',
        ],
      },
      {
        id: 'requests',
        title: 'Leave, WFH, overtime and corrections',
        summary:
          'Four request types, all with the same shape: you submit, someone with the authority reviews, and you are notified of the outcome.',
        where: 'People → Attendance',
        procedures: [
          {
            title: 'Request time off or a remote day',
            steps: [
              'Open People → Attendance and pick the request you need — Leave, WFH or Overtime.',
              'Choose the date or range. For a half day, pick which half.',
              'Add a reason and submit.',
            ],
          },
          {
            title: 'Fix a wrong attendance record',
            steps: [
              'Raise an Exception request for the day in question.',
              'Say what actually happened — a missed check-out, a terminal that did not read your finger.',
              'It is reviewed and the day is corrected on approval.',
            ],
          },
        ],
        notes: [
          'An approved leave or WFH day updates your attendance record for that day automatically.',
          'You can edit or withdraw a request while it is still pending.',
          'Nobody can approve their own request, whatever their role.',
        ],
      },
      {
        id: 'my-attendance',
        title: 'Your attendance history',
        summary:
          'Your record month by month — days present, late arrivals, leave taken and hours worked.',
        where: 'People → Attendance → My Attendance',
      },
      {
        id: 'team-attendance',
        title: 'Your team’s attendance',
        summary:
          'The same view for the people who share a team with you, plus their pending requests.',
        where: 'People → Attendance',
        feature: ['can_view_team_attendance', 'can_view_all_attendance'],
      },
    ],
  },

  // ── 5 ────────────────────────────────────────────────────────────────────────
  {
    id: 'people',
    title: 'People and teams',
    blurb: 'Who works here, who they work with, and what they are working on.',
    topics: [
      {
        id: 'directory',
        title: 'People directory',
        summary:
          'Everyone internal, with their role, designation and teams. Names are clickable throughout the portal — on a task, a comment, a standup or a leaderboard — and open the same profile.',
        where: 'People → People',
      },
      {
        id: 'member-profile',
        title: 'Member profiles',
        summary:
          'One page per person: their teams, the projects and services they are staffed on, and their recognition. Sensitive sections such as compensation only appear for the people entitled to see them.',
        where: 'Click any name',
      },
      {
        id: 'teams',
        title: 'Teams',
        summary:
          'Teams group people under a lead and carry their own project templates — a reusable set of stages that can be applied to a new service in one action.',
        where: 'People → Teams',
      },
      {
        id: 'my-team',
        title: 'My Team',
        summary:
          'A shortcut straight to the team you lead. It only appears if you lead one.',
        where: 'People → My Team',
        roles: REVIEWER_ROLES,
      },
    ],
  },

  // ── 6 ────────────────────────────────────────────────────────────────────────
  {
    id: 'recognition',
    title: 'Recognition and rewards',
    blurb: 'XP, quests, shoutouts and the rewards you can spend points on.',
    topics: [
      {
        id: 'xp-and-levels',
        title: 'XP and levels',
        summary:
          'You earn XP for the things the company wants to see more of — finishing tasks, being on time, helping others. XP accumulates into levels, and points can be spent in the rewards shop.',
        where: 'People → Gamification',
      },
      {
        id: 'quests',
        title: 'Quest board',
        summary:
          'Optional pieces of work posted with a points value. Claim one, do it, and submit proof.',
        where: 'People → Gamification → Quest Board',
        procedures: [
          {
            title: 'Claim and complete a quest',
            steps: [
              'Open the Quest Board and pick something with slots left and time on the clock.',
              'Claim it — the slot is yours and others can see you took it.',
              'Do the work, then submit your proof for review.',
              'Points land once a reviewer accepts it.',
            ],
          },
        ],
        notes: [
          'Who claimed a quest is public. What they submitted as proof is not.',
          'A quest can cap how many people may claim it.',
        ],
      },
      {
        id: 'shoutouts',
        title: 'Shoutouts and badges',
        summary:
          'Public thank-yous to colleagues, and badges for milestones. Employee of the Month is announced to the whole company.',
        where: 'People → Gamification → Shoutouts',
      },
      {
        id: 'rewards',
        title: 'Rewards shop',
        summary:
          'Spend your points. Some rewards are pooled — a group clubs together and everyone contributes an equal share.',
        where: 'People → Gamification → Rewards Shop',
        procedures: [
          {
            title: 'Redeem a reward',
            steps: [
              'Open the Rewards Shop and pick something you have the points for.',
              'Redeem it. The request goes to whoever fulfils rewards.',
              'Track it under Points History until it is fulfilled.',
            ],
          },
          {
            title: 'Join a group reward',
            steps: [
              'Open a pooled reward and join the pool.',
              'Your share is reserved from your balance straight away.',
              'When the pool fills, the reward is redeemed for the group. If it is cancelled, every share is refunded.',
            ],
          },
        ],
      },
      {
        id: 'leaderboard',
        title: 'Leaderboard and points history',
        summary:
          'Where you stand this month, and a full ledger of every point earned or spent.',
        where: 'People → Gamification → Leaderboard',
      },
    ],
  },

  // ── 7 ────────────────────────────────────────────────────────────────────────
  {
    id: 'reviewing',
    title: 'Reviewing and approving',
    blurb: 'For leads and managers: the decisions that come to you.',
    roles: REVIEWER_ROLES,
    topics: [
      {
        id: 'approving-requests',
        title: 'Approving time-off requests',
        summary:
          'Leave, WFH, overtime and exception requests queue up with a count badge on the Attendance section until they are dealt with.',
        where: 'People → Attendance → Leave / WFH / Overtime / Exceptions',
        feature: 'can_approve_requests',
        procedures: [
          {
            title: 'Clear the queue',
            steps: [
              'Open the section carrying the badge.',
              'Review the request against the person’s record for that month.',
              'Approve or reject, with a note if you are rejecting.',
            ],
          },
        ],
        notes: ['Approving updates that person’s attendance for the day automatically.'],
      },
      {
        id: 'reviewing-work',
        title: 'Approving delivery work',
        summary:
          'Stages and tasks submitted for sign-off arrive as approval requests.',
        where: 'Delivery → Projects',
        feature: ['can_approve_tasks', 'can_manage_projects'],
        procedures: [
          {
            title: 'Review a submission',
            steps: [
              'Open the approval from your Inbox or from the project.',
              'Approve it, or request a revision with a note explaining what is needed.',
              'The person who submitted it is notified either way.',
            ],
          },
        ],
      },
      {
        id: 'standup-settings',
        title: 'Turning standups off',
        summary:
          'Now that the task timer records the day, standups can be switched off — for a whole role, or for one person.',
        where: 'Workspace → Standup → Settings',
        feature: 'can_manage_standups',
        procedures: [
          {
            title: 'Stop requiring standups',
            steps: [
              'Open Workspace → Standup → Settings.',
              'Turn off the requirement for each role that no longer needs it.',
              'For individual exceptions, set that person’s participation to Excluded — a per-person setting always beats the role default.',
            ],
          },
        ],
        notes: ['People who are excluded stop appearing on the team standup board and are never marked late.'],
      },
      {
        id: 'managing-people',
        title: 'Managing people',
        summary:
          'Invite new staff, set roles and designations, and deactivate people who leave.',
        where: 'People → People',
        feature: 'can_manage_people',
        procedures: [
          {
            title: 'Invite someone',
            steps: [
              'Open People → People and choose Invite.',
              'Enter their name, work email, role and designation.',
              'They receive an invite link that sets their own password.',
            ],
          },
          {
            title: 'When someone leaves',
            steps: [
              'Deactivate them from their row’s action menu.',
              'They lose access everywhere within seconds and disappear from rosters and pickers.',
              'Reassign anything still marked as theirs — projects they managed and tasks they held stay attached and are flagged “Left”, so nothing is quietly orphaned.',
            ],
          },
        ],
        notes: [
          'Their history stays intact on purpose: past attendance, completed tasks and old messages still show their name.',
          'If they had a fingerprint enrolled, free the terminal ID from Attendance → Terminals once the finger is deleted from the device.',
        ],
      },
    ],
  },

  // ── Business Development ─────────────────────────────────────────────────────
  // Gated on the same capability as the nav item and the route guard, so nobody
  // is shown instructions for a module they cannot open.
  {
    id: 'business-development',
    title: 'Business development',
    blurb: 'Working the pipeline: leads, outreach, meetings, campaigns and targets.',
    feature: 'can_view_bd',
    topics: [
      {
        id: 'bd-pipeline',
        title: 'Working the pipeline',
        summary:
          'Every prospect is a lead sitting at one of nine stages. Drag a card between columns to move it; the funnel, the channel report and your target all update from the same records, so there is nothing to reconcile afterwards.',
        where: 'Business Dev → Pipeline',
        feature: 'can_view_bd',
        procedures: [
          {
            title: 'Add a lead',
            steps: [
              'Press New Lead.',
              'Fill in the company and contact, and pick the channel it came from — the channel is what the outreach report is built on, so it is worth getting right.',
              'Set the estimated value and who owns it. Save.',
            ],
          },
          {
            title: 'Move a lead forward',
            steps: [
              'Drag its card to the next column, or open the lead and change Stage.',
              'Marking a lead Lost asks you for a reason before it commits — that reason is what makes the channel win-rate meaningful.',
              'Marking a lead Won offers to hand it to delivery straight away.',
            ],
          },
          {
            title: 'Keep notes on a prospect',
            steps: [
              'Open the lead and choose the Notes tab.',
              'Type as you would anywhere else in the portal: “/” for formatting, “@” to tag a colleague.',
              'Notes save when you click away — there is no Save button.',
            ],
          },
        ],
        notes: [
          'You can see the whole department’s pipeline but can only edit leads you own, unless you manage BD.',
          'Deleting a lead also removes its logged activity, which changes the outreach totals for that channel.',
          'Changes are saved as you make them. If one fails you get a toast and the screen puts itself back the way it was — nothing is left half-applied.',
        ],
      },
      {
        id: 'bd-comments',
        title: 'Discussing a lead, task or campaign',
        summary:
          'Leads, BD tasks and campaigns each carry a comment thread. Comments appear for everyone with the record open as they are posted, so two people working the same deal see one conversation.',
        where: 'Business Dev → any lead, task or campaign',
        feature: 'can_view_bd',
        procedures: [
          {
            title: 'Post a comment',
            steps: [
              'Open the record and go to its Comments tab (Discussion, on a campaign).',
              'Type “@” and a name to tag someone — they get a notification.',
              'Press Enter to send. Shift+Enter starts a new line instead.',
            ],
          },
          {
            title: 'Fix or remove your own comment',
            steps: [
              'Hover your comment and choose the pencil to edit it, or the bin to delete it.',
              'An edited comment is marked “edited” so the thread stays honest.',
            ],
          },
        ],
        notes: [
          'You can only edit your own comments. Whoever manages BD can delete anyone’s, but cannot edit them.',
          'Tagging the same person twice in one thread does not notify them twice.',
          'Anyone with BD access can be tagged, whether or not they are on the lead.',
        ],
      },
      {
        id: 'bd-outreach',
        title: 'Logging outreach',
        summary:
          'Every unit of effort is one record, whether it is a single call on a named prospect or twenty Upwork proposals. That is why the Outreach page and a lead’s own log can never disagree — they are two views of the same list.',
        where: 'Business Dev → Outreach',
        feature: 'can_view_bd',
        procedures: [
          {
            title: 'Log a batch of outreach',
            steps: [
              'Press Log outreach and choose the channel.',
              'Enter how many you sent and how many replied.',
              'Save. The channel’s totals and your own activity target move immediately.',
            ],
          },
          {
            title: 'Log a touchpoint on a named lead',
            steps: [
              'Open the lead and press Log activity.',
              'Pick what it was — call, email, message — and the outcome.',
              'Save. It joins the lead’s timeline and updates when it was last contacted.',
            ],
          },
        ],
        notes: [
          'Website and referral are treated as passive: nobody sends on them, so what you log there counts as enquiries received, not messages sent.',
          'The trend beside each channel compares this month against last month. A channel with no history last month shows no trend rather than a misleading jump.',
        ],
      },
      {
        id: 'bd-campaigns',
        title: 'Campaigns and BD tasks',
        summary:
          'A campaign is an outreach initiative that tasks hang off — the BD equivalent of a delivery project. Its board uses the same six columns as the delivery board.',
        where: 'Business Dev → Projects, Business Dev → Tasks',
        feature: 'can_view_bd',
        procedures: [
          {
            title: 'Start a campaign',
            steps: [
              'Open Business Dev → Projects and press New project.',
              'Name it, pick the channels it targets and who is on it.',
              'Open it and use the Brief tab to write down what it is going after.',
            ],
          },
          {
            title: 'Add work to it',
            steps: [
              'On the campaign’s Board tab, press Add task in the column you want it in.',
              'The task opens straight away — every field is edited in place, so there is no separate form.',
              'Drag cards between columns as the work moves.',
            ],
          },
        ],
        notes: [
          'A campaign’s progress bar is calculated from its tasks. There is no progress field to type into, because a typed number goes stale the moment a task moves.',
          'Assigning a task to someone notifies them.',
        ],
      },
      {
        id: 'bd-meetings',
        title: 'Client meetings',
        summary:
          'Meetings booked against a lead, with colleagues from anywhere in the company invited.',
        where: 'Business Dev → Meetings',
        feature: 'can_view_bd',
        procedures: [
          {
            title: 'Book a meeting',
            steps: [
              'Press New meeting and choose the lead it is about.',
              'Set the date, time and platform, and name who is attending from the client side.',
              'Paste the Zoom or Meet link into “Meeting link” so everyone can join from the card.',
              'Invite colleagues under “Invite colleagues” — anyone in the portal, not only BD.',
              'Save. Everyone you invited is notified in the portal and emailed a calendar invitation.',
            ],
          },
          {
            title: 'Record what came of it',
            steps: [
              'Open the meeting after it has happened.',
              'Write the outcome and the next step. Both show on the lead’s Meetings tab.',
            ],
          },
        ],
        notes: [
          'People you invite see the meeting under Workspace → My Meetings, even though they cannot open the BD module itself. They see the time, platform and who else is coming — nothing else about the deal.',
          'Only people newly added are emailed. Editing a meeting you already invited someone to does not send them a second invitation.',
          'Moving a meeting notifies everyone on it, and so does cancelling one that has not happened yet. Tidying up past meetings notifies nobody.',
          'The meeting link field appears for Zoom and Google Meet. Phone and in-person meetings have nothing to link to, so it is hidden.',
        ],
      },
      {
        id: 'bd-targets',
        title: 'Targets and performance',
        summary:
          'Revenue, outreach and meeting quotas per person for the month, measured against what the pipeline actually shows.',
        where: 'Business Dev → Performance',
        feature: 'can_view_bd',
        notes: [
          'Attainment is never typed in. Revenue counts closed-won deals, outreach counts what you logged, meetings counts what you hosted.',
          'The revenue chart books a deal to the month it closed, not the month the lead arrived — so a deal that took a quarter to land credits the right month.',
          'Everyone in BD can read the department’s numbers. Only whoever manages BD can set the quotas, so the Set targets button is not shown to reps.',
        ],
      },
      {
        id: 'bd-handoff',
        title: 'Handing a won deal to delivery',
        summary:
          'A won lead is passed to a project manager with the budget, the service and the context that was agreed.',
        where: 'Business Dev → Pipeline → the lead',
        feature: 'can_view_bd',
        procedures: [
          {
            title: 'Hand over',
            steps: [
              'Move the lead to Won — the handoff opens by itself.',
              'Choose the delivery service, name the project and confirm the budget.',
              'Pick the manager who will run it and add anything they need to know. Confirm.',
            ],
          },
        ],
        notes: [
          'The lead stays in BD history afterwards and shows what it became, so nothing disappears when it leaves the pipeline.',
          'The handoff is recorded on the lead’s timeline as well, alongside the calls and emails that got it there.',
        ],
      },
    ],
  },
]

/** Answers a capability question — supplied by the caller so this stays pure. */
type CanFn = (feature: string) => boolean

function passes(gate: DocGate, role: string | null | undefined, can: CanFn): boolean {
  if (gate.roles && !gate.roles.includes(role ?? '')) return false
  if (!gate.feature) return true
  // `Array.isArray` doesn't narrow a `readonly string[]` union member, so key off
  // the string case instead.
  return typeof gate.feature === 'string' ? can(gate.feature) : gate.feature.some(can)
}

/**
 * The handbook as this reader may see it. A chapter whose every topic is gated
 * away drops out entirely rather than leaving a heading with nothing under it.
 */
export function filterChapters(
  chapters: DocChapter[],
  role: string | null | undefined,
  can: CanFn,
): DocChapter[] {
  return chapters.flatMap((chapter) => {
    if (!passes(chapter, role, can)) return []
    const topics = chapter.topics.filter((topic) => passes(topic, role, can))
    return topics.length > 0 ? [{ ...chapter, topics }] : []
  })
}
