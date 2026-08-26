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
    version: 'v1.15',
    date: '2026-08-26',
    title: 'One less screen, and a clearer name',
    highlight:
      'Inbox is now called Notifications, and the Dashboard has been retired — signing in takes you straight to My Day.',
    entries: [
      {
        kind: 'improved',
        text: 'Inbox is now Notifications. Nothing about it changed: it still opens on Waiting on you, with All and Unread beside it, and the badge still counts what is blocked on you. The old name promised a second message box, which it never was.',
      },
      {
        kind: 'improved',
        text: 'The Dashboard has been retired. It had become a page of links to menu items that are already on screen, so signing in now lands you on My Day. Company-wide numbers live in Reports, and anything you had pinned to Dashboard has been cleared.',
      },
      {
        kind: 'fixed',
        text: 'The bell in the top bar and "View all" now open the full Notifications screen — with the Waiting on you tab, category filters and Unread — rather than a shorter list of the same notifications.',
      },
    ],
  },
  {
    version: 'v1.14',
    date: '2026-08-26',
    title: 'An inbox that means something, and a menu you arrange',
    entries: [
      {
        kind: 'added',
        text: 'Inbox opens on a new Waiting on you tab: approvals in your queue, requests you can review, and mentions you have not replied to, gathered from every module that can block you. Notifications are still there under All and Unread.',
      },
      {
        kind: 'improved',
        text: 'The Inbox badge counts that queue rather than unread notifications, so it is a number you clear by acting rather than by scrolling. My Day shows the same list, from the same source, so the two can never disagree.',
      },
      {
        kind: 'added',
        text: 'Pin any screen to the top of the menu. Hover a menu row and press the pin that appears on it, or use the pin button in the top right for anything else — a project you are living in, a chat channel, a board. Pins are yours alone, and the Pinned section only appears once you have one.',
      },
      {
        kind: 'improved',
        text: 'The Mine / My team / Everyone switch moved out of the top bar and into the filter row of the screens it actually affects, beside the other filters. Inside a single project it sits with that project’s own controls.',
      },
    ],
  },
  {
    version: 'v1.13',
    date: '2026-08-26',
    title: 'Mine, my team, or everyone',
    entries: [
      {
        kind: 'added',
        text: 'My team is a new lens on the projects and tasks screens — work belonging to anyone who shares a team with you. Someone on several teams counts on all of them.',
      },
      {
        kind: 'improved',
        text: 'The banner that tells you a list is filtered now names which lens is on and still counts what it hid, so a nearly empty board is never a mystery. Your previous Me setting carries over as Mine.',
      },
    ],
  },
  {
    version: 'v1.12',
    date: '2026-08-26',
    title: 'One door for reports, one for admin',
    entries: [
      {
        kind: 'added',
        text: 'Reports gained Timesheet and Attendance tabs. Project backlog, employee backlog, the timesheet and the attendance reports were four screens in three different menu sections; finding a number meant already knowing which module produced it. They are now four tabs in one place.',
      },
      {
        kind: 'added',
        text: 'Admin is a console, at its own short address. Terminals, Enrolled Devices, and Schedule & holidays moved out of the Attendance menu and joined the Audit Log behind one Admin row. The count on that row is what is waiting inside — devices to approve and unseen audit entries — so folding them away never hides work.',
      },
      {
        kind: 'improved',
        text: 'Gamification’s “Settings” is now called Governance, on the page as well as in the menu, because that is what it is — granting XP and deciding who takes part. Its address changed to match; the old link still works. The actual gamification rules live in Settings → Gamification, where the standup and attendance rules already were.',
      },
      {
        kind: 'fixed',
        text: 'In the Admin console, a long section name pushed its icon and the arrow marking the open section off the row. The name now shortens instead.',
      },
      {
        kind: 'improved',
        text: 'Timesheet and the per-module Settings rows are gone from the menu. Every screen is still reachable — Timesheet from Reports, the rule-sets from Settings — and old links keep working.',
      },
    ],
  },
  {
    version: 'v1.11',
    date: '2026-08-26',
    title: 'Press ⌘K',
    entries: [
      {
        kind: 'added',
        text: 'The command palette. ⌘K or Ctrl+K opens it from any screen, and the search box at the top of the page opens the same thing. Arrow keys move, Enter opens, Escape closes.',
      },
      {
        kind: 'added',
        text: 'With the box empty it lists every screen you can open, so it works as the whole menu when you cannot remember where something lives. It reads the same list your sidebar does, so it never offers a screen your role cannot open.',
      },
      {
        kind: 'improved',
        text: 'The search box in the top bar was a placeholder that did nothing. It now opens the palette.',
      },
    ],
  },
  {
    version: 'v1.10',
    date: '2026-08-26',
    title: 'My Day',
    entries: [
      {
        kind: 'added',
        text: 'My Day is the new first item in Workspace, and where you land when you open the portal. Meetings today with the next one marked and a Join link; your overdue, due-today and in-progress work with a Start button for the timer; the standup prompt while its window is open; unread notifications and claimable quests; and a short list of who is out.',
      },
      {
        kind: 'improved',
        text: 'Your own work is now gathered from every way a task can be assigned to you — on your own or alongside other people — so a shared task no longer goes missing from your list.',
      },
      {
        kind: 'improved',
        text: 'Dashboard stays where it is, for the company-wide picture. My Day is only ever about you.',
      },
    ],
  },
  {
    version: 'v1.9',
    date: '2026-08-26',
    title: 'Attendance, in three views instead of eleven',
    entries: [
      {
        kind: 'added',
        text: 'Requests is one queue for all four kinds of request — leave, WFH, exceptions and overtime. It opens on Pending, each type filter carries its own count so you can see where the backlog is, and Approve and Reject work right on the row. This replaces four separate menu items.',
      },
      {
        kind: 'added',
        text: 'Calendar shows the month at a glance: public holidays and company off days shaded and named, working Saturdays labelled, and a count on every day of who is off and who is working from home. Press a day to see exactly who.',
      },
      {
        kind: 'improved',
        text: 'The Attendance menu is three views and the admin pages behind them, instead of eleven rows. Leave, WFH, Exceptions and Overtime are gone from the menu — they live in Requests now, with their pending counts summed onto that one row.',
      },
      {
        kind: 'added',
        text: 'Today is the new landing page for Attendance. Four counters give you the shape of the day at a glance, and the list underneath can be grouped by status or by team. Pick any date to see how a past day went, and a public holiday or company-wide WFH day is announced in a banner across the top.',
      },
      {
        kind: 'improved',
        text: 'Weekends and holidays no longer report the whole company as missing. A non-working day is now recognised as one, and a declared holiday marks everybody as off even if an older work-from-home approval was still sitting on that date.',
      },
      {
        kind: 'improved',
        text: 'Everyone can see who is in today, not just managers — that was the question people were asking in chat. Check-in times, the late flag and which kind of leave someone took stay private: those show only for yourself, for people on your teams, and to whoever manages attendance.',
      },
    ],
  },
  {
    version: 'v1.8',
    date: '2026-08-25',
    title: 'A tighter sidebar',
    entries: [
      {
        kind: 'improved',
        text: 'Navigation rows are noticeably more compact \u2014 shorter, with lighter text on everything except the page you are on. The whole menu now fits without scrolling, even with a section expanded.',
      },
      {
        kind: 'added',
        text: 'Sections fold. Press the Workspace, Delivery, People or Admin heading to collapse it, and again to bring it back. A folded section still shows a count when something inside needs you, so nothing hides. The arrangement is remembered per device.',
      },
      {
        kind: 'fixed',
        text: 'The red bar marking the page you are on was being clipped by the sidebar edge and showed as a sliver. It now sits on the row itself.',
      },
      {
        kind: 'improved',
        text: 'The Install app prompt is a single row instead of a two-line block, so it stops outweighing the destinations above it.',
      },
    ],
  },
  {
    version: 'v1.7.1',
    date: '2026-08-25',
    title: 'Checking in from home, and from the office WiFi',
    entries: [
      {
        kind: 'fixed',
        text: 'Checking in on an approved work-from-home day works again. On-site staff are normally sent to the fingerprint terminal, and that rule was being applied before anyone checked whether it was a WFH day — so the Check In (WFH) button was offered at home and every press came back “Please check in at the biometric terminal”. An approved WFH day now skips the terminal and the office-WiFi rule entirely.',
      },
      {
        kind: 'added',
        text: 'On the office WiFi, you can check in from the portal instead of the terminal. The card says “Office WiFi detected” when it recognises the network. Off the office network, on-site staff are still sent to the terminal as before.',
      },
    ],
  },
  {
    version: 'v1.7',
    date: '2026-08-24',
    title: 'Won deals build their own projects, and campaigns get their privacy',
    entries: [
      {
        kind: 'improved',
        text: 'The handoff on a won lead now builds the project rather than recording an intention to. Confirming it creates the client, the project, a service block for every service you ticked, the starting pipeline you chose for each, and the people you staffed onto them. The project is in Projects the moment the modal closes.',
      },
      {
        kind: 'added',
        text: 'A handoff can now cover several services at once. Every service the deal was sold against is ticked for you and each gets its own block, so a deal that bought design, development and marketing arrives as one project with three service blocks instead of three separate conversations.',
      },
      {
        kind: 'added',
        text: 'You can staff each service during the handoff, and set the project’s start date and deadline while you are there. Both are optional — leave them and the manager picks them up.',
      },
      {
        kind: 'added',
        text: 'The handoff now asks which client the work is for, rather than guessing. Pick an existing client, or name a new one — prefilled from the lead, and flagged if that name already exists so the same account cannot end up in the list twice. Leads are usually named after the deal, so this is worth a glance.',
      },
      {
        kind: 'improved',
        text: 'BD campaigns are now private to the people on them. You see a campaign if you own it, created it, or were added to its team — and creating one, or being handed one as its owner, puts you on it automatically. Whoever runs BD still sees every campaign. Until now every campaign was visible to everyone in the department: the Projects screen had a filter meant to prevent that, but it never took effect.',
      },
      {
        kind: 'improved',
        text: 'Tasks follow their campaign, so the Tasks board no longer lists — and names — work from campaigns you were deliberately left off. A task assigned to you, one you raised, or one attached to no campaign stays visible either way.',
      },
      {
        kind: 'added',
        text: 'Campaigns can be edited after they are created. Press Edit on the campaign, or the pencil on its card in Projects, to change the name, owner, status, deadline, channels or team. Owner and deadline in particular had no way to be changed at all once a campaign existed.',
      },
      {
        kind: 'fixed',
        text: 'A BD task’s linked lead is now a link — press it to open that lead in the Pipeline. The link had been built but was never switched on, so the field named a lead you then had to go and find by hand.',
      },
      {
        kind: 'fixed',
        text: 'A note written on Daily Updates is now visible. If you logged no outreach and hosted no meetings that day, your note was stored correctly and then shown to nobody — not to your team, and not to you — because the feed only listed people with logged activity. Writing a note now counts as checking in.',
      },
      {
        kind: 'fixed',
        text: 'Daily update notes keep their line breaks, so a note typed as a bulleted list no longer collapses into one run-on paragraph.',
      },
      {
        kind: 'fixed',
        text: 'Editing a campaign no longer records you as the person who created it.',
      },
      {
        kind: 'fixed',
        text: 'Handing off used to record the handoff on the lead and nothing else — the project it named was never created, and the lead’s timeline said it had been handed over regardless. Old handoffs that were left dangling this way still show on their leads; if one names a project that was later created by hand, ask an admin to link the two.',
      },
    ],
  },
  {
    version: 'v1.6',
    date: '2026-08-23',
    title: 'Linknbit 3.0 — the portal gets the new brand',
    entries: [
      {
        kind: 'improved',
        text: 'The whole portal has been restyled to the Linknbit 3.0 brand. Everything is set in Poppins, the deep navy ground is now near-black with a soft red wash behind it, and the brand red has moved to the 3.0 red. The corners are the loudest change: cards, panels, buttons, inputs, chips, badges and progress bars are all square now. Avatars and status dots stay round.',
      },
      {
        kind: 'improved',
        text: 'Colours that mean something were deliberately left alone. Design stays violet, Development stays cyan and Marketing stays amber, and approved-green, blocked-red and the warning ambers are unchanged — a board you have learned to read at a glance still reads the same way.',
      },
      {
        kind: 'added',
        text: 'You can now pick your own colour theme, in Profile → Appearance. Choose one and the whole portal changes at once — sidebar, top bar, tables, inputs, dialogs and the page background — with no reload. The choice is yours alone and follows you to any device you sign in from; it changes nothing for anyone else.',
      },
      {
        kind: 'improved',
        text: 'Section labels, column heads and the small capitalised text throughout are set wider and more consistently, so a screen full of tables is easier to scan for the heading you want.',
      },
      {
        kind: 'improved',
        text: 'The client portal keeps its warm cream look, deliberately — it is what a client sees, and it is meant to read as a delivered product rather than as the internal tool. It picks up Poppins and the new brand red so the two still feel like one company.',
      },
    ],
  },
  {
    version: 'v1.5',
    date: '2026-08-17',
    title: 'Business Development goes live',
    entries: [
      {
        kind: 'added',
        text: 'The backlog drill-downs now go all the way down to the task. Under the summary sits every task with both clocks against it, its status, who it is assigned to and the estimate where one was set — for a project, and for a person across the projects they went to. Each table has its own CSV.',
      },
      {
        kind: 'added',
        text: 'A project’s task breakdown also lists still-open tasks that recorded no time at all in the range, which is the thing a delivery lead most wants to spot and the one thing a table built from time entries can never show. One button hides them again.',
      },
      {
        kind: 'improved',
        text: 'The task breakdown adds up to the summary above it, and shows its working. Standup time written against a project without naming a task — about two thirds of it — gets its own line rather than being shared out across the tasks, and a deleted task that still carries logged time keeps its row, struck through and marked, instead of quietly vanishing and leaving the totals short.',
      },
      {
        kind: 'fixed',
        text: 'Opening a row in the backlog reports now shows the breakdown. Both drill-downs — a project by the people who worked on it, and a person by the projects they went to — were failing on every single call since the day they shipped, and the screen was reporting the failure as “nobody recorded time in this range”. The hours were always there; the page could not read them.',
      },
      {
        kind: 'improved',
        text: 'A report that cannot load now says so, instead of showing an empty table. The backlog reports, the drill-downs and the Timesheet each used to treat a failure and a genuinely empty range as the same thing, which turned a fault into a statement about your team. They now tell you the difference.',
      },
      {
        kind: 'added',
        text: 'BD tasks now take documents. Open a task, scroll to Documents, and drop a file in or paste a Google Doc, Sheet or Drive link — the same uploader, preview and Drive support that leads and delivery tasks already had. Anyone who can open Business Dev can read them; adding and removing is limited to whoever the task is assigned to, whoever raised it, and anyone who runs BD.',
      },
      {
        kind: 'fixed',
        text: 'The BD Tasks screen was hiding most of the department’s work. It opened filtered to your own tasks, and the control doing it sat collapsed behind the Filters button with nothing to say it was on — so a campaign’s tasks were plainly listed on its own page but missing from the Tasks board. Tasks now opens on the whole team, and the people picker sits in the open beside the project filter.',
      },
      {
        kind: 'improved',
        text: 'The Timesheet now lists everybody, not only the people who pressed start. A person who worked all day without the timer, a person on leave and a person who never turned up used to look identical — all three were simply missing. Each now has a row, and the four tiles above the chart say how many hours were tracked, how many timers are running, how many people were due in with nothing logged, and how many are away.',
      },
      {
        kind: 'improved',
        text: 'Each Timesheet row now reads as a day rather than a strip of blocks. The scale is a twelve-hour clock running the whole day, midnight to midnight, so the same time sits in the same place on every row and every date instead of the chart rescaling itself to whatever happened; the lighter band behind the bar is the hours that person was due in for with the lunch break cut out of it; a thin line underneath is when they actually checked in and out; leave, holidays and days off are labelled on the bar; and an approved late arrival, early departure or trip out shows as an amber band you can hover for the reason. Filter to “No time logged” to see only the people who were in with nothing against them, and the CSV now carries every person and their day, not just the segments.',
      },
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
        text: 'Every request row now shows when it was raised and when it was decided, side by side, instead of hiding the review date behind an expander. A long reason is trimmed to three lines with a Read more, so one person’s essay no longer pushes the next request off the screen, and the status sits at the far right of every row with its “Day 2 of 3” marker beside it.',
      },
      {
        kind: 'fixed',
        text: 'Overtime is shown in hours and minutes. A 40-minute request read as “0.67h” everywhere it appeared — on the review screen, your own attendance page, a member’s profile and the team panel — and now reads “40m”.',
      },
      {
        kind: 'improved',
        text: 'Leave, WFH Requests, Exceptions and Overtime now look and work the same. All four are one list grouped by date — Exceptions and Overtime were tables, which meant the same request looked different depending on which screen you reviewed it from — and all four now use the same status pill, so an approved request no longer reads “Approved” on one screen and “approved” on another. The stat cards above each list are gone; they repeated what the list already shows and pushed the requests below the fold.',
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
      {
        kind: 'added',
        text: 'Rewards can carry a picture. Upload one when you add or edit a reward — JPG, PNG, WebP or GIF up to 5 MB — and it shows on the card in the shop; replace or remove it at any time, and the plain gift icon comes back.',
      },
      {
        kind: 'improved',
        text: 'Rewards are now added from the Rewards Shop itself. The Add Reward button and the full catalog — including anything currently disabled — sit under the shop, so you edit the list while looking at what everyone else sees.',
      },
      {
        kind: 'improved',
        text: 'Gamification approvals moved off the Settings page onto their own Approvals screen: quest proofs, shoutouts and reward redemptions in one place, with a count of what is waiting on you. Settings now holds only the quest list, granting XP, who takes part, and Employee of the Month.',
      },
      {
        kind: 'added',
        text: 'The standup now asks you to account for your whole day. The form shows how many hours that is — your working day less the new lunch break — and the bar turns green when what you have logged matches it. Time off is taken off the total for you: half a day of leave, a late arrival or an approved trip out each reduce what you owe, and overlapping ones only count once.',
      },
      {
        kind: 'fixed',
        text: 'The employee backlog no longer demands hours from people who are never asked for a standup. Admins, HR and anyone excluded from the routine were each showing a full month of required hours, and a full month of shortfall against it. Holidays and leave were always handled correctly; participation was the piece missing.',
      },
      {
        kind: 'added',
        text: 'Exceptions are now unpaid time you work back, rather than hours that simply disappear. Take two hours out and that day asks for six — you were not there — but the same two hours are recorded as make-up time. Log over the requirement on any later day and the balance comes down. The standup shows what you owe and how far over you may go; the backlog and its CSV carry unpaid, made-up and outstanding as their own figures.',
      },
      {
        kind: 'added',
        text: 'Backlog rows open into a screen of their own. A project shows which people put the hours in; a person shows which projects they went to — timer, standup and variance for each, plus their own CSV export. The range you were reading carries across in the link, so it is worth pasting to a colleague.',
      },
      {
        kind: 'improved',
        text: 'Reports moved from Admin to Delivery, beside the Timesheet — reading where the hours went is delivery work, not governance.',
      },
      {
        kind: 'improved',
        text: 'The timesheet bar shows its detail in a proper card that appears the moment you hover, instead of waiting on the browser’s own tooltip. Task, project, exact times and duration, styled like the rest of the portal.',
      },
      {
        kind: 'added',
        text: 'A Timesheet screen under Delivery: who has a timer running this minute, and a bar of each person’s day showing which task ran from when to when. Hover a block for the detail, step through days with the arrows, export the lot as CSV. Only tracked time is drawn — the gaps are left as gaps, because a filled-in guess is not a record.',
      },
      {
        kind: 'added',
        text: 'Reports is real. Project backlog and Employee backlog over today, this week, this month or any custom range, each with search and a CSV export. It replaces the sample charts that were there before.',
      },
      {
        kind: 'improved',
        text: 'Backlog reports show the timer and the standup side by side and never add them together — they measure the same hours two different ways and routinely disagree. The variance between them is its own column, and it is the number worth reading: far more standup time than timer time means work is happening without the timer, and the reverse means work nobody wrote up.',
      },
      {
        kind: 'added',
        text: 'The standup fills itself in. Open it and a banner lists the tasks you actually worked on today — anything you ran a timer on, anything assigned to you and in progress, anything you commented on — and one press drops them into the form. Times and descriptions stay blank, because the timer rarely covers a whole day and a wrong number is slower to fix than an empty one.',
      },
      {
        kind: 'added',
        text: 'Work that belongs to no project now has somewhere to go. “Add other work” takes a title, a description and the time — for the errand, the interview panel, the afternoon lost to a fire drill. It counts towards your hours like anything else, and has nothing to do with quests or XP.',
      },
      {
        kind: 'improved',
        text: 'Standups are written project by project, with a row for each task you worked on and its own description — no more cramming three tasks into one box. Descriptions take bold, italic, lists and links.',
      },
      {
        kind: 'added',
        text: 'A lunch break can be set under Settings → Attendance. It is unpaid, so it comes off the working day, and that is what decides how much work a standup has to account for — 09:00 to 18:00 with an hour for lunch is eight hours, not nine.',
      },
      {
        kind: 'improved',
        text: 'Attendance, Standup and Gamification settings now live as tabs in the main Settings screen instead of being scattered through their own modules, and all three are laid out the same way. The day-to-day screens — registers, approvals, the quest board — stay exactly where they were.',
      },
      {
        kind: 'added',
        text: 'The standup rules are configurable at last. When it opens (a set number of minutes before the day ends, or a fixed time), how long it stays “on time”, what an on-time standup is worth, and the minimum length of a task description — all of it was previously fixed in code.',
      },
      {
        kind: 'added',
        text: 'A lead now holds the rest of what you know about a prospect: their website, country and city, as many social profiles as they have, and the documents you sent them — each with a title and a link. Social links need no picking from a list; paste the address and the platform is recognised from it. All of it shows on the lead beneath Services.',
      },
      {
        kind: 'added',
        text: 'Leads have a Documents tab, the same one projects have had: drop a file to upload it, or link a Google Doc, Sheet, Slide deck or Drive file. Press the eye and it opens inside the portal — Google documents, PDFs, images and spreadsheets all preview in place rather than sending you off to another tab.',
      },
      {
        kind: 'added',
        text: 'Document titles fill themselves in. Paste a link and the portal reads the document’s own name off it — “Q3 Proposal”, not “docs.google.com/document/d/1a2b3c”. Upload a file and its filename is used. Either way you can type over it. A document that needs sign-in cannot be read, and the portal says so instead of guessing.',
      },
      {
        kind: 'improved',
        text: 'The CSV importer takes the new fields too — website, country, city, where the lead came from, social links and documents — so a spreadsheet no longer has to leave half of itself behind at the door.',
      },
      {
        kind: 'added',
        text: 'Pipeline cards can be dragged up and down inside a column, not just across to the next stage. The card lifts out, the ones below close up, and an empty slot follows your cursor so you can see exactly where it will land. The order you set is saved for the whole department. It works under the new Manual order sort, which is now the default — the other sorts arrange the column for you, so dragging within one is not offered there.',
      },
      {
        kind: 'added',
        text: 'Gamification reviewers are now told when something needs them: quest proof submitted, a shoutout given, a reward redeemed or a group reward filled. Each notification opens the Approvals screen, and a red count beside Approvals in the sidebar shows how many items are waiting on you.',
      },
      {
        kind: 'improved',
        text: 'Recognition notifications now open the screen they are about — a badge opens Badges, a redemption opens the Rewards Shop — instead of dropping you on the leaderboard to find it yourself.',
      },
      {
        kind: 'improved',
        text: 'Quests are managed entirely from the Quest Board now: post, edit and delete on the card itself. The duplicate list under Settings is gone.',
      },
      {
        kind: 'improved',
        text: 'Holidays are listed newest first, and one that has not happened yet is marked Upcoming — Today on the day itself — so the next day off is at the top instead of buried under the year so far.',
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
