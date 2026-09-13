import type { ChangelogRelease, DocChapter, DocGate } from '../../types'

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
          'You are invited by an admin, accounts cannot be self-created. The invite email carries a one-time link that sets your password.',
        where: 'Sign-in page',
        procedures: [
          {
            title: 'First sign-in',
            steps: [
              'Open the invite link from your email.',
              'Choose a password and confirm it.',
              'You land on My Day, already signed in.',
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
        procedures: [
          {
            title: 'Fold a section you do not use',
            steps: [
              'Hover the section heading, Workspace, Delivery, People or Admin, and press it.',
              'Press it again to bring the section back.',
            ],
          },
        ],
        notes: [
          'A folded section still shows a count if something inside it needs you, so folding can never hide work.',
          'Folding is remembered on that device only. Your other devices keep their own arrangement.',
          'Delivery is ordered the way a piece of work travels, clients, then projects, then tasks.',
          'Settings sits on its own below the divider at the very bottom, and stays there while the sections above scroll.',
          'Red count badges mark things waiting on you, unread chat, claimable quests, requests to approve.',
          'On a phone the same destinations live in the bottom bar and behind the “More” tab.',
          'The arrow beside the Linknbit logo opens this handbook and the changelog. A red dot on it means a release has shipped that you have not read; opening the changelog clears it.',
          'Pinned conversations show who or what they are: a channel by its name behind a #, a direct message by the other person’s picture. Pinned projects and tasks show the project they belong to, with the full name beside the menu when it is too long to fit.',
        ],
      },
      {
        id: 'whats-new',
        title: 'Keeping up with what changed',
        summary:
          'Every release, newest first, filtered to the parts that apply to you.',
        where: 'Sidebar → the arrow beside the logo → What’s new',
        procedures: [
          {
            title: 'Catch up on a release',
            steps: [
              'When a red dot appears on the arrow beside the logo, open it and choose What’s new.',
              'The newest release is at the top, marked Latest, with a summary of what it was about.',
              'The dot clears as soon as the page opens. Nothing else to press.',
            ],
          },
          {
            title: 'Tell everyone about a release',
            steps: [
              'Open What’s new and find the release.',
              'Press Announce beside its version number.',
              'Everyone still with the company is notified, with a link back to the release.',
            ],
            // Gated separately: the steps only exist for whoever holds the key.
          },
        ],
        notes: [
          'You only see the parts of a release that apply to you. A change to a screen your role cannot open is not listed at all, so nothing here describes something you cannot go and try.',
          'Version numbers are three parts. The last one moves for a release that only improved or fixed things, the middle one when something new arrived.',
          'A release can only be announced once, and afterwards the entry says how many people it reached.',
        ],
      },
      {
        id: 'install-app',
        title: 'Installing the app',
        summary:
          'The portal is installable. It runs in its own window, keeps you signed in, and can deliver push notifications.',
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
              'Pick a theme. The whole portal changes as soon as you click it.',
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
          'Push is granted per device, enabling it on your laptop does not enable it on your phone.',
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
        id: 'my-day',
        title: 'My Day',
        summary:
          'Where the portal opens: your meetings today, the work that is overdue or due, whatever is waiting on you, and who is out of the office.',
        where: 'Workspace → My Day',
        procedures: [
          {
            title: 'Start your day',
            steps: [
              'Check in from the card on the right. The same one as on the Attendance page.',
              'Read Meetings today. The next one still ahead of you is marked, with a Join link when there is one.',
              'Work down Your work: overdue first, then due today, then anything already underway.',
              'Press Start on a task to run its timer without leaving the page.',
              'Click a task title to open it in the side panel of its project, with the board still behind it.',
            ],
          },
        ],
        notes: [
          'Only your own open work is listed, tasks assigned to you, alone or alongside others. Finished and approved work drops off.',
          'A task with no due date only appears once you have moved it to In progress; otherwise the list would be your whole backlog.',
          'Each task carries its own status, priority, due date and counts of subtasks, comments and attachments, plus anyone it is shared with. The same details the board card shows.',
          'Overdue and Due today are flags for why a task is on today’s list. They sit beside the status, which is a different thing: a task can be In review and overdue at once.',
          'Standup appears here when the window is open, and says so once you have submitted.',
          'Out today shows the people you share a team with. Being on several teams widens it; HR and admins see the whole company. Press Roster for the full picture.',
          'Nothing on this page is a chart. Company-wide numbers live in Reports.',
        ],
      },
      {
        id: 'command-palette',
        title: 'Jumping anywhere',
        summary:
          'Press ⌘K (Ctrl+K on Windows) to search every screen you can open, plus your projects, people and tasks, then Enter to go there.',
        where: 'Anywhere in the portal',
        procedures: [
          {
            title: 'Go somewhere fast',
            steps: [
              'Press ⌘K, or click the search box at the top of the screen.',
              'Type a few letters of a screen, project, person or task.',
              'Move with the arrow keys and press Enter. Escape closes it.',
            ],
          },
        ],
        notes: [
          'With the box empty it lists every screen you can open, so it doubles as the full menu.',
          'It only ever offers screens your role can actually open. It reads the same list your sidebar does.',
          'Projects, people and tasks appear once you start typing, not before.',
        ],
      },
      {
        id: 'notifications',
        title: 'Notifications',
        summary:
          'Two things in one place: what is waiting on you to act, and every notification you have been sent.',
        where: 'Workspace → Notifications',
        procedures: [
          {
            title: 'Clear what is blocked on you',
            steps: [
              'Open Workspace → Notifications. It opens on Waiting on you.',
              'Work down the list. Each row opens the thing that needs you.',
              'Switch to All or Unread for notifications, which are news rather than work.',
            ],
          },
        ],
        notes: [
          'The number beside Notifications in the menu counts what is waiting on you, not unread notifications. It goes to zero by acting, not by reading. So no badge means nobody is blocked.',
          'A mention drops off Waiting on you as soon as you reply on that task, whether or not you ever opened it here. It stays under All as a record that it happened.',
          'Waiting on you gathers approvals in your queue, requests you can review, and mentions you have not replied to. You only ever see queues your role can act on.',
          'A mention counts as work because being tagged is a request for a reply. Other notifications do not.',
          'Clicking a notification takes you straight to the task, message or request it refers to.',
        ],
      },
      {
        id: 'pinned',
        title: 'Pinning what you use',
        summary:
          'Put the handful of screens you open every day at the top of the menu, above the sections.',
        where: 'Any screen, top right',
        procedures: [
          {
            title: 'Pin a screen',
            steps: [
              'Hover any row in the menu and press the pin that appears on it, sections and their sub-pages both.',
              'Or open any other screen. A project, a chat channel, and press the pin button in the top right.',
              'It appears under Pinned at the top of the menu. Hover it there and press × to remove it.',
            ],
          },
        ],
        notes: [
          'Pins are yours alone. Nobody else sees them, and no two people need the same menu order.',
          'The Pinned section only exists once you have pinned something.',
        ],
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
          'You see only your own meetings here, and only the time, platform and who else is coming, never the deal behind them.',
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
              'Turn on Mute. You stay a member but stop being notified.',
            ],
          },
        ],
        notes: [
          'Some channels are private; you will only see them if you have been added.',
          'A channel has managers rather than an owner. Any number of people can hold it, so a channel never becomes unmanageable because somebody left. Managers rename it, move it between headings, choose who can post, and add or remove people.',
          'A channel can be set so only its managers post, which turns it into an announcement channel. Everyone else still reads and reacts. Direct messages ignore this: both people always post.',
          'To rename a channel heading, hover it in the conversation list and press the pencil beside it. The bin next to it removes the heading only, and its channels move to Uncategorised.',
          'Everything else about a channel is behind Settings in its info panel: its name, which heading it sits under, who can post, who manages it, and who is in it.',
          'Reply to a particular message with the arrow that appears when you hover it. Your reply carries a quote of theirs, and pressing the quote jumps to the original. A reply to a picture shows the picture in the quote.',
          'Paste an image straight into the message box — a screenshot, or something copied from a web page. It appears at full size above the box so you can check it before it goes, and you can type a message to send with it.',
          'You get one reaction per message. Picking a different emoji moves yours rather than adding a second, and pressing your own takes it off. Hover a reaction to see who picked it; on a phone, press and hold it.',
          'Deleting a message takes its reactions with it.',
          'Conversations are ordered by whatever happened in them last, so a new message or reaction moves that conversation to the top of the list.',
          'When the last thing to happen was a reaction, the list says so — "Ghayas reacted 👍 to your message" — rather than leaving the row on a message nobody has touched since.',
          'Anything typed and not sent is kept while you are in the portal. Once you move to another conversation, the one you left shows "Draft:" and the text in the list, so an unfinished message is easy to find your way back to. It is not kept across a reload.',
          'A message that tags you, tags a team you are on, or carries an @everyone is banded in amber so you can find it scrolling back, not only when the notification arrives.',
          'The date is said once, on a divider between the days, and it stays pinned to the top as you scroll — so a long scroll back always tells you which day you are in. Each message carries only its time; hover it for the full date.',
          'Drag a message to the right to reply to it — swipe it on a phone or tablet, or drag it with the mouse on a computer. A reply arrow appears as you go and turns red once you have gone far enough; let go there, and the message box is ready to type in. The arrow that appears when you hover a message does the same thing.',
          'Messages sit in their own container. Yours run down the right in the brand colour, everybody else\'s down the left, with the time in the bottom corner of each one.',
          'Your own messages carry a tick, in the bottom-right corner of the message. A clock means it is still going, one grey tick means sent, two grey means some of the room has read it, two coloured means everybody has. Hover a tick to see who.',
          'In a direct message there is only one other person, so it goes from one tick to two coloured. In a channel the two grey ticks tell you it has reached some people without claiming it reached all of them.',
          'Ticks turn as soon as somebody opens the conversation, without refreshing and without waiting for them to reply.',
          'The conversation list carries the same tick, in front of the preview, whenever the last message in that conversation was yours — so you can see what is still waiting on somebody without opening it.',
          'A conversation you have read can be marked unread again from its menu, for when you cannot deal with it yet.',
          'Type @ and a team name to tag a whole team. Teams are listed in their service colour, so Design, Development and Marketing are recognisable before you read the name. Only some roles may tag one; for everyone else the text still appears but reaches nobody.',
          'Deleting a message deletes the files attached to it, and they leave the Files panel with it. The message itself stays as a note that something was removed.',
          'Removing a file from the message box before you send cancels it, even mid-upload.',
        ],
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
          'A project belongs to a client and runs one or more services, Design, Development or Marketing. Each service has its own stages, its own tasks and its own people, so a designer never wades through the development pipeline.',
        where: 'Delivery → Projects',
        notes: [
          'The service switcher at the top of a project changes everything below it.',
          'You are staffed onto a service, not onto the project as a whole.',
          'Being given a task adds you to its service, so a project’s Team tab fills itself as work is handed out. Taking somebody off a service takes them off its tasks as well — you are told how many first — and their comments stay where they are.',
          'Inside a project, Board and Pipeline are two views of the same tasks: Board groups them by status, Pipeline by the stage of the service they belong to.',
          'The Projects list itself has no board. Table and Backlog are ways of finding a project; moving one along is done inside it. On a phone the table is drawn as cards, because eight columns do not fit.',
        ],
      },
      {
        id: 'working-a-task',
        title: 'Working a task',
        summary:
          'A task carries its status, priority, assignees, reviewers, estimate, subtasks, comments, files and full activity history.',
        where: 'Delivery → Tasks, or from inside a project',
        procedures: [
          {
            title: 'Move a task forward',
            steps: [
              'Open the task from the board, the list, or My Day. It opens in a side panel over its project, wherever you came from.',
              'Change its status. The columns are whatever your admins have set up on Settings → Task statuses.',
              'Tick off subtasks as you finish them; the progress bar follows.',
              'Leave a comment to bring someone in, using @ to notify them.',
              'Name a reviewer if somebody has to check it. They are notified the moment it moves to Review.',
            ],
          },
          {
            title: 'Ask for approval',
            steps: [
              'Open the stage or task that is ready to be signed off.',
              'Request approval. The reviewer is notified.',
              'They respond with Approved, Revision requested, or Rejected. A revision comes back with a note, not a dead end.',
            ],
          },
        ],
        notes: [
          'Files and tasks carry a client-visible switch. When it is off, the client portal never shows the item.',
          'Deleting a project or a task is permanent. Everything under it goes with it — tasks, comments, files, stages, subtasks, staffing, and the hours logged against the work. There is no archive and nothing to restore from, so download anything worth keeping first.',
          'Logged time is the one to watch. Hours recorded against a task leave the timesheet when the task does, so a month that has already been reported on will read differently afterwards.',
          'The confirmation counts what will go before you press it, logged time included. If a number looks wrong, that is the moment to stop.',
          'Watch a task to be notified about it even when it is not assigned to you.',
          'Reviewers work like assignees: a task can have several, and a reviewer can open the task they are reviewing whether or not it is theirs.',
          'Reviewers are notified when a card is dragged into whichever column is marked as the review column on Settings → Task statuses. It follows the marker, not the word, so a column called QA or Client sign-off works the same.',
          'You can assign or name a reviewer who is not staffed on the service yet. Choosing them adds them to it, the same way choosing a service the project does not run adds the service. This holds wherever you pick them: while writing the task, or later from the task itself.',
          'The service, assignee and reviewer lists are each split under two headings — what is already part of the project or service, and what picking will add to it. Anything under the second heading is a real choice, not a warning; it simply does one more thing when you save.',
          'A new task opens on the default column and can be saved as it stands; the status picker is there for starting one somewhere else.',
          'The description box is the same whether you are creating a task or editing one. Type / for formatting commands and @ to tag someone; a person tagged while the task is being created is notified once it is saved.',
        ],
      },
      {
        id: 'scope-switch',
        title: 'Mine, my team, or everyone',
        summary:
          'A switch on the projects and tasks screens that decides whose work they are showing. How far it goes depends on what you have been given. It stays put as you move between screens.',
        where: 'Delivery → Projects or Tasks, in the filter row',
        procedures: [
          {
            title: 'Narrow a board to your own work',
            steps: [
              'Open Delivery → Tasks or Delivery → Projects.',
              'Press Mine in the switch above the list.',
              'Press the widest option you have to open it up again, or use the link on the banner.',
            ],
          },
        ],
        notes: [
          'How wide the switch goes depends on what your roles allow, not on what any one of them is called. If you work on tasks, you see the ones assigned to you, and there is no switch to show. That is simply what the screen is.',
          'My team is wider than "assigned to a teammate". It also holds every task in a service block you or a teammate are staffed on, whether or not anybody is on it yet. A lead therefore sees the whole of their own block, including work still waiting to be handed out.',
          'Managing a project is separate from all of this. Whoever manages a project sees every task in it, across every service, and that holds for an admin or a team lead named as a manager just as much as for a project manager.',
          'Anything you raised yourself stays under Mine even before it is assigned to anybody, so a task does not vanish the moment you save it.',
          'A team means anyone who shares a team with you, including yourself. Someone on several teams counts on all of them, so joining another team widens what you see.',
          'This is not only what the screen shows: work that is not yours is not sent to your browser at all, and a link to it opens a page saying it is unavailable.',
          'Unassigned work stays visible to team leads and project managers on the project, so a backlog can still be handed out.',
          'Mine also keeps tasks that merely tag you, since being mentioned is how work often reaches you before it is formally assigned. Opening one still needs it to be assigned to you.',
          'A banner across the top says which lens is on and how many rows it hid, so a nearly empty board is never a mystery. It stays quiet when the lens is already as wide as yours goes.',
          'The switch only appears on the screens it affects, and is remembered per device.',
        ],
      },
      {
        id: 'time-tracking',
        title: 'Tracking your time',
        summary:
          'Start a timer on the task you are working on and stop it when you move on. This is now how you report your day. It has replaced writing a daily standup.',
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
              'Enter how long, “45m” or “1h 30m” both work.',
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
          'The written standup, what you did, how long it took, and anything blocking you. Superseded by the task timer, and switched off per role or per person from Standup → Settings.',
        where: 'Workspace → Standup',
        roles: DELIVERY_ROLES,
        procedures: [
          {
            title: 'Submit one (while it is still required of you)',
            steps: [
              'Open Workspace → Standup during the submission window. The top of the form shows how much of the day you have to account for.',
              'If you tracked time or moved tasks today, a banner offers to fill them in. Press “Fill them in” and the rows appear, with the time already in for anything you ran a timer on. Delete any that are wrong.',
              'Otherwise pick a project, then add a row for each task you worked on it, “Add another task on this project”.',
              'For hours with no project behind them, a meeting, an office quest, onboarding, or a stretch with nothing assigned, press “Add time with no project”. Pick one of the suggested titles or type your own. If your first card is still empty, “This was not project work” turns it into one of these.',
              'Give each task the time it took and a description of what you actually did. Bold, italic, lists and links are available.',
              'When only the last stretch is missing, press the “+ 2h 15m left” link beside any Time spent box to put the whole remainder on that row.',
              'Repeat with “Add another project” until the logged total matches the hours shown at the top.',
              'Submit. You can correct it for as long as the window stays open.',
            ],
          },
        ],
        notes: [
          'The hours you log have to add up to your working day exactly. The day less the lunch break. The bar at the top turns green when they match.',
          'Time off comes out of that total automatically. Half a day of leave, a late arrival or an approved trip out of the office each reduce what you owe, and overlapping ones are only counted once.',
          'An exception is unpaid time, so those hours are owed back. The day you take it, you write up less. But the same hours appear as make-up time, and you clear them by logging over the requirement on a later day. The form tells you how much is outstanding and how far you may go over.',
          'The tasks offered are the ones you ran a timer on, are assigned and in progress, or commented on today. Only the timed ones arrive with a duration, because only those were measured. A task sitting in progress says nothing about how long you spent on it today, so its box is left empty for you.',
          'The timer usually covers less than half a day, so what it fills in is a head start on your total, not your total. Check it.',
          'Work with no project still counts towards your hours. Time with no project is time accounting only. It earns no XP and has nothing to do with quests, including the hour you spend on an office quest.',
          'Each task needs a real description. The minimum length is set by your admins and the counter under the box shows how far off you are.',
          'Submitting before the on-time cutoff earns XP; after it, the entry is saved but marked late and earns nothing. The amount and the cutoff are both configurable.',
          'If your role or your account has been excluded, the page tells you no standup is expected today.',
        ],
      },
      {
        id: 'timesheet',
        title: 'Timesheet',
        summary:
          'Everybody’s day on one chart, who was due in, who turned up, who is on leave, and what the timer caught. Everyone you can see gets a row, whether or not they ever pressed start.',
        where: 'Delivery → Reports → Timesheet',
        feature: 'can_view_reports',
        procedures: [
          {
            title: 'See what a day looked like',
            steps: [
              'Open Delivery → Reports and pick the Timesheet tab.',
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
          'Each row is two lanes. The upper lane is tracked time; the thin line underneath is the attendance record, green if they were on time, amber if late.',
          'The lighter band behind the bar is the hours that person was due in for, with the lunch break cut out of it. A personal start time or half a day of leave moves that band, so it is not the same window for everyone.',
          'Leave, holidays and days off are labelled on the bar rather than left blank. An empty bar on a day nobody was expected in is not a finding.',
          'An amber band is an approved late arrival, early departure or trip out of the office. Hover it for the reason.',
          'The scale is a twelve-hour clock running the whole day, midnight to midnight. It does not zoom to the working hours, so the same time sits in the same place on every row and on every date you open. On today, a red line marks the current time.',
          'Only tracked time is drawn on the upper lane. A gap means no timer was running, not necessarily that nobody was working, so read it as a record of tracking rather than of effort.',
          'You see your own day; leads and project managers see everyone who shares a team with them; admins and HR see everybody. The line under the page title tells you which of those applies to you.',
        ],
      },
      {
        id: 'backlog-reports',
        title: 'Backlog reports',
        summary:
          'Where the hours went, by project and by person, over any range you choose, with a CSV of whatever you are looking at.',
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
          'Click any row to open it in full. A project by the people who worked on it, a person by the projects they went to. Each of those screens has its own CSV export, and the range you were reading follows you across, so the link is worth sending to somebody.',
          'Under that summary sits the full task-by-task breakdown, with both clocks against every task, who it is assigned to and the estimate where one was set. It has its own CSV.',
          'A project’s breakdown also lists still-open tasks that recorded no time at all in the range. The thing you most want to spot. Use the button above the table to hide them.',
          'A row reading “Standup time with no task named” is real work: about two thirds of standup entries name a project and stop there. It is shown as its own line rather than shared out across the tasks, which would be guesswork, and it is why the task rows add up to the totals above them.',
          'A task somebody deleted still appears, struck through and marked, whenever time was logged against it. Its minutes are counted in the totals, so hiding it would make the breakdown disagree with the figures above it.',
          'Make-up is unpaid time from an approved exception that has not been worked back yet. It clears itself as the person logs over their requirement, and the CSV carries the unpaid, made-up and outstanding figures separately.',
          'Somebody who is not asked for a standup owes nothing, so their required hours read zero rather than a full month.',
          'The variance column is the point: a project showing far more standup time than timer time is being worked on without the timer running, and the reverse means work nobody wrote up.',
          'Money appears only where it already exists. A project’s budget, when one is set. There is no cost-per-hour anywhere in the portal, so no profit or margin is calculated.',
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
        id: 'today',
        title: 'Who is working today',
        summary:
          'One roster for the whole company on any date, who is in the office, who is working from home, who is off, and who has not checked in yet.',
        where: 'People → Attendance → Today',
        procedures: [
          {
            title: 'See who is in',
            steps: [
              'Open People → Attendance. Today is the first tab.',
              'Read the four counters for the shape of the day: in office, work from home, on leave, not checked in.',
              'Press By team to regroup the list by team instead of by status.',
              'If you lead a team, it is listed first and marked Your team.',
              'Scroll: the group heading you are inside stays pinned under the top bar, so it is always clear whose column you are reading.',
            ],
          },
          {
            title: 'Check another date',
            steps: [
              'Pick the date you want from the date box.',
              'Press Today at the foot of that same date box to come back.',
            ],
          },
        ],
        notes: [
          'A public holiday or a company-wide work-from-home day is announced in a banner across the top, and everyone is marked accordingly.',
          'Weekends show as a non-working day rather than reporting the whole company as missing. Somebody whose working days differ from the company’s is judged against their own week, so a Saturday they work counts and a Tuesday they do not is not held against them.',
          'You always see everyone’s status. Check-in times, the late flag and which kind of leave someone took are shown only for yourself, for people on your teams, and to whoever manages attendance.',
          'The roster refreshes on its own about once a minute, so it can be left open.',
          'People excluded from attendance tracking are left out entirely, counting them would make the numbers wrong.',
        ],
      },
      {
        id: 'working-days',
        title: 'Working days that are not Monday to Friday',
        summary:
          'Most people follow the company calendar. Somebody who works weekends, or a fixed week of their own, is given their own working days so that check-in, standup and the absence count all follow it.',
        where: 'People → open a person → Working days',
        feature: 'can_manage_people',
        procedures: [
          {
            title: 'Give somebody their own week',
            steps: [
              'Open People, find the person and press Edit.',
              'Under Working days choose Specific days, then tick the days they work.',
              'Save. They can now check in and file a standup on exactly those days.',
            ],
          },
          {
            title: 'Set somebody to flexible hours',
            steps: [
              'Open the person and set Working days to Flexible (any day).',
              'Save. They can check in and file a standup on any day that is not a public holiday, and are never marked absent.',
            ],
          },
        ],
        notes: [
          'Working days and Job type answer different questions and are set separately. Job type says where somebody works from and drives the office-network and timing rules; working days say which days they work. A hybrid employee can keep the company week or have their own.',
          'Public holidays apply to everybody in every mode. Nobody is expected in on one.',
          'Flexible is the setting for somebody whose days genuinely vary. Because no particular day was promised, the nightly absence check skips them — use Specific days if you do want a missed day to show.',
          'Leave is counted in the person’s own working days, so a week off costs them the days they actually work.',
        ],
      },
      {
        id: 'records',
        title: 'The attendance register',
        summary:
          'Every recorded day over any span — a day, a week, a month or two dates you pick — with where each record came from, and a per-person roll-up of it.',
        where: 'People → Attendance → Records',
        feature: 'can_manage_attendance',
        procedures: [
          {
            title: 'Look at a span',
            steps: [
              'Open People → Attendance → Records.',
              'Pick Day, Week, Month or Custom. The arrows either side step by whatever you picked; Custom takes two dates instead.',
              'Switching between Day, Week and Month keeps the date you were on and widens around it, so you never lose your place.',
            ],
          },
          {
            title: 'Narrow it down',
            steps: [
              'Press a counter — Present, Late, Absent, Half Day, Leave — to show only those. Press it again to clear it.',
              'Press Filters for team, employee, kind of day, and how the record was made (self check-in, biometric terminal, or entered by an admin).',
              'Turn on Flagged only to see check-ins from a device the terminal could not vouch for.',
              'Search by name on the toolbar for one person quickly.',
            ],
          },
          {
            title: 'See it per person',
            steps: [
              'Choose a span longer than a day. The Records / By person switch appears.',
              'Slide it to By person. Each person becomes one row with their days present, late, absent, half, on leave and working from home.',
              'It opens on most late days first. Press any column heading to sort by it, and again to reverse.',
            ],
          },
          {
            title: 'Read a span day by day',
            steps: [
              'Pick a span longer than a day, then turn on Group by day in the Filters panel.',
              'The records are listed under a heading per date, which stays pinned as you scroll past it. The Date column goes, since the heading says it.',
              'Press the date in a heading to run the days the other way round, newest first or oldest first.',
              'Sorting on any other column orders the records within each day, so you can ask for the latest arrivals on each date.',
            ],
          },
          {
            title: 'Correct a record',
            steps: [
              'Find the day and press the pencil on its row.',
              'Change the status, the check-in time, or add a note saying why.',
              'Press Mark attendance instead to record a day that has nothing against it at all.',
            ],
          },
        ],
        notes: [
          'Every counter is a whole number of days, and each one counts exactly what pressing it lists. Somebody who worked a half day is one present day and one half day, because both are true of it — so the counters do not add up to the days covered, and are not meant to.',
          'The counters do not narrow each other. They are a breakdown of the span into five slices, so pressing Leave changes what is listed without sending Present to zero. Filtering by team, person or search does move them, because that changes which rows are being broken down.',
          'Export gives you what is on screen rather than the whole span.',
          'On a phone the columns become cards and the sort moves to a control above the list, so nothing is desktop-only.',
          'Somebody who has been deactivated does not appear here at all, and is not counted. Their days stay in the record; they are read on their own profile page.',
          'This is the register, not the roster. Today shows everybody expected in, including people with nothing recorded yet. Records shows what was actually written down, and is the only place to change it.',
        ],
      },
      {
        id: 'admin-console',
        title: 'Terminals, devices and the working calendar',
        summary:
          'The administrative side of attendance, fingerprint terminals, the devices people check in from, and the public holidays and working Saturdays that define the year.',
        where: 'Admin',
        feature: 'can_manage_attendance',
        procedures: [
          {
            title: 'Approve a new device',
            steps: [
              'Open Admin → Enrolled Devices.',
              'Find the device waiting for approval. The count on the Admin row in the menu is how many.',
              'Approve it, or deactivate one that should no longer be used.',
            ],
          },
          {
            title: 'Set up the year',
            steps: [
              'Open Admin → Schedule & holidays.',
              'Add public holidays and company off days, singly or as a range.',
              'Mark any Saturday that is being worked, and any company-wide work-from-home day.',
            ],
          },
        ],
        notes: [
          'These used to sit inside the Attendance menu. They are administration, not daily work, so they now live behind Admin along with the audit log.',
          'The rules themselves, working hours, grace period, office network, are configuration and live in Settings → Attendance.',
        ],
      },
      {
        id: 'attendance-calendar',
        title: 'The month ahead',
        summary:
          'The whole company\u2019s month at a glance: public holidays, company off days, working Saturdays, who is away on which day and for how much of it, and what is still waiting on a decision.',
        where: 'People → Attendance → Calendar',
        procedures: [
          {
            title: 'Find a day that works',
            steps: [
              'Open People → Attendance → Calendar.',
              'Read the counts on each cell: full days off, half days, people working from home, and how many requests for that day are still undecided.',
              'Press a day to see exactly who, and how much of the day each one covers.',
            ],
          },
          {
            title: 'Check coverage before approving time off',
            steps: [
              'Find the day the request covers.',
              'Anything marked Awaiting approval is not settled yet \u2014 including, usually, the request you are about to decide.',
              'Press the day to see who is already away, so you are not approving the third person off the same Thursday.',
            ],
          },
        ],
        notes: [
          'Everybody can see who is away, on any day of the month. Knowing that a colleague is off on the 14th is what the calendar is for, and having to ask in chat was the thing it was built to stop.',
          'Why somebody is away is not shown to everybody. The kind of leave \u2014 sick, annual, bereavement \u2014 is named only for yourself, for people you share a team with, and for whoever manages attendance. Everyone else sees Away and how much of the day it covers.',
          'Exceptions \u2014 late arrival, early departure, out of office \u2014 are shown on the same footing: your own, your team\u2019s, and everyone\u2019s if you manage attendance. They are a record of somebody\u2019s day rather than a plan, so they are not company-wide.',
          'Requests still waiting on a decision appear with a dashed mark and are counted separately, never folded into the approved ones. A day that reads \u201c3 off\u201d means three agreed absences; anything undecided is counted beside it, and listed last when you open the day.',
          'Half days are counted apart from full days, so \u201c3 off\u201d always means three people who are gone for the whole day.',
          'On a phone the cell shows a coloured dot per kind rather than the counts, and holiday names are left to the day panel \u2014 a phone cell is too narrow for either. Press the day for the full picture.',
          'In the day list, every leave says whether it is a full day, the first half or the second half. A partial work-from-home says the same, and means the other half is worked from the office.',
          'Holidays are shaded and named in the cell, so you can see a long weekend coming without opening anything.',
          'Working Saturdays are labelled; every other Saturday and Sunday is shaded as a non-working day.',
          'People who have left the company are not shown.',
        ],
      },
      {
        id: 'check-in',
        title: 'Checking in and out',
        summary:
          'On-site staff use the fingerprint terminal, or the portal button while on the office WiFi. Hybrid, remote and work-from-home days are marked in the portal.',
        where: 'People → Attendance',
        procedures: [
          {
            title: 'Check in at the office',
            steps: [
              'Put your finger on the terminal on your way in.',
              'The portal picks the punch up on its own. There is nothing to press.',
              'Or, if you are on the office WiFi, open People → Attendance and press Check in instead.',
            ],
          },
          {
            title: 'Check in on a work-from-home day',
            steps: [
              'Open People → Attendance once your WFH day has been approved.',
              'Press Check In (WFH). No office WiFi and no terminal are needed.',
              'Your hours are recorded against the day exactly as an office day.',
            ],
          },
        ],
        notes: [
          'You only ever check in. The end of your day is filled in for you. There is no Check out button.',
          'The office WiFi stands in for the terminal: on it, the portal button is offered even while the terminal is working. Off it, on-site staff are sent to the terminal.',
          'The on-site check-in button reappears automatically if the terminal is offline, so a broken device never costs you a day.',
          'Arriving after your allowed start time is recorded as late; the allowance can be adjusted per person.',
          'The portal decides the time from the server clock, never your device’s.',
        ],
      },
      {
        id: 'requests',
        title: 'Leave, WFH, overtime and corrections',
        summary:
          'Four request types, all with the same shape: you submit, someone with the authority reviews, and you are notified of the outcome. They share one queue.',
        where: 'People → Attendance → Requests',
        procedures: [
          {
            title: 'Request time off, a remote day, overtime or a correction',
            steps: [
              'Open People → Attendance → Requests and press New request.',
              'Pick the kind along the top: Leave, WFH, Exception or Overtime.',
              'Choose the duration: a full day (or range of days), or half a day. For a half day, pick which half, first or second.',
              'Add a reason and press Submit for approval.',
            ],
          },
          {
            title: 'Check how much leave you have left',
            steps: [
              'Open People → Attendance → Requests and press New request.',
              'Stay on the Leave tab. Each kind of leave is listed with the days remaining out of your allowance.',
              'The type dropdown repeats the figure for whichever type you pick, so you can see whether the request fits before you submit it.',
            ],
          },
          {
            title: 'Change or withdraw a request',
            steps: [
              'Find it in Requests. It has to still be pending — once it is decided, ask whoever manages attendance.',
              'Press Edit to change the dates, the times or the reason. It stays pending and the approver sees the new version.',
              'Press Withdraw to take it off the queue altogether, then confirm.',
            ],
          },
          {
            title: 'Work through what is waiting',
            steps: [
              'Open People → Attendance → Requests. It opens on Pending for this month, with the number still to decide on the tab.',
              'Press Filters to narrow by type, by employee or by period. The panel opens on the right on a computer and slides up from the bottom on a phone, where you can drag it away when you are done.',
              'Turn on Group by day in the same panel to read the queue as a calendar instead of a list: a heading per date, with everything covering that date underneath it.',
              'Slide the period switch to All months to see everything still outstanding, including anything filed for a month ahead. The month picker appears only when One month is chosen.',
              'Search on the toolbar for a name or a reason when you are after one request rather than the whole queue.',
              'Press Approve or Reject on the row. The list updates in place.',
            ],
          },
          {
            title: 'Take one day out of a longer request',
            steps: [
              'Find the leave or WFH request in the queue. It needs to cover more than one day.',
              'Press Days. Every day the request covers is listed.',
              'Press the day you want to drop, then press it again to confirm.',
            ],
          },
          {
            title: 'Fix a wrong attendance record',
            steps: [
              'Raise an Exception request for the day in question.',
              'Say what actually happened. A missed check-out, a terminal that did not read your finger.',
              'It is reviewed and the day is corrected on approval.',
            ],
          },
        ],
        notes: [
          'Leave, WFH, overtime and exceptions all queue up together. The type list inside Filters carries each kind’s pending count, so you can see where the backlog is without opening each one.',
          'The queue opens on Pending if you review requests, and on All if you do not \u2014 somebody reading their own record wants the whole of it, not only what is undecided.',
          'The tabs are the only thing that changes which slice you are looking at — Pending, Approved, Rejected, All. Everything in the Filters panel — type, employee, period — narrows whatever the tab is showing rather than replacing it, and Clear all in the panel puts it back.',
          'The queue opens on the current month, so a request dated for next month is not in the first list you see. The Filters button carries a count of how many filters are narrowing the queue, and the period is one of them — if something you expected is missing, that count is where to look.',
          'Leave balances count approved leave taken this calendar year. A pending request has not been deducted yet.',
          'Filing leave for somebody else shows their balances, not yours.',
          'A leave range that starts in one month and ends in the next shows under both, so a week off over a month boundary is never missing from the month you are looking at.',
          'You only ever see your own requests here, plus anyone whose requests you review. Nobody sees a colleague’s leave unless it is their job to decide on it.',
          'New request is the same button for everybody. Whoever manages attendance also gets a "Who is this for" field inside it, which opens on themselves — one button files your own leave and somebody else\u2019s.',
          'Whether an entry for somebody else applies at once or waits for approval depends on one thing: whether the person entering it is allowed to record attendance without approval. If they are, it takes effect immediately, for all four kinds. If not, it joins the queue. The panel says which of the two is about to happen before you submit.',
          'A request for yourself always waits for approval, whatever you are allowed to do for other people. Nobody records their own attendance.',
          'You cannot decide on a request you filed for somebody else, any more than on your own. It shows as "Waiting on someone else" in your queue, and another approver picks it up. The point is that putting a request in and waving it through are two people.',
          'Filing one for somebody notifies everyone who can approve it, naming you: "Mahnoor added leave for Yasir". Nothing you enter sits in a queue nobody has been told about.',
          'The count on the Attendance row in the sidebar is what is waiting on you, not what is waiting. A request you filed is not counted there — you are the one person who cannot clear it — so a zero means nothing is stuck on you, and a number means it is yours to act on.',
          'A request somebody filed on another person\u2019s behalf carries a red "Added by ‹name›" chip in the queue, beside the type. No chip means the person raised it themselves. Nothing lands on your record with no name against it.',
          'Searching the queue matches whoever filed a request as well as whose it is, so typing an HR person\u2019s name lists everything they entered.',
          'An approved leave or WFH day updates your attendance record for that day automatically.',
          'On a first-half day off you are not due in until the second half starts, so your arrival is judged against that time plus the usual grace, coming in before it counts as on time, not late.',
          'With Group by day on, a multi-day request is listed under every day it covers, so you can see who is off on a given date. It is still one request: the Approve and Reject buttons appear only on its first day.',
          'Each row reads the same way whatever kind it is: what it is, when, how much of the day, and the clock times if it has any. Only the two things you filter by — the kind and where it stands — are chips, plus the red flag when somebody filed it for someone else.',
          'Overtime is shown in hours and minutes. Forty minutes reads as 40m, not as 0.67 of an hour.',
          'A WFH request covers a date range, so a whole week away from the office is one request and one approval.',
          'A partial WFH day is not a day off: you work one half from home and the other half from the office, so check in as normal for the office half. Because it splits a single day, it cannot span a range.',
          'A day taken out of a longer request is removed from that person’s attendance straight away, and a leave day comes back to their balance. Their remaining days stay approved, so nobody has to reapply for the rest of the week.',
          'Removing a day from the middle of a range leaves two requests, one for the days before and one for the days after. That is the same leave, still approved, simply no longer covering the day in between.',
          'A single-day or half-day request has no day to take out. Reject it instead.',
          'Edit and Withdraw appear on your own rows while they are pending, in the same place an approver sees Approve and Reject. They are gone once it is decided: an approved request has already changed your record, and undoing that is a correction rather than a withdrawal.',
          'A request somebody else entered for you cannot be edited or withdrawn by you. It is their record of something, so ask them.',
          'Nobody can approve their own request, whatever their role.',
        ],
      },
      {
        id: 'my-attendance',
        title: 'Your own attendance',
        summary:
          'Your day, what is coming up, this month\u2019s record — the days you were in, when you arrived, and the hours against each — and the devices you check in from.',
        where: 'People → Attendance → My Attendance',
        notes: [
          'The page shows the month you are in. On a phone, the History row on the attendance hub has a month stepper for looking further back.',
          'Filing, editing and withdrawing all happen in Requests now. This page used to carry a separate form and list for each of leave, WFH, exceptions and overtime, which was a second copy of the same queue.',
          'Your leave balances are in the New request panel, on the Leave tab, where you are choosing which allowance to spend.',
        ],
      },
      {
        id: 'team-attendance',
        title: 'Your team’s attendance',
        summary:
          'One team at a time — who is in, and what they have asked for — on that team’s own page.',
        where: 'People → Teams → the team → Attendance',
        feature: ['can_view_team_attendance', 'can_view_all_attendance'],
        notes: [
          'Today already shows the whole company on any date, and grouping it By team puts the team you lead at the top. Go to the team’s own page when you want that team and nothing else, with its requests beside the roster.',
        ],
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
          'Everyone internal, with their role, designation and teams. Names are clickable throughout the portal, on a task, a comment, a standup or a leaderboard, and open the same profile.',
        where: 'People → People',
        notes: [
          'Elsewhere a name opens a small profile card so you keep your place. Here it opens the full profile page — the directory is where you came to find somebody.',
          'On a phone the directory is drawn as cards rather than as the table.',
        ],
      },
      {
        id: 'member-profile',
        title: 'Member profiles',
        summary:
          'One page per person: their teams, the projects and services they are staffed on, and their recognition. Sensitive sections such as compensation only appear for the people entitled to see them.',
        where: 'Click any name',
        procedures: [
          {
            title: 'Change what somebody is',
            steps: [
              'Open their profile and press Edit. It only appears for people you are senior to.',
              'Set their role, designation, job type and the teams they belong to.',
              'Press Save Changes. It is the same form as the one on People, so either place does the job.',
            ],
          },
        ],
      },
      {
        id: 'teams',
        title: 'Teams',
        summary:
          'Teams group people under a lead and carry their own project templates. A reusable set of stages that can be applied to a new service in one action.',
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
          'You earn XP for the things the company wants to see more of, finishing tasks, being on time, helping others. XP accumulates into levels, and points can be spent in the rewards shop.',
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
              'Claim it. The slot is yours and others can see you took it.',
              'Do the work, then submit your proof for review.',
              'Points land once a reviewer accepts it.',
            ],
          },
        ],
        notes: [
          'Who claimed a quest is public. What they submitted as proof is not.',
          'A quest can cap how many people may claim it.',
          'If you post quests, you edit and delete them from the board card itself. There is no separate list.',
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
          'Spend your points. Some rewards are pooled. A group clubs together and everyone contributes an equal share.',
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
              'Give it a name and a points cost. Turn on Group reward if several people should club together. The cost then means per person.',
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
          'Disable takes a reward out of the shop but keeps it, use it for something seasonal instead of deleting it.',
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
          'Everything waiting on you across gamification sits on one screen, quest proofs, shoutouts, and reward redemptions including group pools. The tab carries a count of what is yours to act on.',
        where: 'People → Gamification → Approvals',
        feature: ['can_govern_gamification', 'can_recognize', 'can_fulfill_payouts'],
        procedures: [
          {
            title: 'Clear the queue',
            steps: [
              'Open People → Gamification → Approvals.',
              'Work down the sections. You only see the queues you can act on.',
              'Approve or reject each item. You can attach a note explaining the decision.',
            ],
          },
        ],
        notes: [
          'Rejecting a redemption refunds the points; rejecting a group pool refunds every member.',
          'Approving a quest proof awards its points immediately.',
          'A red count beside Approvals in the sidebar tells you how many items are waiting on you. It counts only the queues you can act on.',
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
              'Open the approval from Notifications or from the project.',
              'Approve it, or request a revision with a note explaining what is needed.',
              'The person who submitted it is notified either way.',
            ],
          },
        ],
      },
      {
        id: 'task-statuses',
        title: 'The board columns',
        summary:
          'Add, rename, recolour and reorder the columns every task board uses, and choose which one notifies reviewers.',
        where: 'Settings → Statuses',
        roles: ['super_admin', 'admin'],
        procedures: [
          {
            title: 'Add a column',
            steps: [
              'Open Settings → Statuses.',
              'Pick a colour, type a name, and press Add column.',
              'It appears on every task board straight away, at the end.',
            ],
          },
          {
            title: 'Choose which column notifies reviewers',
            steps: [
              'Find the column that means "somebody needs to check this".',
              'Press the button on its row so it reads "Notifies reviewers".',
              'From then on, dragging a card into it notifies whoever is named reviewer on that task.',
            ],
          },
        ],
        notes: [
          'Only one column can notify reviewers, so a card never produces two alerts.',
          'Sign-off columns can only be moved into by someone allowed to approve tasks. Finished columns drop off My Day and Your work.',
          'A column still holding tasks cannot be deleted. Move them somewhere else first.',
          'Renaming a column keeps every task in it, and keeps whatever it was marked as. Behaviour follows the marks, never the name.',
          'On the board, each column wears its colour as a bar across the top of its header and an icon in front of its name. The icon is read from what the column means, so a new one called QA or Sign-off arrives with a sensible glyph without anyone choosing it.',
          'The column marked as the default is where every new task starts, so leaving the status alone while writing one is a valid answer.',
        ],
      },
      {
        id: 'participation',
        title: 'Who takes part in what',
        summary:
          'One grid saying who is expected to check in, submit a standup, appear on the timesheet, run the task timer, and earn points.',
        where: 'Settings → Participation',
        roles: ['super_admin', 'admin', 'hr'],
        procedures: [
          {
            title: 'Exclude one person from one thing',
            steps: [
              'Open Settings → Participation.',
              'Find them, and click the cell under the module in question.',
              'Clicking moves it between taking part, excluded, and following their role default.',
            ],
          },
          {
            title: 'Change it for a whole role',
            steps: [
              'Use the "Everyone on ..." row at the top of the grid.',
              'Everybody on that role follows it, unless they have been set individually.',
            ],
          },
        ],
        notes: [
          'A faint mark is inherited from the role. A solid one was decided for that person, and beats the role.',
          'These used to be in three different places and two of them did not exist: attendance was a checkbox on the person, standup had its own screen, and gamification meant taking a permission away. It is one question, so it is now one screen.',
          'Excluding somebody from attendance stops them being counted as missing. Excluding them from standup stops them being asked for one or marked late.',
        ],
      },
      {
        id: 'standup-settings',
        title: 'Standup rules and who submits',
        summary:
          'When the standup opens, what it is worth, and how much has to be written. Who has to submit one is set on Settings → Participation, with everything else the same question applies to.',
        where: 'Settings → Standup',
        feature: 'can_manage_standups',
        procedures: [
          {
            title: 'Change when the standup opens',
            steps: [
              'Open Settings → Standup.',
              'Choose “Minutes before the day ends” to have it follow the working day automatically, or “A fixed time” to pin it to the clock.',
              'Set the on-time window, how long after opening a standup still counts as on time.',
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
              'For individual exceptions, set that person’s participation to Excluded. A per-person setting always beats the role default.',
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
              'Reassign anything still marked as theirs, projects they managed and tasks they held stay attached and are flagged “Left”, so nothing is quietly orphaned.',
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
              'Fill in the company and contact, and pick the channel it came from. The channel is what the outreach report is built on, so it is worth getting right.',
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
              'Replace the example rows with yours, keeping the header row exactly as it is. Only the company column has to be filled in. Every other column falls back to the same default the New Lead form uses.',
              'Save the sheet as CSV, then drop it on the Import CSV box.',
              'Check the preview, then press Import. Rows the portal could not read are listed with their line number and skipped. The rest still go in.',
            ],
          },
          {
            title: 'Move a lead forward',
            steps: [
              'Drag its card to the next column, or open the lead and change Stage.',
              'Marking a lead Lost asks you for a reason before it commits. That reason is what makes the channel win-rate meaningful.',
              'Marking a lead Won offers to hand it to delivery straight away.',
            ],
          },
          {
            title: 'Put the cards in your own order',
            steps: [
              'Set Sort to Manual order. It is the default.',
              'Drag a card up or down within its column. The cards move aside and an empty slot follows the cursor, showing exactly where it will land.',
              'The order is saved for everyone, not just for you, and stays put until somebody moves it again.',
            ],
          },
          {
            title: 'Attach a proposal or a Google Doc',
            steps: [
              'Open the lead and choose the Documents tab.',
              'Drop a file on the upload box, or press Add link for something that lives in Drive.',
              'For a link, paste the address first. The title fills itself in from the document. Type over it if you would rather call it something else.',
              'Press the eye to preview. Google Docs, Sheets and Slides open inside the portal; so do PDFs, images and spreadsheets you have uploaded.',
            ],
          },
          {
            title: 'Keep notes on a prospect',
            steps: [
              'Open the lead and choose the Notes tab.',
              'Type as you would anywhere else in the portal: “/” for formatting, “@” to tag a colleague.',
              'Notes save when you click away. There is no Save button.',
            ],
          },
        ],
        notes: [
          'You can see the whole department’s pipeline but can only edit leads you own, unless you manage BD.',
          'Cards can only be dragged up and down under Manual order. Choose Highest value or any other sort and the column is arranged for you, so a placement would be thrown away. You can still drag a card to a different column.',
          'A new lead, and anything you import, goes to the top of its column rather than the bottom.',
          'Website, location, social profiles and documents show on the lead itself, under Services. Each section only appears once it has something in it, so a half-filled record is not a wall of dashes.',
          'Documents live on the saved lead, not in the New Lead form. A file has to belong to something before it can be uploaded.',
          'A title the portal cannot read usually means the document needs sign-in to open. Share it with the team, or type the title yourself.',
          'Documents on a lead are visible to everyone who can open Business Dev, and to nobody in the client portal. Only the lead’s owner and BD managers can add or remove them. There is no confidential setting here, unlike a project file, a lead document has only one audience.',
          'On import, list several social links in one cell separated by semicolons, and write a document as “Title | link”, again separated by semicolons for more than one.',
          'Quote a deal in whatever currency the client was given. Every currency in use anywhere is in the list, and you can search it by country as well as by code, so typing “Denmark” finds the krone. The card keeps showing that currency, while the funnel, the channel report and your target convert it to PKR so the totals add up.',
          'Exchange rates refresh daily and the field shows the one it is using as you type. The rate is fixed onto the lead at the moment you save it, so a deal you priced last month is never quietly restated by today’s rate.',
          'On import, dates must be written as YYYY-MM-DD. 03/04/2026 is March in one country and April in the next, so the portal refuses it rather than guessing.',
          'An imported row whose Owner column names a colleague is filed to them. Leave that column empty and the lead is yours. A name that matches nobody in BD fails the row instead of quietly assigning it to you.',
          'Importing does not check for duplicates. It flags them. A company already in your pipeline is marked in the preview, and still imported if you go ahead.',
          'Last contacted stays blank until outreach is logged against the lead. It is not filled in when the lead is created. A card that has never been contacted says so instead of counting quiet days from the day it was filed.',
          'Deleting a lead also removes its logged activity, which changes the outreach totals for that channel.',
          'Changes are saved as you make them. If one fails you get a toast and the screen puts itself back the way it was. Nothing is left half-applied.',
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
              'Type “@” and a name to tag someone. They get a notification.',
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
          'Every unit of effort is one record, whether it is a single call on a named prospect or twenty Upwork proposals. That is why the Outreach page and a lead’s own log can never disagree. They are two views of the same list.',
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
              'Pick what it was, call, email, message, and the outcome.',
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
        id: 'bd-updates',
        title: 'Daily updates',
        summary:
          'A written check-in at the end of a business-development day. Only the people who hold the Submit BD daily updates permission are asked for one, you can change today’s until midnight, and My history keeps everything you have filed, a month at a time.',
        where: 'Business Dev → Daily Updates',
        feature: 'can_view_bd',
        procedures: [
          {
            title: 'File today’s update',
            steps: [
              'Open Business Dev → Daily Updates. If one is owed from you, the banner at the top says so.',
              'Press Write today’s update.',
              'Tick the platforms you worked on, write what you did — at least a sentence — and fill in any of the four key numbers that apply.',
              'Press Submit.',
            ],
          },
          {
            title: 'Change what you filed',
            steps: [
              'On The day, press Edit my update. On My history, press Edit against today’s row.',
              'Change what you need and save.',
            ],
          },
          {
            title: 'Read your own updates back',
            steps: [
              'Open the My history tab.',
              'Step the month box back and forward, or press All months.',
              'The updates you filed that month are listed newest first. Only days you wrote something appear.',
            ],
          },
        ],
        notes: [
          'You are asked for an update only if you hold Submit BD daily updates. Being able to open the BD module is not the same thing, which is why an admin overseeing the department is never asked for one.',
          'An update belongs to the day it covers. It can only be filed, changed or removed on that day — after midnight in company time the day is settled, and nobody can reopen it.',
          'On a day that is not a working day for you, nothing is expected and nothing is counted against you — including a Saturday you do work, if that is how your week is set up.',
          'Notes keep the line breaks you type, so a bulleted list stays a bulleted list.',
          'If you filed nothing but logged outreach or hosted a meeting, your card says so. The system knowing you were busy is not a substitute for the check-in, but it is not held against you either.',
          'Who is asked for an update is decided by the Submit BD daily updates permission in Settings → Roles, and nowhere else.',
        ],
      },
      {
        id: 'bd-team-updates',
        title: 'Reading the team’s daily updates',
        summary:
          'Who has checked in today and who has not, for everyone required to file. A BD manager sees the whole desk; a rep sees their own.',
        where: 'Business Dev → Daily Updates → The day',
        feature: 'can_view_bd_team_updates',
        procedures: [
          {
            title: 'See where the day stands',
            steps: [
              'Open Business Dev → Daily Updates.',
              'The heading counts how many of the people required today have filed.',
              'Anybody still outstanding is named in the line above the feed.',
              'Use the day picker to look back at any of the last week.',
            ],
          },
        ],
        notes: [
          'The list is everyone required to file, not everyone in BD — so it is a roster you can actually chase.',
          'People not working that day are listed last and dimmed, and are left out of the filed count entirely.',
        ],
      },
      {
        id: 'bd-campaigns',
        title: 'Campaigns and BD tasks',
        summary:
          'A campaign is an outreach initiative that tasks hang off. The BD equivalent of a delivery project. Its board uses the same six columns as the delivery board, and you see a campaign only if you are on its team.',
        where: 'Business Dev → Projects, Business Dev → Tasks',
        feature: 'can_view_bd',
        procedures: [
          {
            title: 'Start a campaign',
            steps: [
              'Open Business Dev → Projects and press New project.',
              'Name it, pick the channels it targets and who is on it. Add everyone who needs to see it. A campaign is invisible to anybody not on its team.',
              'Open it and use the Brief tab to write down what it is going after.',
            ],
          },
          {
            title: 'Add work to it',
            steps: [
              'On the campaign’s Board tab, press Add task in the column you want it in.',
              'The task opens straight away. Every field is edited in place, so there is no separate form.',
              'Drag cards between columns as the work moves.',
            ],
          },
          {
            title: 'Change a campaign after it exists',
            steps: [
              'Open the campaign and press Edit, or use the pencil on its card in Projects.',
              'Change the name, owner, status, deadline, channels or team, then save.',
              'The title, status, brief, channels and team can also be edited straight on the page without opening the form.',
            ],
          },
          {
            title: 'Put documents on a task',
            steps: [
              'Open the task and scroll to Documents.',
              'Drop a file in, or press Add document to paste a Google Doc, Sheet or Drive link.',
              'A pasted link fills in its own title where the page allows it, type one yourself if it does not.',
              'Press a document to preview it without leaving the task.',
            ],
          },
        ],
        notes: [
          'A campaign’s progress bar is calculated from its tasks. There is no progress field to type into, because a typed number goes stale the moment a task moves.',
          'Assigning a task to someone notifies them.',
          'Task documents work the same way as documents on a lead or on a delivery task, and are stored the same way: uploads are private, links open where they live. Anyone who can open Business Dev can read them; adding and removing is limited to the person the task is assigned to, whoever raised it, and anyone who runs BD.',
          'You see a campaign only if you own it, created it, or were added to its team. Creating one puts you on it automatically, and so does being made its owner. You cannot lose access to your own campaign by editing the team.',
          'Tasks follow their campaign: work on a campaign you are not on does not appear on your Tasks board either. Two exceptions. A task assigned to you, or one you raised, is always visible to you, and so is any task not attached to a campaign.',
          'Whoever runs BD sees every campaign, so nothing is hidden from the department’s own oversight.',
          'A task’s linked lead is a link. Press it to open that lead in the Pipeline.',
          'The Tasks screen opens on the whole team. Use the people picker beside the project filter to narrow it to your own work, or to one colleague.',
          'You can hand a campaign to a colleague by naming them as its owner, including at the moment you create it. It stays editable by you as well as by them, so setting up a campaign for someone else does not lock you out of it. The same goes for a lead.',
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
              'Invite colleagues under “Invite colleagues”, anyone in the portal, not only BD.',
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
          'People you invite see the meeting under Workspace → My Meetings, even though they cannot open the BD module itself. They see the time, platform and who else is coming. Nothing else about the deal.',
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
          'The revenue chart books a deal to the month it closed, not the month the lead arrived. So a deal that took a quarter to land credits the right month.',
          'Everyone in BD can read the department’s numbers. Only whoever manages BD can set the quotas, so the Set targets button is not shown to reps.',
        ],
      },
      {
        id: 'bd-handoff',
        title: 'Handing a won deal to delivery',
        summary:
          'A won lead becomes a real project, client, services, starting pipelines and the people on each one, without anybody retyping it.',
        where: 'Business Dev → Pipeline → the lead',
        feature: 'can_view_bd',
        procedures: [
          {
            title: 'Hand over',
            steps: [
              'Move the lead to Won. The handoff opens by itself.',
              'Set the client first. Choose Existing client if you already work with them, or New client and check the name. It is prefilled from the lead, which often holds the deal name rather than the client’s.',
              'Name the project, pick the manager who will run it, and confirm the budget. Set a start date and deadline if they were agreed.',
              'Tick every service the deal covers. The services you sold are ticked for you, add or remove any.',
              'For each service, choose a starting pipeline and add the people who will work on it. Both can be left for the manager to do later.',
              'Add anything delivery needs to know, then press Hand off & create project.',
            ],
          },
        ],
        notes: [
          'Confirming builds the project immediately, with a service block for each service you ticked. It is in Projects for the manager and the team from that moment. You do not have to tell anyone to set it up.',
          'You do not need to add the client beforehand. Naming a new one creates it; naming one that already exists attaches to it instead, and the modal tells you which before you confirm.',
          'Two deals with the same client usually arrive under different lead names. Pick Existing client on the second one, or you will end up with the same account twice.',
          'Your notes become the project description, so what was promised in the negotiation is on the project rather than only in BD.',
          'Everything is created together or not at all. If the handoff fails you get told why, and no half-built project is left behind.',
          'The lead stays in BD history afterwards and shows what it became, so nothing disappears when it leaves the pipeline.',
          'The handoff is recorded on the lead’s timeline as well, alongside the calls and emails that got it there.',
          'Anyone who manages BD can hand a deal off. You do not need permission to manage projects, and handing off gives you no other access to Delivery.',
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
 * The releases this person should read, with the lines they should not stripped
 * out. A release whose every entry was gated away disappears rather than
 * appearing empty, and its highlight goes with it.
 */
export function filterReleases(
  releases: ChangelogRelease[],
  role: string | null | undefined,
  can: CanFn,
): ChangelogRelease[] {
  return releases.flatMap((release) => {
    if (!passes(release, role, can)) return []
    const entries = release.entries.filter((entry) => passes(entry, role, can))
    return entries.length > 0 ? [{ ...release, entries }] : []
  })
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
