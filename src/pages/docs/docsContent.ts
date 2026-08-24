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
            title: 'Change your colour theme',
            steps: [
              'Open your avatar in the top bar and choose Profile.',
              'Scroll to Appearance.',
              'Pick a theme — the whole portal changes as soon as you click it.',
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
          'Your theme is yours alone. It follows your account to any device you sign in from, and changes nothing for anyone else.',
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
              'Open Workspace → Standup during the submission window. The top of the form shows how much of the day you have to account for.',
              'If you tracked time or moved tasks today, a banner offers to fill them in — press “Fill them in” and the rows appear, ready for their times and descriptions. Delete any that are wrong.',
              'Otherwise pick a project, then add a row for each task you worked on it — “Add another task on this project”.',
              'For work with no project behind it — an errand, an interview panel, a fire drill — press “Add other work” and give it a title of its own.',
              'Give each task the time it took and a description of what you actually did. Bold, italic, lists and links are available.',
              'Repeat with “Add another project” until the logged total matches the hours shown at the top.',
              'Submit. You can correct it for as long as the window stays open.',
            ],
          },
        ],
        notes: [
          'The hours you log have to add up to your working day exactly — the day less the lunch break. The bar at the top turns green when they match.',
          'Time off comes out of that total automatically. Half a day of leave, a late arrival or an approved trip out of the office each reduce what you owe, and overlapping ones are only counted once.',
          'An exception is unpaid time, so those hours are owed back. The day you take it, you write up less — but the same hours appear as make-up time, and you clear them by logging over the requirement on a later day. The form tells you how much is outstanding and how far you may go over.',
          'The tasks offered are the ones you ran a timer on, are assigned and in progress, or commented on today. Times are never guessed for you — the timer usually covers less than half a day, so a filled-in number would be wrong more often than right.',
          'Work with no project still counts towards your hours. “Other work” is time accounting only — it earns no XP and has nothing to do with quests.',
          'Each task needs a real description — the minimum length is set by your admins and the counter under the box shows how far off you are.',
          'Submitting before the on-time cutoff earns XP; after it, the entry is saved but marked late and earns nothing. The amount and the cutoff are both configurable.',
          'If your role or your account has been excluded, the page tells you no standup is expected today.',
        ],
      },
      {
        id: 'timesheet',
        title: 'Timesheet',
        summary:
          'Everybody’s day on one chart — who was due in, who turned up, who is on leave, and what the timer caught. Everyone you can see gets a row, whether or not they ever pressed start.',
        where: 'Delivery → Timesheet',
        feature: 'can_view_reports',
        procedures: [
          {
            title: 'See what a day looked like',
            steps: [
              'Open Delivery → Timesheet.',
              'Pick a date, or step back a day at a time with the arrows.',
              'Read the four tiles for the shape of the day: hours tracked, timers running, how many people have logged nothing, and how many are away.',
              'Hover any coloured block for the task, the project, the exact times and how long it ran. Hover the green line underneath for check-in and check-out.',
              'Export CSV gives you every person, their day, and every segment they tracked.',
            ],
          },
          {
            title: 'Find the people with nothing logged',
            steps: [
              'Set the filter to “No time logged”.',
              'The list narrows to people who were due in today and have no tracked time against them.',
              'Type a name in the search box to jump straight to one person.',
            ],
          },
        ],
        notes: [
          'Each row is two lanes. The upper lane is tracked time; the thin line underneath is the attendance record — green if they were on time, amber if late.',
          'The lighter band behind the bar is the hours that person was due in for, with the lunch break cut out of it. A personal start time or half a day of leave moves that band, so it is not the same window for everyone.',
          'Leave, holidays and days off are labelled on the bar rather than left blank — an empty bar on a day nobody was expected in is not a finding.',
          'An amber band is an approved late arrival, early departure or trip out of the office. Hover it for the reason.',
          'The scale is a twelve-hour clock running the whole day, midnight to midnight — it does not zoom to the working hours, so the same time sits in the same place on every row and on every date you open. On today, a red line marks the current time.',
          'Only tracked time is drawn on the upper lane. A gap means no timer was running — not necessarily that nobody was working, so read it as a record of tracking rather than of effort.',
          'You see your own day; leads and project managers see everyone who shares a team with them; admins and HR see everybody. The line under the page title tells you which of those applies to you.',
        ],
      },
      {
        id: 'backlog-reports',
        title: 'Backlog reports',
        summary:
          'Where the hours went, by project and by person, over any range you choose — with a CSV of whatever you are looking at.',
        where: 'Admin → Reports',
        feature: 'can_view_reports',
        procedures: [
          {
            title: 'Pull a backlog',
            steps: [
              'Open Admin → Reports and choose Project backlog or Employee backlog.',
              'Pick Today, This week, This month, or Custom for any range of dates.',
              'Search to narrow the table, then Export CSV to take it away.',
            ],
          },
        ],
        notes: [
          'Two clocks are shown side by side and never added together. Timer is time tracked against a task; Standup is what people wrote up at day’s end. They measure the same hours differently and often disagree.',
          'Click any row to open it in full — a project by the people who worked on it, a person by the projects they went to. Each of those screens has its own CSV export, and the range you were reading follows you across, so the link is worth sending to somebody.',
          'Under that summary sits the full task-by-task breakdown, with both clocks against every task, who it is assigned to and the estimate where one was set. It has its own CSV.',
          'A project’s breakdown also lists still-open tasks that recorded no time at all in the range — the thing you most want to spot. Use the button above the table to hide them.',
          'A row reading “Standup time with no task named” is real work: about two thirds of standup entries name a project and stop there. It is shown as its own line rather than shared out across the tasks, which would be guesswork, and it is why the task rows add up to the totals above them.',
          'A task somebody deleted still appears, struck through and marked, whenever time was logged against it. Its minutes are counted in the totals, so hiding it would make the breakdown disagree with the figures above it.',
          'Make-up is unpaid time from an approved exception that has not been worked back yet. It clears itself as the person logs over their requirement, and the CSV carries the unpaid, made-up and outstanding figures separately.',
          'Somebody who is not asked for a standup owes nothing, so their required hours read zero rather than a full month.',
          'The variance column is the point: a project showing far more standup time than timer time is being worked on without the timer running, and the reverse means work nobody wrote up.',
          'Money appears only where it already exists — a project’s budget, when one is set. There is no cost-per-hour anywhere in the portal, so no profit or margin is calculated.',
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
              'Choose the duration: a full day (or range of days), or half a day.',
              'For a half day, pick which half — first or second.',
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
          'On a first-half day off you are not due in until the second half starts, so your arrival is judged against that time plus the usual grace — coming in before it counts as on time, not late.',
          'A multi-day request is listed under every day it covers, so the team can see who is off on a given date. It is still one request: the Approve and Reject buttons appear only on its first day.',
          'A WFH request covers a date range, so a whole week away from the office is one request and one approval.',
          'A partial WFH day is not a day off: you work one half from home and the other half from the office, so check in as normal for the office half. Because it splits a single day, it cannot span a range.',
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
          'If you post quests, you edit and delete them from the board card itself — there is no separate list.',
          'Submitting proof notifies the reviewers, so nothing waits on somebody happening to look.',
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
        id: 'rewards-catalog',
        title: 'Running the rewards catalog',
        summary:
          'The catalog is edited from the shop itself, so you can see what everyone else sees while you change it. A reward can carry a picture.',
        where: 'People → Gamification → Rewards Shop',
        feature: 'can_govern_gamification',
        procedures: [
          {
            title: 'Add a reward',
            steps: [
              'Open the Rewards Shop and press Add Reward.',
              'Give it a name and a points cost. Turn on Group reward if several people should club together — the cost then means per person.',
              'Optionally upload a picture. JPG, PNG, WebP or GIF, up to 5 MB.',
              'Create it. It appears in the shop straight away.',
            ],
          },
          {
            title: 'Change or remove a picture',
            steps: [
              'In Manage Catalog below the shop, press the pencil on the reward.',
              'Use Replace to swap the picture, or Remove to go back to the plain gift icon.',
              'Save. The old file is deleted once the change is stored.',
            ],
          },
        ],
        notes: [
          'Disable takes a reward out of the shop but keeps it — use it for something seasonal instead of deleting it.',
          'Deleting a reward also deletes its picture. Redemptions already made are unaffected.',
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
        id: 'gamification-approvals',
        title: 'Gamification approvals',
        summary:
          'Everything waiting on you across gamification sits on one screen — quest proofs, shoutouts, and reward redemptions including group pools. The tab carries a count of what is yours to act on.',
        where: 'People → Gamification → Approvals',
        feature: ['can_govern_gamification', 'can_recognize', 'can_fulfill_payouts'],
        procedures: [
          {
            title: 'Clear the queue',
            steps: [
              'Open People → Gamification → Approvals.',
              'Work down the sections — you only see the queues you can act on.',
              'Approve or reject each item. You can attach a note explaining the decision.',
            ],
          },
        ],
        notes: [
          'Rejecting a redemption refunds the points; rejecting a group pool refunds every member.',
          'Approving a quest proof awards its points immediately.',
          'A red count beside Approvals in the sidebar tells you how many items are waiting on you — it counts only the queues you can act on.',
          'You are notified when quest proof is submitted, when somebody gives a shoutout, and when a reward is redeemed. Each notification opens this screen. Mute any of the three under Settings → Notifications.',
        ],
      },
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
        title: 'Standup rules and who submits',
        summary:
          'When the standup opens, what it is worth, how much has to be written, and which roles or people have to submit one.',
        where: 'Settings → Standup',
        feature: 'can_manage_standups',
        procedures: [
          {
            title: 'Change when the standup opens',
            steps: [
              'Open Settings → Standup.',
              'Choose “Minutes before the day ends” to have it follow the working day automatically, or “A fixed time” to pin it to the clock.',
              'Set the on-time window — how long after opening a standup still counts as on time.',
              'Save. The preview above each field shows the times your choices produce.',
            ],
          },
          {
            title: 'Change what a standup is worth, or how much must be written',
            steps: [
              'Set the XP for an on-time standup. Zero stops rewarding them.',
              'Set the minimum characters per task. It applies to each task on its own, not the whole standup.',
              'Leave “Require the full day to be accounted for” on to enforce the hours, or turn it off to show them as guidance only.',
            ],
          },
          {
            title: 'Stop requiring standups',
            steps: [
              'On the same screen, turn off the requirement for each role that no longer needs it.',
              'For individual exceptions, set that person’s participation to Excluded — a per-person setting always beats the role default.',
            ],
          },
        ],
        notes: [
          'People who are excluded stop appearing on the team standup board and are never marked late.',
          'The hours a standup must account for come from Settings → Attendance: the working day, less the lunch break. Change the break and every standup follows.',
          'A fixed opening time does not move when the working day does. The screen warns you when the two have drifted more than two hours apart.',
        ],
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
              'Add the website, country and city if you know them. The website accepts a bare domain; https:// is added for you.',
              'Under Social profiles, press Add profile and paste the link. The platform is recognised from the address, so there is nothing to pick.',
              'Save it, then open the lead and use its Documents tab to attach proposals and decks.',
              'Set the estimated value, pick the currency it was quoted in, and choose who owns it. Save.',
            ],
          },
          {
            title: 'Import a list of leads from a spreadsheet',
            steps: [
              'Press Import CSV, then Download sample CSV and open it in Excel or Google Sheets.',
              'Replace the example rows with yours, keeping the header row exactly as it is. Only the company column has to be filled in — every other column falls back to the same default the New Lead form uses.',
              'Save the sheet as CSV, then drop it on the Import CSV box.',
              'Check the preview, then press Import. Rows the portal could not read are listed with their line number and skipped — the rest still go in.',
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
            title: 'Put the cards in your own order',
            steps: [
              'Set Sort to Manual order — it is the default.',
              'Drag a card up or down within its column. The cards move aside and an empty slot follows the cursor, showing exactly where it will land.',
              'The order is saved for everyone, not just for you, and stays put until somebody moves it again.',
            ],
          },
          {
            title: 'Attach a proposal or a Google Doc',
            steps: [
              'Open the lead and choose the Documents tab.',
              'Drop a file on the upload box, or press Add link for something that lives in Drive.',
              'For a link, paste the address first — the title fills itself in from the document. Type over it if you would rather call it something else.',
              'Press the eye to preview. Google Docs, Sheets and Slides open inside the portal; so do PDFs, images and spreadsheets you have uploaded.',
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
          'Cards can only be dragged up and down under Manual order. Choose Highest value or any other sort and the column is arranged for you, so a placement would be thrown away — you can still drag a card to a different column.',
          'A new lead, and anything you import, goes to the top of its column rather than the bottom.',
          'Website, location, social profiles and documents show on the lead itself, under Services. Each section only appears once it has something in it, so a half-filled record is not a wall of dashes.',
          'Documents live on the saved lead, not in the New Lead form — a file has to belong to something before it can be uploaded.',
          'A title the portal cannot read usually means the document needs sign-in to open. Share it with the team, or type the title yourself.',
          'Documents on a lead are visible to everyone who can open Business Dev, and to nobody in the client portal. Only the lead’s owner and BD managers can add or remove them. There is no confidential setting here — unlike a project file, a lead document has only one audience.',
          'On import, list several social links in one cell separated by semicolons, and write a document as “Title | link”, again separated by semicolons for more than one.',
          'Quote a deal in whatever currency the client was given — every currency in use anywhere is in the list, and you can search it by country as well as by code, so typing “Denmark” finds the krone. The card keeps showing that currency, while the funnel, the channel report and your target convert it to PKR so the totals add up.',
          'Exchange rates refresh daily and the field shows the one it is using as you type. The rate is fixed onto the lead at the moment you save it, so a deal you priced last month is never quietly restated by today’s rate.',
          'On import, dates must be written as YYYY-MM-DD. 03/04/2026 is March in one country and April in the next, so the portal refuses it rather than guessing.',
          'An imported row whose Owner column names a colleague is filed to them. Leave that column empty and the lead is yours. A name that matches nobody in BD fails the row instead of quietly assigning it to you.',
          'Importing does not check for duplicates — it flags them. A company already in your pipeline is marked in the preview, and still imported if you go ahead.',
          'Last contacted stays blank until outreach is logged against the lead — it is not filled in when the lead is created. A card that has never been contacted says so instead of counting quiet days from the day it was filed.',
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
          {
            title: 'Put documents on a task',
            steps: [
              'Open the task and scroll to Documents.',
              'Drop a file in, or press Add document to paste a Google Doc, Sheet or Drive link.',
              'A pasted link fills in its own title where the page allows it — type one yourself if it does not.',
              'Press a document to preview it without leaving the task.',
            ],
          },
        ],
        notes: [
          'A campaign’s progress bar is calculated from its tasks. There is no progress field to type into, because a typed number goes stale the moment a task moves.',
          'Assigning a task to someone notifies them.',
          'Task documents work the same way as documents on a lead or on a delivery task, and are stored the same way: uploads are private, links open where they live. Anyone who can open Business Dev can read them; adding and removing is limited to the person the task is assigned to, whoever raised it, and anyone who runs BD.',
          'The Tasks screen opens on the whole team. Use the people picker beside the project filter to narrow it to your own work, or to one colleague.',
          'You can hand a campaign to a colleague by naming them as its owner — including at the moment you create it. It stays editable by you as well as by them, so setting up a campaign for someone else does not lock you out of it. The same goes for a lead.',
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
          'A won lead becomes a real project — client, services, starting pipelines and the people on each one — without anybody retyping it.',
        where: 'Business Dev → Pipeline → the lead',
        feature: 'can_view_bd',
        procedures: [
          {
            title: 'Hand over',
            steps: [
              'Move the lead to Won — the handoff opens by itself.',
              'Set the client first. Choose Existing client if you already work with them, or New client and check the name — it is prefilled from the lead, which often holds the deal name rather than the client’s.',
              'Name the project, pick the manager who will run it, and confirm the budget. Set a start date and deadline if they were agreed.',
              'Tick every service the deal covers. The services you sold are ticked for you — add or remove any.',
              'For each service, choose a starting pipeline and add the people who will work on it. Both can be left for the manager to do later.',
              'Add anything delivery needs to know, then press Hand off & create project.',
            ],
          },
        ],
        notes: [
          'Confirming builds the project immediately, with a service block for each service you ticked. It is in Projects for the manager and the team from that moment — you do not have to tell anyone to set it up.',
          'You do not need to add the client beforehand. Naming a new one creates it; naming one that already exists attaches to it instead, and the modal tells you which before you confirm.',
          'Two deals with the same client usually arrive under different lead names. Pick Existing client on the second one, or you will end up with the same account twice.',
          'Your notes become the project description, so what was promised in the negotiation is on the project rather than only in BD.',
          'Everything is created together or not at all. If the handoff fails you get told why, and no half-built project is left behind.',
          'The lead stays in BD history afterwards and shows what it became, so nothing disappears when it leaves the pipeline.',
          'The handoff is recorded on the lead’s timeline as well, alongside the calls and emails that got it there.',
          'Anyone who manages BD can hand a deal off — you do not need permission to manage projects, and handing off gives you no other access to Delivery.',
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
