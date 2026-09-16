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
 *
 * ── Numbering ────────────────────────────────────────────────────────────────
 * `major.minor.patch`, and the third number carries its weight:
 *
 *   patch  nothing new, only `improved` and `fixed` entries
 *   minor  anything with an `added` entry in it
 *   major  the portal changes shape
 *
 * ── Who sees what ────────────────────────────────────────────────────────────
 * An entry may carry `roles` / `feature`, gated exactly as a handbook topic is
 * and with the same keys the nav and route guards use. Most entries carry
 * neither, because most of what ships is for everybody. Gate an entry only when
 * it describes a screen the reader could not open, and remember that a line
 * about a module reaching people OUTSIDE it (a BD meeting landing in a
 * non-BD person's calendar) is exactly the line that must stay ungated.
 *
 * A release whose every entry is gated away disappears for that reader, so
 * `highlight` never announces something they cannot see.
 */
export const RELEASES: ChangelogRelease[] = [
  {
    version: '1.32.0',
    date: '2026-09-14',
    title: 'Not everybody\u2019s week is the same week',
    highlight:
      'Somebody who works weekends can now mark attendance and file a standup on the days they actually work. Working days are set per person instead of being the company\u2019s calendar for everyone, so a Saturday you work counts as a working day and a weekday you do not is never held against you.',
    entries: [
      {
        kind: 'added',
        text: 'Unread chat messages now show as a number on the portal\u2019s icon \u2014 on the browser tab, and on the dock or taskbar if you have installed the app. Direct messages and channels are counted together, and nothing else is, so a number there always means somebody is waiting on a reply.',
      },
      {
        kind: 'added',
        text: 'Cards on a task board can now be dragged up and down inside their column, not only across to another one, so a column can be put in the order the work should happen. The other cards slide aside as you drag, showing the gap the card will drop into, and the order is saved for everyone.',
      },
      {
        kind: 'added',
        text: 'Working days are now set per person. The default is unchanged \u2014 the company calendar, Monday to Friday plus any working Saturdays \u2014 but somebody can be given a specific week of their own (Tuesday to Saturday, say) or marked flexible, meaning any day that is not a public holiday. Check-in, the standup window, the absence count and leave arithmetic all follow whichever applies to that person.',
      },
      {
        kind: 'fixed',
        text: 'People who work weekends could not mark attendance or file a standup at all. Both refused every Saturday and Sunday because the only working-day rule in the portal was the company\u2019s. Now they can do both on the days they work.',
      },
      {
        kind: 'improved',
        text: 'Working days are deliberately separate from Job type. Job type still says where somebody works from and drives the office-network and timing rules; working days say which days they work. A hybrid employee can keep the company week or have their own, without the two settings fighting over one field.',
        feature: 'can_manage_people',
      },
      {
        kind: 'improved',
        text: 'Somebody on flexible hours is no longer marked absent. No particular day was promised, so there is no day to find them missing from.',
      },
      {
        kind: 'added',
        text: 'Business Dev → Daily Updates now has a My history tab: the updates you filed, newest first, a month at a time with an All months option. Only days you actually wrote something appear.',
        feature: 'can_view_bd',
      },
      {
        kind: 'added',
        text: 'Only the people who hold Submit BD daily updates are asked for one, and the permission is the whole rule. Until now the screen listed everyone who could open the BD module \u2014 which includes admins overseeing the department \u2014 and named them as still owing a check-in they were never expected to write.',
        feature: 'can_view_bd',
      },
      {
        kind: 'improved',
        text: 'An update belongs to the day it covers, and can only be filed or changed on that day. After midnight in company time the day is settled and nobody can reopen it \u2014 not a manager either.',
        feature: 'can_view_bd',
      },
      {
        kind: 'fixed',
        text: 'A business developer is no longer asked for an update on a day they do not work, and their day off is no longer reported as a missing update. The prompt used to appear on a Sunday because it asked whether you file updates at all rather than whether you were working that day.',
        feature: 'can_view_bd',
      },
      {
        kind: 'improved',
        text: 'Daily updates are read by their author and by whoever holds View the team\u2019s BD daily updates, rather than by everyone with BD access.',
        feature: 'can_view_bd',
      },
    ],
  },
  {
    version: '1.31.0',
    date: '2026-09-04',
    title: 'The company\u2019s month, not yours',
    entries: [
      {
        kind: 'improved',
        text: 'Everyone can see who is away on any day of the month. Until now the calendar showed you your own leave and the public holidays unless you managed attendance \u2014 while Today already showed you the whole company\u2019s status for the current day. The same fact was public on one screen and private on the other.',
      },
      {
        kind: 'improved',
        text: 'The reason stays private. The kind of leave is named only for yourself, your teammates, and whoever manages attendance; everyone else sees Away and how much of the day it covers. Exceptions \u2014 late arrival, early departure, out of office \u2014 are a record of somebody\u2019s day rather than a plan, so they stay on the same footing rather than going company-wide.',
      },
      {
        kind: 'added',
        text: 'Requests awaiting a decision appear on the calendar with a dashed mark and their own count, and are listed last when you open a day. They are never folded into the approved figures: a day reading \u201c3 off\u201d means three agreed absences, which is the one thing a planning view has to get right.',
      },
      {
        kind: 'fixed',
        text: 'People who have left the company no longer appear on the calendar.',
      },
    ],
  },
  {
    version: '1.30.0',
    date: '2026-09-04',
    title: 'A register you can question',
    entries: [
      {
        kind: 'added',
        text: 'Day, Week, Month and Custom spans. The arrows step by whatever you picked, and moving between Day, Week and Month widens around the date you were already on rather than jumping back to today.',
      },
      {
        kind: 'added',
        text: 'A By person view for any span longer than a day: one row each, with days present, late, absent, half, on leave and working from home. It opens on most late days first.',
      },
      {
        kind: 'added',
        text: 'Filters for team, employee, kind of day, and how the record was made \u2014 self check-in, biometric terminal, or entered by an admin \u2014 plus a flagged-devices-only switch. The panel is a drawer on a computer and a sheet you can drag away on a phone, matching Requests.',
      },
      {
        kind: 'added',
        text: 'Sorting on every column, both views: press a heading to sort, press it again to reverse. On a phone, where there are no headings to press, the same sort sits above the list.',
      },
      {
        kind: 'added',
        text: 'Group by day, in the Filters panel: over more than a day, records are listed under a heading per date that stays pinned as you scroll it, in place of the Date column. Press the date to run the days the other way round; sorting on any other column orders the records within each day. Off by default \u2014 a flat list is what the register is usually read as.',
      },
      {
        kind: 'improved',
        text: 'The counters filter, and they are a compact strip rather than five tall cards \u2014 pressing Present, Late, Absent, Half Day or Leave narrows the list to it and pressing again clears it, instead of naming five slices you then had to find again in a dropdown. They count the whole span whichever one is pressed, so choosing Leave no longer sends Present to zero.',
      },
      {
        kind: 'improved',
        text: 'Records reads properly on a phone: cards instead of a table you scroll sideways, the period control across the full width, and the card frame dropped where the screen is too narrow to spend width on it.',
      },
      {
        kind: 'improved',
        text: 'Mark attendance and Edit record open as a panel from the right on a computer and from the bottom on a phone, like every other form in attendance.',
      },
      {
        kind: 'improved',
        text: 'Export gives you what is on screen \u2014 the filtered span, or the per-person roll-up if that is the view you are in.',
      },
      {
        kind: 'fixed',
        text: 'People who have been deactivated no longer appear in the register, the requests queue or the calendar, and are not counted in any total. Their days stay on the record and are read on their own profile page.',
      },
      {
        kind: 'improved',
        text: 'The month control on the attendance calendar takes the full width on a phone, so the arrows are big enough to press and the month is unmistakably what the screen is showing.',
      },
      {
        kind: 'fixed',
        text: 'Switching the register between Month and Custom no longer nudges the page. The month stepper and the pair of date pickers that replace it were four pixels apart in height, so everything below them shifted each time you moved between the two.',
      },
      {
        kind: 'fixed',
        text: 'Attendance counters are whole days again. A worked half day used to score half to the attendance side and half to the leave side so the columns summed to the month, which printed things like "Present 18.5" \u2014 turning up is not divisible, and a counter reading 1.5 that then listed one row was describing something other than what it counted. Each counter now counts the days it names, on the register, on a team\u2019s page and on a member\u2019s profile alike.',
      },
      {
        kind: 'fixed',
        text: 'Date headings in the register stayed put on a phone but scrolled away on a computer. They now pin under the top bar on both, the same as the roster and the requests queue.',
      },
      {
        kind: 'fixed',
        text: 'Date headings in the requests queue pinned behind the top bar instead of under it, so the date you were reading was hidden by the very thing it was stuck to. They now pin in the right place, run edge to edge on a phone, and match the headings on the roster and the register.',
      },
    ],
  },
  {
    version: '1.29.0',
    date: '2026-09-04',
    title: 'One queue for a request',
    entries: [
      {
        kind: 'added',
        text: 'New request, on the Requests toolbar, for everyone. It opens the same panel for all four kinds \u2014 leave, WFH, exception, overtime \u2014 on the right on a computer and up from the bottom on a phone.',
      },
      {
        kind: 'added',
        text: 'Whoever manages attendance gets a "Who is this for" field inside that panel, opening on themselves. One button now files your own leave and somebody else\u2019s; there is no separate "Add for someone else".',
      },
      {
        kind: 'added',
        text: 'Edit and Withdraw on your own pending rows, where an approver sees Approve and Reject. Editing keeps it pending and shows the approver the new version; withdrawing takes it off the queue, and since nothing has been decided, nothing on your record changes.',
      },
      {
        kind: 'added',
        text: 'Your leave balances are on the Leave tab of the New request panel \u2014 every allowance with the days you have left, above the picker that spends one, and repeated on the type you choose so you can see whether the request fits.',
      },
      {
        kind: 'improved',
        text: 'The panel says what will happen before you submit: the entry applies immediately, or it goes to an admin for approval. A request for yourself always goes for approval, whatever you are allowed to do for other people.',
      },
      {
        kind: 'improved',
        text: 'Entering leave for somebody else shows their balances rather than yours, so you can see what they have left while you fill it in.',
      },
      {
        kind: 'improved',
        text: 'The queue opens on Pending if you review requests and on All if you do not. Reading your own record, the undecided slice is rarely the one you came for.',
      },
      {
        kind: 'improved',
        text: 'My Attendance is your day, what is coming, this month\u2019s record, and last the devices you check in from. The four request sections it used to carry were a second copy of the queue, each with its own form and its own list of the same rows.',
      },
      {
        kind: 'improved',
        text: 'The attendance hub on a phone has one Requests row instead of four per-kind rows, matching how the four review queues were collapsed into one. Old links to WFH, Leave, Exceptions and Overtime land on the right tab of the queue rather than nowhere.',
      },
      {
        kind: 'improved',
        text: 'A team\u2019s attendance is read on that team\u2019s own page. The Teams panel on My Attendance was not scoped to a team at all \u2014 it showed what Today and Requests already show you.',
      },
    ],
  },
  {
    version: '1.28.1',
    date: '2026-09-04',
    title: 'The roster, read on a phone',
    entries: [
      {
        kind: 'improved',
        text: 'The group heading on Today \u2014 In office, Work from Home, On leave \u2014 stays pinned under the top bar while you scroll through it, so a long list never leaves you guessing which group a row belongs to.',
      },
      {
        kind: 'improved',
        text: 'By status and By team is a switch whose backing slides between the two, matching the tabs on Requests, rather than a background blinking off one button and on the other.',
      },
      {
        kind: 'improved',
        text: 'Grouped by team, the team you lead is listed first and marked Your team, instead of sitting wherever the alphabet puts it. Lead more than one and all of them come first.',
      },
      {
        kind: 'improved',
        text: 'On a phone the date and the grouping share one line, at the same height \u2014 as do the date and time boxes everywhere else, which were a hair taller than every other control beside them. The separate Back to today link is gone: the date box has a Today button of its own at its foot.',
      },
      {
        kind: 'improved',
        text: 'On a phone each person is two lines \u2014 who, then how \u2014 and the card frame around the roster is gone. On a screen that narrow the border and its padding were spending the width the names and times needed.',
      },
      {
        kind: 'improved',
        text: 'Working from home is called Work from Home throughout the roster \u2014 on the counter and on the chip beside a person\u2019s name.',
      },
    ],
  },
  {
    version: '1.28.0',
    date: '2026-09-03',
    title: 'Half a day is not a day',
    entries: [
      {
        kind: 'improved',
        text: 'Leave on the calendar says whether it is a full day, the first half or the second half. The day list spells it out per person, and the cell counts half days apart from full ones, so \u201c3 off\u201d never quietly includes somebody who is in for the afternoon.',
      },
      {
        kind: 'improved',
        text: 'A partial work-from-home day is marked the same way. It is half at home and half in the office, not a day away, and the calendar now reads that way too.',
      },
      {
        kind: 'added',
        text: 'Approved exceptions \u2014 late arrival, early departure and out of office \u2014 now appear on the calendar day with the time they cover, so you can see a thin day coming without opening the Exceptions list.',
      },
      {
        kind: 'improved',
        text: 'The requests queue opens on the current month rather than on every month there has ever been, so the first list you see is the one you meant.',
      },
      {
        kind: 'improved',
        text: 'Type, employee and period moved off the requests toolbar into a Filters panel \u2014 a drawer on the right on a computer, a sheet you can drag away on a phone. The button counts how many filters are narrowing the queue, and Clear all lives in the panel footer instead of appearing and disappearing mid-toolbar.',
      },
      {
        kind: 'improved',
        text: 'On a phone the requests toolbar fits its line: the Filters and Add buttons are icons beside the tabs, the search box has the row below to itself, and the card frame around the queue is gone \u2014 on a screen that narrow the border was spending width the list needed.',
      },
      {
        kind: 'improved',
        text: '\u201cAdd for someone else\u201d opens as a panel rather than a box in the middle of the screen: on the right on a computer, up from the bottom on a phone, where it can be dragged away. Pressing outside slides it shut instead of blinking out, and its four type tabs share the width equally.',
      },
      {
        kind: 'fixed',
        text: 'Avatars no longer squash into ovals beside a long name or reason \u2014 in the requests queue and everywhere else they are used.',
      },
      {
        kind: 'improved',
        text: 'Every request row now reads the same way \u2014 what it is, when, how much of the day, and the clock times \u2014 with only the kind and the status left as chips. Leave names its type, an exception names its type and the time, overtime shows the window it covers, and a range says how many days it is.',
      },
      {
        kind: 'added',
        text: 'Group by day, in the Filters panel: the queue becomes a heading per date with everything covering that date listed under it, which is the view for \u201cwho is off on the 14th\u201d rather than \u201cwhat needs deciding\u201d.',
      },
      {
        kind: 'fixed',
        text: 'Overtime reads as hours and minutes \u2014 40m, 1h 30m \u2014 instead of 0.67h. Times of day print as 10:40 AM instead of 10:40:00, and an exception is called Late arrival rather than late_arrival.',
      },
      {
        kind: 'fixed',
        text: 'The Filters button no longer grows its label from 13px to 16px the moment a filter is set.',
      },
      {
        kind: 'improved',
        text: 'All months is a switch you can slide rather than a button to guess at: both states are named, the panel slides between them, and the month picker appears only when a month is what you are picking \u2014 taking the full width of the panel when it does.',
      },
      {
        kind: 'improved',
        text: 'The Pending / Approved / Rejected / All tabs divide the space between them instead of huddling at the left.',
      },
      {
        kind: 'fixed',
        text: 'The Group by day switch could not be pressed: the row around it was itself a button, and a button inside a button never receives the press.',
      },
      {
        kind: 'improved',
        text: 'Every time field is now a clock face. Press an hour and it moves on to the minutes, or drag the hand round either scale; the reading and AM/PM sit above it. Half past nine is a shape before it is a pair of numbers, and the three scrolling columns made you hunt for a position you already knew.',
      },
      {
        kind: 'added',
        text: 'Enter time, under every clock: the two boxes become fields you type into, for when you know the answer exactly and 9:47 is quicker said than pointed at. Select time switches back, and Now still fills in this minute from either.',
      },
      {
        kind: 'fixed',
        text: 'A time field with an earliest allowed time now opens at that time rather than at nine in the morning. Asking for a late arrival this afternoon used to open a clock with every hour greyed out and no sign that the fix was to press PM.',
      },
      {
        kind: 'improved',
        text: 'Exception times are labelled Arrival, Departure and Return. The same field is filled in before the day as often as after it, so a past-tense label was wrong half the time.',
      },
      {
        kind: 'improved',
        text: 'My Attendance drops the month stepper and the Present / Late / Absent / Leave cards. The page is where you file and follow your own requests; it now shows this month\u2019s record under them and nothing else.',
      },
      {
        kind: 'fixed',
        text: 'Attendance in the sidebar now opens the same place for everybody. It used to jump managers straight past the section\u2019s own front page \u2014 which on a phone landed you on a drilled-in screen with the bottom tabs hidden and no way onward except Back.',
      },
      {
        kind: 'fixed',
        text: 'The back arrow on every attendance screen returns to the attendance hub rather than retracing your history, so a screen opened from a notification no longer backs out of the section entirely.',
      },
      {
        kind: 'fixed',
        text: 'The calendar reads properly on a phone. Cells show a coloured dot per kind instead of counts that used to break across two lines and stretch a whole week out of shape; press the day for the numbers and the names.',
      },
    ],
  },
  {
    version: '1.27.0',
    date: '2026-09-02',
    title: 'Straight to the person',
    entries: [
      {
        kind: 'improved',
        text: 'Projects and People no longer offer a Cards / Table switch. The table is the list; on a phone it is still drawn as cards, because eight columns do not fit one.',
      },
      {
        kind: 'improved',
        text: 'In the People directory, a name or picture opens that person\u2019s profile page. The small profile card still opens everywhere else in the portal, where you would rather not lose your place.',
      },
      {
        kind: 'added',
        text: 'A person\u2019s role, designation, job type and teams can now be set from their profile page, not only from People. The Edit button appears on the profiles of people you are senior to, and opens the same form.',
      },
      {
        kind: 'added',
        text: 'A third page sits beside the handbook and the changelog: Product purpose \u2014 what this portal is for, what each module replaces, and an honest account of what is live versus still being built. Open it from the arrow beside the logo.',
      },
    ],
  },
  {
    version: '1.26.0',
    date: '2026-09-01',
    title: 'Ticks that keep up',
    entries: [
      {
        kind: 'improved',
        text: 'Scrolling up in a conversation loads its older messages by itself — the "Load older messages" button is gone, and your place in the thread is kept as they arrive.',
      },
      {
        kind: 'fixed',
        text: 'The sender\'s picture now sits level with the top of their messages instead of drifting down beside a long one.',
      },
      {
        kind: 'improved',
        text: 'A picture sent with a message now sits above its text rather than under it, and the date divider behaves like a header — the conversation blurs softly as it passes behind, and only while the divider is actually pinned to the top.',
      },
      {
        kind: 'added',
        text: 'When the newest message in a conversation is deleted, the list says "You deleted this message" or names who did, instead of quietly falling back to an older message and looking stale.',
      },
      {
        kind: 'fixed',
        text: 'Pressing Enter to pick someone from the @mention list no longer sends the message half-written. Enter picks the highlighted name; it only sends once the list has closed. The same applies to the / command and # file lists.',
      },
      {
        kind: 'improved',
        text: 'Chat now reads as a conversation. Every message sits in its own container — yours down the right in the brand colour, everybody else\'s down the left — with the time, the edited note and the ticks in the bottom corner of the message itself. In a one-to-one nobody is named above their messages any more; which side it is on already says who sent it.',
      },
      {
        kind: 'fixed',
        text: 'The conversation list is ordered by whatever happened last, worked out from the messages and reactions themselves. A new message now moves its conversation to the top.',
      },
      {
        kind: 'added',
        text: 'When the last thing in a conversation was a reaction, the list says so — "Ghayas reacted 👍 to your message" — instead of showing a message nobody has touched since.',
      },
      {
        kind: 'added',
        text: 'Paste an image straight into the message box. It shows at full size above the box before it goes, so you can check you pasted the right one, and you can send a message with it.',
      },
      {
        kind: 'added',
        text: 'Hover a reaction to see who picked it — press and hold on a phone. The count on its own never answered the question anybody had.',
      },
      {
        kind: 'added',
        text: 'Leave a conversation with something typed and not sent, and it now shows "Draft:" and the text in the list, so an unfinished message is not lost behind another conversation. Drafts are kept while the portal is open, not across a reload.',
      },
      {
        kind: 'fixed',
        text: 'You now get one reaction per message. Picking a second emoji moves yours instead of stacking another beside it, and pressing your own still takes it off.',
      },
      {
        kind: 'fixed',
        text: 'Deleting a message now takes its reactions with it, and removing a reaction reaches everyone else in the conversation rather than only your own screen.',
      },
      {
        kind: 'fixed',
        text: 'A conversation whose last message was a picture no longer reads as "No messages yet" in the list — it says what was sent.',
      },
      {
        kind: 'added',
        text: 'Drag a message to the right to reply to it, the way a messaging app does — swipe on a phone or tablet, or drag with the mouse on a computer. A reply arrow appears as you go and turns red once you have gone far enough. The arrow on hover still does the same thing.',
      },
      {
        kind: 'added',
        text: 'Chat now puts a date divider between the days, and it stays pinned to the top as you scroll — so scrolling back through a long conversation always tells you which day you are reading.',
      },
      {
        kind: 'fixed',
        text: 'Notifications about a leave, WFH, exception or overtime request now open the requests queue on that kind, instead of landing on Attendance and leaving you to find the row. Holidays, company WFH days and working Saturdays open the calendar.',
      },
      {
        kind: 'fixed',
        text: 'A message time no longer wraps onto two lines. It also no longer repeats the date on every message, now that the divider above the day carries it.',
      },
      {
        kind: 'improved',
        text: 'The account menu now shows your designation under your name rather than your roles. Roles decide what you can open; the line under your name should say what you do.',
      },
      {
        kind: 'improved',
        text: 'The details panel of a direct message no longer offers a "Message" button for the person whose conversation you already have open.',
      },
      {
        kind: 'added',
        text: 'The conversation list now carries the same ticks. When the last word in a conversation was yours, its row shows whether it has been read, so you can see what is still waiting on somebody without opening it.',
      },
      {
        kind: 'fixed',
        text: 'A reply no longer claims the message it answers was deleted when it plainly was not. The quote shows the original again.',
      },
      {
        kind: 'fixed',
        text: 'Ticks now turn as soon as the other person opens the conversation. They used to sit on one grey tick until that person replied, which read as though nobody had seen the message.',
      },
      {
        kind: 'improved',
        text: 'A message still on its way now shows a clock, so a tick goes clock → one tick → read instead of appearing out of nothing once it lands.',
      },
      {
        kind: 'improved',
        text: 'Ticks sit in the bottom-right corner of the message, level with its last line, instead of on a line of their own underneath it.',
      },
      {
        kind: 'fixed',
        text: 'The message box now wraps onto a new line as you type. A long message, or a pasted link with no spaces in it, used to stretch the box wider and wider and drag the conversation across with it. It also stops growing once it is tall enough and scrolls instead, so a long message never pushes the conversation off the screen.',
      },
    ],
  },
  {
    version: '1.25.0',
    date: '2026-08-31',
    title: 'Boards that read like boards',
    entries: [
      {
        kind: 'fixed',
        text: 'A task you create no longer disappears the moment you save it. Mine kept what was assigned to you and My team kept what was assigned to a teammate, so a task with nobody on it yet fell through both. Anything you raised is now yours until you hand it over.',
      },
      {
        kind: 'added',
        text: 'My team now shows every task in a service block you or a teammate are staffed on, not only the ones somebody is already assigned to. A lead sees the whole of their own block, including the work still waiting to be handed out.',
      },
      {
        kind: 'improved',
        text: 'Whoever manages a project now sees every task in it across all of its services, wherever they look — the projects list, the Tasks board, or the project itself.',
      },
      {
        kind: 'improved',
        text: 'How far the Mine / My team / Everyone switch reaches is decided by what your roles allow rather than by what a role is called, so a role built on the Roles screen gets exactly the reach it was given.',
      },
      {
        kind: 'fixed',
        text: 'An open task now lets you assign or name a reviewer who is not staffed on its service, and staffs them as it saves. That already worked while writing a task and not afterwards, so a task handed to the wrong service could never be handed on.',
      },
      {
        kind: 'improved',
        text: 'The service, assignee and reviewer lists on a task are split under two headings: what is already part of the project or service, and what picking will add to it. The rows that quietly did more than the others now say so.',
      },
      {
        kind: 'improved',
        text: 'The requests queue has one set of tabs instead of two rows of chips. Pending, Approved, Rejected and All are the tabs, with the number still waiting on Pending; the request type moved into a dropdown beside them, keeping its per-kind counts. Two bars of chips read as two things competing to say what the list was.',
      },
      {
        kind: 'improved',
        text: 'Nothing anywhere in the portal decides anything by role any more — screens, menus, buttons and route guards included. Everything that used to ask "is this person an admin?" now asks whether they are allowed. Ten new permissions carry what had no key before, each granted to exactly the roles that had the ability by name, so nobody can do more or less than yesterday. A role you build on the Roles screen can now be given any of it, and renaming a role no longer changes what anybody can do.',
      },
      {
        kind: 'improved',
        text: 'Nothing in the database decides anything by role any more. Twenty-eight rules — ten access policies and eighteen functions — asked whether somebody was an admin instead of whether they were allowed; they now all read a permission. Six new keys carry what had no key before: managing the company calendar, viewing and editing logged time, applying attendance without approval, and two internal ones. Every key was granted to exactly the roles that had the ability by name, so nobody can do more or less than yesterday — but a role you build yourself can now be given any of it.',
      },
      {
        kind: 'improved',
        text: 'Skipping the approval queue is now a permission of its own — "Apply attendance without approval" — instead of being wired to the words "admin" and "super admin". It also covers all four kinds: an exception or an overtime claim entered by somebody holding it now applies at once, where before only leave and WFH did. The same people can do the same things today; what changed is that it can now be granted to anybody.',
      },
      {
        kind: 'added',
        text: 'Every time picker has a "Now" shortcut, the way every date picker has "Today". It fills in the current time rounded to the picker\u2019s own step — nearest, so 11:07 on a quarter-hour field reads 11:00 rather than a quarter past an hour that has not happened. On a field with an earliest allowed time, Now goes dim when it would land before it. The start/end picker sets whichever side you are editing instead of saving, since a start without an end is not something to commit on one tap.',
      },
      {
        kind: 'improved',
        text: 'The month stepper now reads "All months" first and the month after it, on every screen that has one — the switch deciding whether a period applies belongs before the period, not after it. The month name is set smaller, to sit with the controls beside it rather than above them.',
      },
      {
        kind: 'improved',
        text: 'The requests queue no longer repeats its own name under the page title, and its filters sit in their own row under the tabs instead of seven controls competing on one line. Type and employee sit left, the month controls hard right with nothing after them, and every slot has a fixed width — so switching "All months" on and off no longer shoves the search box sideways. A Clear filters link appears once anything is narrowed.',
      },
      {
        kind: 'added',
        text: 'The requests queue can be narrowed by month and by employee, with All months and All employees as the starting point so nothing pending is hidden until you ask for it. A leave range spanning a month boundary shows under both months.',
      },
      {
        kind: 'added',
        text: 'You can search the requests queue by person, reason or type. It sits on the right of the toolbar, away from the filters.',
      },
      {
        kind: 'improved',
        text: 'Search on Daily Records moved to the right of its toolbar, beside Export and Mark Attendance, so filters sit on one side and what you reach for by hand on the other.',
      },
      {
        kind: 'added',
        text: '"Add for someone else" now covers exceptions and overtime, not just leave and WFH. Both always join the queue as pending, whoever files them, and both record who filed them — a request entered for you shows that name under the reason.',
      },
      {
        kind: 'fixed',
        text: 'A long reason on a request wraps onto as many lines as it needs instead of being cut off mid-sentence, and the queue tabs are sized to sit with the controls beside them.',
      },
      {
        kind: 'improved',
        text: 'A request entered for somebody now carries an "Added by ‹name›" chip in the queue, beside the type, so you can tell at a glance which requests an employee raised themselves and which HR put in on their behalf. It used to be the dimmest line on the row, under the reason. Search matches the filer\u2019s name too.',
      },
      {
        kind: 'improved',
        text: 'The attendance count in the sidebar is now what is waiting on you rather than what is waiting. A request you filed for somebody else drops off your own count — you are the one person who cannot approve it — and shows on the counts of the people who can. Whoever has to sign off what HR enters can now see that it is theirs, instead of it hiding inside a total everybody shared.',
      },
      {
        kind: 'fixed',
        text: 'Pressing Approve on a request you filed for somebody else no longer returns a database error. You were never allowed to decide on one — putting a request in and waving it through are meant to be two people — but the queue offered the buttons anyway. It now shows those rows as "Waiting on someone else", and says why on hover.',
      },
      {
        kind: 'improved',
        text: 'Who may decide on a request is no longer a list of role names. It is the rule itself: you cannot review your own request, or one you filed for somebody else, and anyone else who can approve requests may. Nothing changes about who signs off what today; a role built on the Roles screen now gets the reach it was given.',
      },
      {
        kind: 'improved',
        text: 'Deleting a task now deletes it, the same as a project. It used to leave the task as a hidden row while its comments, files and subtasks were already gone for good — a husk nothing could reach, since every list filters it out and no screen shows it. Hours logged against the task go with it, so the confirmation now counts those too.',
      },
      {
        kind: 'improved',
        text: 'Deleting a project now deletes it. It used to hide the project and its tasks while permanently removing everything else — comments, files, stages, staffing — and there was no screen to find a hidden project on and no way to restore one, so the half that looked recoverable never was. The confirmation says plainly that it cannot be undone.',
      },
      {
        kind: 'fixed',
        text: 'Deleting a project that had a linked file — a Google Doc rather than an upload — no longer reports a failure it did not have. The link has no file behind it, and the empty entry made the whole clean-up request fail after the deletion had already gone through.',
      },
      {
        kind: 'fixed',
        text: 'Taking somebody off a service now takes them off its tasks too. Assigning a person to a task adds them to that service, and removing them from it used to leave them assignee and reviewer on the work — off the roster, still holding the job. Removing now asks first, showing how many tasks they are assignee and reviewer on in the same boxes a project deletion uses; their comments stay where they are.',
      },
      {
        kind: 'fixed',
        text: 'Creating a task no longer fails with a database error. The status box started empty and the save sent that emptiness to the database, which refused it. A new task now starts on the default column, so it saves whether or not you touch the field.',
      },
      {
        kind: 'improved',
        text: 'Board columns look like what they are. Each one wears its colour as a bar across the top of its header, with an icon in front of its name read from what the column means — a bin for Blocked, an eye for Review, a tick for Completed. Custom columns get one too.',
      },
      {
        kind: 'improved',
        text: 'Board lanes are wider, so card titles, dates and assignees stop being squeezed. The board still scrolls sideways when there are more columns than screen.',
      },
      {
        kind: 'improved',
        text: 'A project’s Team tab uses the full width instead of stranding one service card in the left half of an empty screen. Each service is its own block, colour-marked down the edge, with its people in a grid that fills the row.',
      },
      {
        kind: 'improved',
        text: 'A project with no services yet says so on its Team tab, with a way to add one, instead of showing nothing at all.',
      },
    ],
  },
  {
    version: '1.24.0',
    date: '2026-08-30',
    title: 'Channels you can actually run',
    entries: [
      {
        kind: 'improved',
        text: 'Pinned items show what they actually are. A pinned channel shows its name behind a #, a pinned direct message shows the other person’s picture, and pinned projects and tasks carry their own icons. Names too long for the menu show in full beside it when you hover.',
      },
      {
        kind: 'improved',
        text: 'Pinned names follow renames. They are read live rather than frozen at the moment you pinned them, so a renamed channel or project no longer sits in your menu under a name nobody uses.',
      },
      {
        kind: 'added',
        text: 'Channel headings can be renamed and deleted straight from the conversation list, using the pencil and bin that appear on the heading. A channel is moved between headings from its own settings. All three were possible in the data and had nowhere to be done from.',
      },
      {
        kind: 'improved',
        text: 'A channel’s settings and its member list are now one dialog with three tabs: Overview for its name and heading, People for who is in it, and Permissions for who can post and who manages it. They used to be split between a panel and a separate popup, which is how the rename control went unfound.',
      },
      {
        kind: 'added',
        text: 'A channel can be set so only its managers post, turning it into an announcement channel. Everybody else still reads and reacts. Direct messages are unaffected.',
      },
      {
        kind: 'improved',
        text: 'Channels no longer have an owner. Any number of people can be managers instead, so a channel does not become unmanageable when one person leaves, and nothing implies somebody owns a conversation. Everyone who was an owner is now a manager.',
      },
    ],
  },
  {
    version: '1.23.2',
    date: '2026-08-30',
    title: 'Read ticks that actually tick',
    entries: [
      {
        kind: 'improved',
        text: 'Read receipts are now a tick on your own messages rather than a line of text under the last one. One grey tick is sent, two grey means some of the room has read it, two coloured means everybody has. Hover to see who.',
      },
      {
        kind: 'fixed',
        text: 'Ticks now update the moment somebody reads, instead of waiting for the page to be reloaded. Nothing was listening for other people opening the conversation.',
      },
      {
        kind: 'fixed',
        text: 'A message could briefly claim it had been seen by the person who sent it. It now shows nothing at all until the portal knows who you are.',
      },
      {
        kind: 'improved',
        text: 'Channels get receipts too, and they read honestly: two grey ticks while some of the room has caught up, coloured only once everyone has.',
      },
    ],
  },
  {
    version: '1.23.1',
    date: '2026-08-30',
    title: 'Attaching files to a task',
    entries: [
      {
        kind: 'fixed',
        text: 'Attaching a .rar or .7z archive to a task failed after the upload had already run, with nothing useful said about why. The upload box was accepting file types the storage itself would not take.',
      },
      {
        kind: 'fixed',
        text: 'Photos from an iPhone can now be attached to a task. They could always be posted into a conversation, so the same picture worked in chat and failed on the task the chat was about.',
      },
      {
        kind: 'improved',
        text: 'A file type that genuinely cannot be uploaded is now refused before the upload starts, saying so, rather than after it finishes.',
      },
    ],
  },
  {
    version: '1.23.0',
    date: '2026-08-30',
    title: 'Boards you can shape',
    entries: [
      {
        kind: 'added',
        text: 'Task statuses are no longer a fixed set of seven. Add the columns your work actually moves through, rename them, give them colours, and put them in the order you use. Every board follows immediately.',
      },
      {
        kind: 'added',
        text: 'One column can be marked as the one that notifies reviewers. Drag a card into it and whoever is named reviewer on that task hears about it. It follows the marker rather than the word, so a column called QA or Client sign-off works exactly the same.',
      },
      {
        kind: 'improved',
        text: 'A column can also be marked as needing sign-off, which only people who may approve tasks can move into, or as finished, which drops the task off My Day. A column still holding tasks cannot be deleted.',
      },
      {
        kind: 'improved',
        text: 'Project statuses have been taken off the Statuses screen. They are not board columns, nothing drags between them, and having them there implied a flexibility that was never there.',
      },
      {
        kind: 'improved',
        text: 'Teams now appear in their service colour when you tag one with @, so Design, Development and Marketing are recognisable before you have read the name.',
      },
    ],
  },
  {
    version: '1.22.0',
    date: '2026-08-29',
    title: 'One place for who takes part, and reports that stay in your lane',
    entries: [
      {
        kind: 'added',
        text: 'Settings → Participation is one grid of who is expected to check in, submit a standup, appear on the timesheet, run the task timer and earn points. It replaces a checkbox on the person, a separate standup screen, and a permission you had to remove; the timesheet and the timer had no way to exclude anyone at all.',
      },
      {
        kind: 'improved',
        text: 'Reports now show the projects you answer for. A team lead sees projects running their team’s service, a project manager sees the ones they manage, and opening a project report you have no part in is refused rather than answered.',
      },
      {
        kind: 'added',
        feature: 'can_manage_attendance',
        text: 'Filing leave or working from home for somebody else is back, as "Add for someone else" on the Requests screen. An admin doing it applies it at once; when HR does it, an admin still approves. That rule existed already and had simply lost its way in.',
      },
      {
        kind: 'fixed',
        feature: 'can_manage_attendance',
        text: 'Granting somebody working from home used to be approved on the spot whoever did it, so HR could put a person on WFH with nobody reviewing it. It now waits for an admin, the way filing leave for somebody always has.',
      },
      {
        kind: 'improved',
        text: 'The Requests screen says whose requests you are looking at, and the type filters only appear for people who review them. You could only ever see your own, but the screen read as though it were the whole company’s.',
      },
    ],
  },
  {
    version: '1.21.0',
    date: '2026-08-29',
    title: 'Replies, read receipts and team tags',
    entries: [
      {
        kind: 'added',
        text: 'Reply to a specific message. Hover it, press the reply arrow, and your message carries a quote of theirs; pressing the quote jumps back to the original. A reply reaches the person you answered even in a muted conversation, the same way a mention does.',
      },
      {
        kind: 'added',
        text: '"Seen by" appears under your most recent message, showing who has caught up. It reads how far each person has got in the conversation, so nothing new is recorded and nobody is tracked message by message.',
      },
      {
        kind: 'added',
        text: 'A message that tags you, tags a team you are on, or carries an @everyone is banded in amber. Scrolling back through a busy channel, the ones meant for you are now findable rather than lost in the run.',
      },
      {
        kind: 'added',
        text: 'Type @ and a team name to tag a whole team. It reaches that team’s members who are in the conversation, muted or not. Because it is loud, it takes its own permission, held by admins, HR, project managers and team leads. For anyone else the text still reads as written and notifies nobody.',
      },
      {
        kind: 'added',
        text: 'A conversation you have already read can be marked unread again from its menu, for the ones you cannot deal with yet.',
      },
    ],
  },
  {
    version: '1.20.0',
    date: '2026-08-29',
    title: 'Reviewers, and picking anyone you like',
    entries: [
      {
        kind: 'added',
        text: 'Tasks take reviewers, working the same way assignees do: any number of them, and a reviewer can open the task they are reviewing. Review was a status with nobody’s name against it, so there was no answer to who it was waiting on.',
      },
      {
        kind: 'added',
        text: 'A reviewer is notified the moment the task moves to Review, so the handover happens without anybody having to go and tell them.',
      },
      {
        kind: 'improved',
        text: 'The assignee and reviewer pickers now list everyone, not only the people already staffed on the service. Choosing someone new staffs them onto it, exactly as choosing a service the project does not run adds the service. Assigning work used to mean leaving the form, staffing the person, and coming back, which is how so much of it ended up with whoever happened to be there.',
      },
    ],
  },
  {
    version: '1.19.0',
    date: '2026-08-29',
    title: 'A project can have more than one manager',
    entries: [
      {
        kind: 'added',
        text: 'A project takes any number of managers instead of exactly one. Co-managed work no longer has to nominate a figurehead and leave the other manager invisible to everything that asks who runs it.',
      },
      {
        kind: 'improved',
        text: 'Managing a project now means you can open it and see every task in it, even with no service staffing at all. Managing something you could not open was the state a manager was genuinely in.',
      },
      {
        kind: 'improved',
        text: 'A project manager now sees the work of the projects they manage, rather than the work of whoever shares a team with them. A manager answers for their projects, and that is now what the portal shows them.',
      },
      {
        kind: 'improved',
        text: 'A project’s managers can be tagged in comments on its tasks, whether or not they are staffed on the service the task belongs to. The one person answering for the work could not previously be pulled into a conversation about it.',
      },
    ],
  },
  {
    version: '1.18.0',
    date: '2026-08-29',
    title: 'Files that go when their owner does',
    entries: [
      {
        kind: 'fixed',
        text: 'Deleting a project failed outright if anyone had ever written a standup against it. The entry lost its subject as the project went and the whole delete was refused. Those entries now keep the project name they were written with, and the delete goes through.',
      },
      {
        kind: 'fixed',
        text: 'Files no longer outlive what they were attached to. Deleting a task, project, lead, message or whole conversation used to remove the record and leave the file itself sitting in storage for ever. Every one of those paths now clears the file too.',
      },
      {
        kind: 'improved',
        text: 'Taking a file back out of the chat box while it is still uploading now actually cancels it, instead of letting it finish quietly into nothing. The same goes for files staged against an edit you then abandon.',
      },
    ],
  },
  {
    version: '1.17.1',
    date: '2026-08-29',
    title: 'Shorter addresses, and a fix for creating tasks',
    entries: [
      {
        kind: 'fixed',
        text: 'Creating or editing a task failed with a permissions error, even for an admin. The task was in fact being saved and only the read-back afterwards was refused, so the screen reported a failure for something that had worked. Fixed, and a task now records who created it.',
      },
      {
        kind: 'improved',
        text: 'Projects, Tasks, Clients and Reports have moved out of /admin: they are at /projects, /tasks, /clients and /reports. They are the day job, not governance, and the address said otherwise. Every old link still works and lands in the same place, bookmarks and pasted links included.',
      },
      {
        kind: 'improved',
        text: 'The Projects list no longer offers a Board view. Cards, Table and Backlog are ways of finding a project; moving one along belongs inside it, where the board still is.',
      },
    ],
  },
  {
    version: '1.17.0',
    date: '2026-08-28',
    title: 'Knowing what changed',
    entries: [
      {
        kind: 'added',
        text: 'A dot appears beside the arrow next to the logo when a release has shipped that you have not opened yet. Opening the changelog clears it. Nothing is sent to you and nothing interrupts you, it is just there when you next look.',
      },
      {
        kind: 'added',
        feature: 'can_publish_releases',
        text: 'A release worth telling everybody about can be announced from the changelog. Press Announce beside it and every active member of staff gets a notification linking back to it. A version can only go out once, and the entry afterwards says how many people it reached.',
      },
      {
        kind: 'improved',
        text: 'The changelog and the handbook now show you only what applies to you, using the same rules that decide what is in your menu. A release about a screen your role cannot open no longer appears at all, rather than describing something you cannot go and try.',
      },
      {
        kind: 'improved',
        text: 'Versions are now three numbers rather than two. The last one moves when a release only improved or fixed things, the middle one when something new arrived. Every past release has been renumbered to match, so the history reads the same way.',
      },
    ],
  },
  {
    version: '1.16.0',
    date: '2026-08-28',
    title: 'A standup that fills itself in',
    entries: [
      {
        kind: 'improved',
        text: 'Press “Fill them in” and anything you ran a timer on arrives with its time already in the box. Tasks that were only in progress or commented on still come in empty, because nothing measured how long they took, and an invented number is slower to correct than an empty box is to fill.',
      },
      {
        kind: 'added',
        text: 'Hours with no project behind them are now a first-class option rather than something to hunt for. “Add time with no project” offers ready-made titles for the ones that keep coming up: a meeting, an office quest, onboarding, a stretch with nothing assigned. An empty first card can be turned into one with “This was not project work”.',
      },
      {
        kind: 'added',
        text: 'When only the tail of the day is unaccounted for, every Time spent box carries a “+ 2h 15m left” link that drops the whole remainder onto that row. No more working out what is missing.',
      },
    ],
  },
  {
    version: '1.15.0',
    date: '2026-08-28',
    title: 'Drop a single day from a longer request',
    entries: [
      {
        kind: 'added',
        text: 'Leave and WFH requests covering more than one day now have a Days button in the queue. It lists every day the request covers, and any one of them can be removed. Removing takes two clicks, because it rewrites that day of somebody’s attendance.',
      },
      {
        kind: 'improved',
        text: 'The rest of the request stays approved, so nobody reapplies for the days that never changed. A leave day removed this way goes back to the person’s balance, and their attendance for that day returns to a normal working day. Taking a day out of the middle leaves two requests, one either side of the gap.',
      },
    ],
  },
  {
    version: '1.14.4',
    date: '2026-08-28',
    title: 'Less chrome, fewer dead ends',
    entries: [
      {
        kind: 'improved',
        text: 'Screens stopped repeating their title. The name in the top bar was being printed again as a heading, often with a sentence describing the screen you were already looking at. Live counts stayed; the descriptions went.',
      },
      {
        kind: 'improved',
        text: 'A task now always opens in the side panel over its project, whether you got there from a notification, search, your timer, a profile, or a pasted link. The full-page task view and its Open full page button are gone. Old links still work and land in the panel.',
      },
      {
        kind: 'improved',
        text: 'The Projects list no longer has a Board view. Dragging a whole project between status columns was a second way to set a field the project page already owns, on a screen whose job is finding a project rather than working one. Cards, Table and Backlog remain, and the board inside a project is untouched.',
      },
      {
        kind: 'improved',
        text: 'Writing a task description now uses the same editor as reading one, so / commands and @ mentions work while you are creating the task instead of only after it exists. Anyone tagged is notified once it saves.',
      },
      {
        kind: 'fixed',
        text: 'Deleting the newest message in a conversation no longer leaves it quoted in the conversation list. The thread still shows that a message was deleted; the list moves on to the newest one that is actually there.',
      },
    ],
  },
  {
    version: '1.14.3',
    date: '2026-08-28',
    title: 'Tasks follow assignment',
    entries: [
      {
        kind: 'improved',
        text: 'Whose tasks you can see now follows assignment rather than project staffing. Being on a project used to show you every task in it, including work that had nothing to do with you. Team leads and project managers keep sight of the people they share a team with, and unassigned work stays visible to them so a backlog can still be handed out.',
      },
      {
        kind: 'improved',
        text: 'The Mine / My team / Everyone switch now only offers what your role allows, and disappears entirely when there is a single option. A switch that cannot change anything was just something else to wonder about. The banner stays quiet when your lens is already as wide as it goes.',
      },
      {
        kind: 'fixed',
        text: 'A link to a task you cannot open, from an old bookmark, or from being tagged in one that is not yours, now says the task is unavailable instead of showing an empty page.',
      },
    ],
  },
  {
    version: '1.14.2',
    date: '2026-08-28',
    title: 'My Day, sharpened',
    entries: [
      {
        kind: 'improved',
        text: 'Your work now carries each task’s status and priority, its due date, and counts of subtasks, comments and attachments, along with anyone it is shared with. Overdue and Due today became flags beside the status rather than a chip standing in for it, so a task can read as In review and overdue at the same time.',
      },
      {
        kind: 'improved',
        text: 'Clicking a task in Your work opens it in the side panel of its project, with the board still behind it. The same panel the board itself uses. Closing it leaves you where you were instead of on a page you have to navigate back from.',
      },
      {
        kind: 'improved',
        text: 'Out today now lists the people you share a team with rather than the whole company. Being on several teams widens it on its own, and HR and admins still see everybody. The full roster is one click away under Roster.',
      },
      {
        kind: 'fixed',
        text: 'A mention stops sitting in Waiting on you once you have replied on that task. It used to stay until somebody thought to mark the notification read, so a thread you had already answered kept a number on the menu.',
      },
    ],
  },
  {
    version: '1.14.1',
    date: '2026-08-26',
    title: 'One less screen, and a clearer name',
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
        text: 'The bell in the top bar and "View all" now open the full Notifications screen, with the Waiting on you tab, category filters and Unread, rather than a shorter list of the same notifications.',
      },
    ],
  },
  {
    version: '1.14.0',
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
        text: 'Pin any screen to the top of the menu. Hover a menu row and press the pin that appears on it, or use the pin button in the top right for anything else. A project you are living in, a chat channel, a board. Pins are yours alone, and the Pinned section only appears once you have one.',
      },
      {
        kind: 'improved',
        text: 'The Mine / My team / Everyone switch moved out of the top bar and into the filter row of the screens it actually affects, beside the other filters. Inside a single project it sits with that project’s own controls.',
      },
    ],
  },
  {
    version: '1.13.0',
    date: '2026-08-26',
    title: 'Mine, my team, or everyone',
    entries: [
      {
        kind: 'added',
        text: 'My team is a new lens on the projects and tasks screens, work belonging to anyone who shares a team with you. Someone on several teams counts on all of them.',
      },
      {
        kind: 'improved',
        text: 'The banner that tells you a list is filtered now names which lens is on and still counts what it hid, so a nearly empty board is never a mystery. Your previous Me setting carries over as Mine.',
      },
    ],
  },
  {
    version: '1.12.0',
    date: '2026-08-26',
    title: 'One door for reports, one for admin',
    entries: [
      {
        kind: 'added',
        text: 'Reports gained Timesheet and Attendance tabs. Project backlog, employee backlog, the timesheet and the attendance reports were four screens in three different menu sections; finding a number meant already knowing which module produced it. They are now four tabs in one place.',
      },
      {
        kind: 'added',
        feature: ['can_manage_attendance', 'can_view_audit_log'],
        text: 'Admin is a console, at its own short address. Terminals, Enrolled Devices, and Schedule & holidays moved out of the Attendance menu and joined the Audit Log behind one Admin row. The count on that row is what is waiting inside, devices to approve and unseen audit entries. So folding them away never hides work.',
      },
      {
        kind: 'improved',
        feature: 'can_govern_gamification',
        text: 'Gamification’s “Settings” is now called Governance, on the page as well as in the menu, because that is what it is, granting XP and deciding who takes part. Its address changed to match; the old link still works. The actual gamification rules live in Settings → Gamification, where the standup and attendance rules already were.',
      },
      {
        kind: 'fixed',
        text: 'In the Admin console, a long section name pushed its icon and the arrow marking the open section off the row. The name now shortens instead.',
      },
      {
        kind: 'improved',
        text: 'Timesheet and the per-module Settings rows are gone from the menu. Every screen is still reachable, Timesheet from Reports, the rule-sets from Settings, and old links keep working.',
      },
    ],
  },
  {
    version: '1.11.0',
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
    version: '1.10.0',
    date: '2026-08-26',
    title: 'My Day',
    entries: [
      {
        kind: 'added',
        text: 'My Day is the new first item in Workspace, and where you land when you open the portal. Meetings today with the next one marked and a Join link; your overdue, due-today and in-progress work with a Start button for the timer; the standup prompt while its window is open; unread notifications and claimable quests; and a short list of who is out.',
      },
      {
        kind: 'improved',
        text: 'Your own work is now gathered from every way a task can be assigned to you, on your own or alongside other people. So a shared task no longer goes missing from your list.',
      },
      {
        kind: 'improved',
        text: 'Dashboard stays where it is, for the company-wide picture. My Day is only ever about you.',
      },
    ],
  },
  {
    version: '1.9.0',
    date: '2026-08-26',
    title: 'Attendance, in three views instead of eleven',
    entries: [
      {
        kind: 'added',
        text: 'Requests is one queue for all four kinds of request, leave, WFH, exceptions and overtime. It opens on Pending, each type filter carries its own count so you can see where the backlog is, and Approve and Reject work right on the row. This replaces four separate menu items.',
      },
      {
        kind: 'added',
        text: 'Calendar shows the month at a glance: public holidays and company off days shaded and named, working Saturdays labelled, and a count on every day of who is off and who is working from home. Press a day to see exactly who.',
      },
      {
        kind: 'improved',
        text: 'The Attendance menu is three views and the admin pages behind them, instead of eleven rows. Leave, WFH, Exceptions and Overtime are gone from the menu. They live in Requests now, with their pending counts summed onto that one row.',
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
        text: 'Everyone can see who is in today, not just managers. That was the question people were asking in chat. Check-in times, the late flag and which kind of leave someone took stay private: those show only for yourself, for people on your teams, and to whoever manages attendance.',
      },
    ],
  },
  {
    version: '1.8.0',
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
    version: '1.7.1',
    date: '2026-08-25',
    title: 'Checking in from home, and from the office WiFi',
    entries: [
      {
        kind: 'fixed',
        text: 'Checking in on an approved work-from-home day works again. On-site staff are normally sent to the fingerprint terminal, and that rule was being applied before anyone checked whether it was a WFH day. So the Check In (WFH) button was offered at home and every press came back “Please check in at the biometric terminal”. An approved WFH day now skips the terminal and the office-WiFi rule entirely.',
      },
      {
        kind: 'added',
        text: 'On the office WiFi, you can check in from the portal instead of the terminal. The card says “Office WiFi detected” when it recognises the network. Off the office network, on-site staff are still sent to the terminal as before.',
      },
    ],
  },
  {
    version: '1.7.0',
    date: '2026-08-24',
    title: 'Won deals build their own projects, and campaigns get their privacy',
    entries: [
      {
        kind: 'improved',
        feature: 'can_view_bd',
        text: 'The handoff on a won lead now builds the project rather than recording an intention to. Confirming it creates the client, the project, a service block for every service you ticked, the starting pipeline you chose for each, and the people you staffed onto them. The project is in Projects the moment the modal closes.',
      },
      {
        kind: 'added',
        feature: 'can_view_bd',
        text: 'A handoff can now cover several services at once. Every service the deal was sold against is ticked for you and each gets its own block, so a deal that bought design, development and marketing arrives as one project with three service blocks instead of three separate conversations.',
      },
      {
        kind: 'added',
        feature: 'can_view_bd',
        text: 'You can staff each service during the handoff, and set the project’s start date and deadline while you are there. Both are optional, leave them and the manager picks them up.',
      },
      {
        kind: 'added',
        feature: 'can_view_bd',
        text: 'The handoff now asks which client the work is for, rather than guessing. Pick an existing client, or name a new one, prefilled from the lead, and flagged if that name already exists so the same account cannot end up in the list twice. Leads are usually named after the deal, so this is worth a glance.',
      },
      {
        kind: 'improved',
        feature: 'can_view_bd',
        text: 'BD campaigns are now private to the people on them. You see a campaign if you own it, created it, or were added to its team, and creating one, or being handed one as its owner, puts you on it automatically. Whoever runs BD still sees every campaign. Until now every campaign was visible to everyone in the department: the Projects screen had a filter meant to prevent that, but it never took effect.',
      },
      {
        kind: 'improved',
        text: 'Tasks follow their campaign, so the Tasks board no longer lists, and names, work from campaigns you were deliberately left off. A task assigned to you, one you raised, or one attached to no campaign stays visible either way.',
      },
      {
        kind: 'added',
        text: 'Campaigns can be edited after they are created. Press Edit on the campaign, or the pencil on its card in Projects, to change the name, owner, status, deadline, channels or team. Owner and deadline in particular had no way to be changed at all once a campaign existed.',
      },
      {
        kind: 'fixed',
        feature: 'can_view_bd',
        text: 'A BD task’s linked lead is now a link, press it to open that lead in the Pipeline. The link had been built but was never switched on, so the field named a lead you then had to go and find by hand.',
      },
      {
        kind: 'fixed',
        feature: 'can_view_bd',
        text: 'A note written on Daily Updates is now visible. If you logged no outreach and hosted no meetings that day, your note was stored correctly and then shown to nobody, not to your team, and not to you. Because the feed only listed people with logged activity. Writing a note now counts as checking in.',
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
        feature: 'can_view_bd',
        text: 'Handing off used to record the handoff on the lead and nothing else. The project it named was never created, and the lead’s timeline said it had been handed over regardless. Old handoffs that were left dangling this way still show on their leads; if one names a project that was later created by hand, ask an admin to link the two.',
      },
    ],
  },
  {
    version: '1.6.0',
    date: '2026-08-23',
    title: 'Linknbit 3.0. The portal gets the new brand',
    entries: [
      {
        kind: 'improved',
        text: 'The whole portal has been restyled to the Linknbit 3.0 brand. Everything is set in Poppins, the deep navy ground is now near-black with a soft red wash behind it, and the brand red has moved to the 3.0 red. The corners are the loudest change: cards, panels, buttons, inputs, chips, badges and progress bars are all square now. Avatars and status dots stay round.',
      },
      {
        kind: 'improved',
        text: 'Colours that mean something were deliberately left alone. Design stays violet, Development stays cyan and Marketing stays amber, and approved-green, blocked-red and the warning ambers are unchanged. A board you have learned to read at a glance still reads the same way.',
      },
      {
        kind: 'added',
        text: 'You can now pick your own colour theme, in Profile → Appearance. Choose one and the whole portal changes at once, sidebar, top bar, tables, inputs, dialogs and the page background, with no reload. The choice is yours alone and follows you to any device you sign in from; it changes nothing for anyone else.',
      },
      {
        kind: 'improved',
        text: 'Section labels, column heads and the small capitalised text throughout are set wider and more consistently, so a screen full of tables is easier to scan for the heading you want.',
      },
      {
        kind: 'improved',
        text: 'The client portal keeps its warm cream look, deliberately. It is what a client sees, and it is meant to read as a delivered product rather than as the internal tool. It picks up Poppins and the new brand red so the two still feel like one company.',
      },
    ],
  },
  {
    version: '1.5.0',
    date: '2026-08-17',
    title: 'Business Development goes live',
    entries: [
      {
        kind: 'added',
        text: 'The backlog drill-downs now go all the way down to the task. Under the summary sits every task with both clocks against it, its status, who it is assigned to and the estimate where one was set, for a project, and for a person across the projects they went to. Each table has its own CSV.',
      },
      {
        kind: 'added',
        feature: 'can_view_reports',
        text: 'A project’s task breakdown also lists still-open tasks that recorded no time at all in the range, which is the thing a delivery lead most wants to spot and the one thing a table built from time entries can never show. One button hides them again.',
      },
      {
        kind: 'improved',
        text: 'The task breakdown adds up to the summary above it, and shows its working. Standup time written against a project without naming a task, about two thirds of it, gets its own line rather than being shared out across the tasks, and a deleted task that still carries logged time keeps its row, struck through and marked, instead of quietly vanishing and leaving the totals short.',
      },
      {
        kind: 'fixed',
        text: 'Opening a row in the backlog reports now shows the breakdown. Both drill-downs. A project by the people who worked on it, and a person by the projects they went to, were failing on every single call since the day they shipped, and the screen was reporting the failure as “nobody recorded time in this range”. The hours were always there; the page could not read them.',
      },
      {
        kind: 'improved',
        text: 'A report that cannot load now says so, instead of showing an empty table. The backlog reports, the drill-downs and the Timesheet each used to treat a failure and a genuinely empty range as the same thing, which turned a fault into a statement about your team. They now tell you the difference.',
      },
      {
        kind: 'added',
        feature: 'can_view_bd',
        text: 'BD tasks now take documents. Open a task, scroll to Documents, and drop a file in or paste a Google Doc, Sheet or Drive link. The same uploader, preview and Drive support that leads and delivery tasks already had. Anyone who can open Business Dev can read them; adding and removing is limited to whoever the task is assigned to, whoever raised it, and anyone who runs BD.',
      },
      {
        kind: 'fixed',
        feature: 'can_view_bd',
        text: 'The BD Tasks screen was hiding most of the department’s work. It opened filtered to your own tasks, and the control doing it sat collapsed behind the Filters button with nothing to say it was on. So a campaign’s tasks were plainly listed on its own page but missing from the Tasks board. Tasks now opens on the whole team, and the people picker sits in the open beside the project filter.',
      },
      {
        kind: 'improved',
        text: 'The Timesheet now lists everybody, not only the people who pressed start. A person who worked all day without the timer, a person on leave and a person who never turned up used to look identical, all three were simply missing. Each now has a row, and the four tiles above the chart say how many hours were tracked, how many timers are running, how many people were due in with nothing logged, and how many are away.',
      },
      {
        kind: 'improved',
        text: 'Each Timesheet row now reads as a day rather than a strip of blocks. The scale is a twelve-hour clock running the whole day, midnight to midnight, so the same time sits in the same place on every row and every date instead of the chart rescaling itself to whatever happened; the lighter band behind the bar is the hours that person was due in for with the lunch break cut out of it; a thin line underneath is when they actually checked in and out; leave, holidays and days off are labelled on the bar; and an approved late arrival, early departure or trip out shows as an amber band you can hover for the reason. Filter to “No time logged” to see only the people who were in with nothing against them, and the CSV now carries every person and their day, not just the segments.',
      },
      {
        kind: 'added',
        feature: 'can_view_bd',
        text: 'Business Development is no longer a preview. Leads, outreach, meetings, campaigns, tasks, daily check-ins and targets are all saved and shared, what you change, your colleagues see.',
      },
      {
        kind: 'added',
        feature: 'can_view_bd',
        text: 'Comment threads on leads, BD tasks and campaigns. Type “@” to tag a colleague and they are notified; comments from other people appear as they are posted, without reloading.',
      },
      {
        kind: 'added',
        feature: 'can_view_bd',
        text: 'Lead notes, BD task descriptions and campaign briefs are now written with the same editor as the rest of the portal, formatting, links and @mentions included.',
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
        text: 'Meetings carry a joining link. Paste the Zoom or Meet URL when you book one and everybody gets a Join button, on the meeting card, in the email, and in their calendar entry.',
      },
      {
        kind: 'fixed',
        text: 'Coming in for the second half of a day off is no longer recorded as late. Lateness on a first-half leave is now measured from the time the second half starts, and the attendance records that were wrongly marked late have been corrected.',
      },
      {
        kind: 'improved',
        text: 'Leave and WFH now appear under every day they cover, so you can see who is off on a given date. Each remains one request. The Approve and Reject buttons sit on its first day only.',
      },
      {
        kind: 'improved',
        text: 'A WFH request now takes a date range, so a whole week working remotely is one request and one approval instead of five.',
      },
      {
        kind: 'added',
        text: 'Partial WFH: request half a day from home and work the other half from the office. Say which half. It shows on your attendance as WFH · 1st or WFH · 2nd, and both halves count as worked.',
      },
      {
        kind: 'improved',
        feature: 'can_view_bd',
        text: 'Every BD change applies the moment you make it, dragging a card, ticking a step, editing a field. Nothing waits on a spinner, and if a save is refused the screen puts itself back and tells you.',
      },
      {
        kind: 'improved',
        feature: 'can_view_bd',
        text: 'The people pickers throughout BD now list your actual colleagues rather than sample names, and reassigning a lead or a task notifies whoever picks it up.',
      },
      {
        kind: 'fixed',
        feature: 'can_view_bd',
        text: 'Performance reporting is now measured off real records: the funnel counts your live pipeline, and the revenue chart books each deal to the month it closed rather than the month the lead arrived.',
      },
      {
        kind: 'fixed',
        feature: 'can_view_bd',
        text: 'You can now file a lead or a campaign for a colleague. Choosing anyone but yourself as the owner used to refuse the save; the record is now created and stays yours to edit as well as theirs.',
      },
      {
        kind: 'improved',
        text: 'Every request row now shows when it was raised and when it was decided, side by side, instead of hiding the review date behind an expander. A long reason is trimmed to three lines with a Read more, so one person’s essay no longer pushes the next request off the screen, and the status sits at the far right of every row with its “Day 2 of 3” marker beside it.',
      },
      {
        kind: 'fixed',
        text: 'Overtime is shown in hours and minutes. A 40-minute request read as “0.67h” everywhere it appeared, on the review screen, your own attendance page, a member’s profile and the team panel, and now reads “40m”.',
      },
      {
        kind: 'improved',
        text: 'Leave, WFH Requests, Exceptions and Overtime now look and work the same. All four are one list grouped by date, Exceptions and Overtime were tables, which meant the same request looked different depending on which screen you reviewed it from, and all four now use the same status pill, so an approved request no longer reads “Approved” on one screen and “approved” on another. The stat cards above each list are gone; they repeated what the list already shows and pushed the requests below the fold.',
      },
      {
        kind: 'added',
        text: 'Admins can remove an enrolled device outright, for a replaced handset or a duplicate enrolment that blocking alone never cleared off the list. Attendance history is untouched and the owner can enrol again.',
      },
      {
        kind: 'fixed',
        feature: 'can_view_bd',
        text: 'Profile photos now appear throughout Business Development. Lead cards, the pipeline table, the task board, meetings, targets and daily check-ins were all drawing initials even for people who had uploaded a picture.',
      },
      {
        kind: 'fixed',
        feature: 'can_view_bd',
        text: 'Last contacted no longer shows the day a lead was added. It stays blank until outreach is actually logged, and a lead nobody has contacted reads “Not contacted” rather than appearing to have been spoken to today.',
      },
      {
        kind: 'added',
        feature: 'can_view_bd',
        text: 'A deal can be quoted in any currency, 166 of them, covering every country that has one. Pick it beside the estimated value, search the list by country if the code escapes you, and the lead keeps showing that currency everywhere while the pipeline totals convert it to PKR. Rates refresh daily, and the one used is shown as you type and frozen onto the lead when you save.',
      },
      {
        kind: 'added',
        feature: 'can_view_bd',
        text: 'Import a list of prospects into the pipeline from a spreadsheet. Pipeline → Import CSV takes the file, shows you exactly what it is about to create, and lists any row it could not read with its line number. The rows it can read still go in.',
      },
      {
        kind: 'added',
        text: 'Rewards can carry a picture. Upload one when you add or edit a reward, JPG, PNG, WebP or GIF up to 5 MB, and it shows on the card in the shop; replace or remove it at any time, and the plain gift icon comes back.',
      },
      {
        kind: 'improved',
        text: 'Rewards are now added from the Rewards Shop itself. The Add Reward button and the full catalog, including anything currently disabled, sit under the shop, so you edit the list while looking at what everyone else sees.',
      },
      {
        kind: 'improved',
        text: 'Gamification approvals moved off the Settings page onto their own Approvals screen: quest proofs, shoutouts and reward redemptions in one place, with a count of what is waiting on you. Settings now holds only the quest list, granting XP, who takes part, and Employee of the Month.',
      },
      {
        kind: 'added',
        text: 'The standup now asks you to account for your whole day. The form shows how many hours that is. Your working day less the new lunch break, and the bar turns green when what you have logged matches it. Time off is taken off the total for you: half a day of leave, a late arrival or an approved trip out each reduce what you owe, and overlapping ones only count once.',
      },
      {
        kind: 'fixed',
        text: 'The employee backlog no longer demands hours from people who are never asked for a standup. Admins, HR and anyone excluded from the routine were each showing a full month of required hours, and a full month of shortfall against it. Holidays and leave were always handled correctly; participation was the piece missing.',
      },
      {
        kind: 'added',
        text: 'Exceptions are now unpaid time you work back, rather than hours that simply disappear. Take two hours out and that day asks for six. You were not there. But the same two hours are recorded as make-up time. Log over the requirement on any later day and the balance comes down. The standup shows what you owe and how far over you may go; the backlog and its CSV carry unpaid, made-up and outstanding as their own figures.',
      },
      {
        kind: 'added',
        text: 'Backlog rows open into a screen of their own. A project shows which people put the hours in; a person shows which projects they went to, timer, standup and variance for each, plus their own CSV export. The range you were reading carries across in the link, so it is worth pasting to a colleague.',
      },
      {
        kind: 'improved',
        feature: 'can_view_reports',
        text: 'Reports moved from Admin to Delivery, beside the Timesheet, reading where the hours went is delivery work, not governance.',
      },
      {
        kind: 'improved',
        text: 'The timesheet bar shows its detail in a proper card that appears the moment you hover, instead of waiting on the browser’s own tooltip. Task, project, exact times and duration, styled like the rest of the portal.',
      },
      {
        kind: 'added',
        text: 'A Timesheet screen under Delivery: who has a timer running this minute, and a bar of each person’s day showing which task ran from when to when. Hover a block for the detail, step through days with the arrows, export the lot as CSV. Only tracked time is drawn. The gaps are left as gaps, because a filled-in guess is not a record.',
      },
      {
        kind: 'added',
        text: 'Reports is real. Project backlog and Employee backlog over today, this week, this month or any custom range, each with search and a CSV export. It replaces the sample charts that were there before.',
      },
      {
        kind: 'improved',
        text: 'Backlog reports show the timer and the standup side by side and never add them together. They measure the same hours two different ways and routinely disagree. The variance between them is its own column, and it is the number worth reading: far more standup time than timer time means work is happening without the timer, and the reverse means work nobody wrote up.',
      },
      {
        kind: 'added',
        text: 'The standup fills itself in. Open it and a banner lists the tasks you actually worked on today, anything you ran a timer on, anything assigned to you and in progress, anything you commented on, and one press drops them into the form. Times and descriptions stay blank, because the timer rarely covers a whole day and a wrong number is slower to fix than an empty one.',
      },
      {
        kind: 'added',
        text: 'Work that belongs to no project now has somewhere to go. “Add other work” takes a title, a description and the time, for the errand, the interview panel, the afternoon lost to a fire drill. It counts towards your hours like anything else, and has nothing to do with quests or XP.',
      },
      {
        kind: 'improved',
        text: 'Standups are written project by project, with a row for each task you worked on and its own description, no more cramming three tasks into one box. Descriptions take bold, italic, lists and links.',
      },
      {
        kind: 'added',
        text: 'A lunch break can be set under Settings → Attendance. It is unpaid, so it comes off the working day, and that is what decides how much work a standup has to account for, 09:00 to 18:00 with an hour for lunch is eight hours, not nine.',
      },
      {
        kind: 'improved',
        text: 'Attendance, Standup and Gamification settings now live as tabs in the main Settings screen instead of being scattered through their own modules, and all three are laid out the same way. The day-to-day screens, registers, approvals, the quest board, stay exactly where they were.',
      },
      {
        kind: 'added',
        text: 'The standup rules are configurable at last. When it opens (a set number of minutes before the day ends, or a fixed time), how long it stays “on time”, what an on-time standup is worth, and the minimum length of a task description, all of it was previously fixed in code.',
      },
      {
        kind: 'added',
        feature: 'can_view_bd',
        text: 'A lead now holds the rest of what you know about a prospect: their website, country and city, as many social profiles as they have, and the documents you sent them. Each with a title and a link. Social links need no picking from a list; paste the address and the platform is recognised from it. All of it shows on the lead beneath Services.',
      },
      {
        kind: 'added',
        feature: 'can_view_bd',
        text: 'Leads have a Documents tab, the same one projects have had: drop a file to upload it, or link a Google Doc, Sheet, Slide deck or Drive file. Press the eye and it opens inside the portal, Google documents, PDFs, images and spreadsheets all preview in place rather than sending you off to another tab.',
      },
      {
        kind: 'added',
        text: 'Document titles fill themselves in. Paste a link and the portal reads the document’s own name off it, “Q3 Proposal”, not “docs.google.com/document/d/1a2b3c”. Upload a file and its filename is used. Either way you can type over it. A document that needs sign-in cannot be read, and the portal says so instead of guessing.',
      },
      {
        kind: 'improved',
        feature: 'can_view_bd',
        text: 'The CSV importer takes the new fields too, website, country, city, where the lead came from, social links and documents. So a spreadsheet no longer has to leave half of itself behind at the door.',
      },
      {
        kind: 'added',
        feature: 'can_view_bd',
        text: 'Pipeline cards can be dragged up and down inside a column, not just across to the next stage. The card lifts out, the ones below close up, and an empty slot follows your cursor so you can see exactly where it will land. The order you set is saved for the whole department. It works under the new Manual order sort, which is now the default. The other sorts arrange the column for you, so dragging within one is not offered there.',
      },
      {
        kind: 'added',
        text: 'Gamification reviewers are now told when something needs them: quest proof submitted, a shoutout given, a reward redeemed or a group reward filled. Each notification opens the Approvals screen, and a red count beside Approvals in the sidebar shows how many items are waiting on you.',
      },
      {
        kind: 'improved',
        text: 'Recognition notifications now open the screen they are about. A badge opens Badges, a redemption opens the Rewards Shop, instead of dropping you on the leaderboard to find it yourself.',
      },
      {
        kind: 'improved',
        text: 'Quests are managed entirely from the Quest Board now: post, edit and delete on the card itself. The duplicate list under Settings is gone.',
      },
      {
        kind: 'improved',
        text: 'Holidays are listed newest first, and one that has not happened yet is marked Upcoming, Today on the day itself. So the next day off is at the top instead of buried under the year so far.',
      },
    ],
  },
  {
    version: '1.4.0',
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
        text: 'Settings has moved to the bottom of the sidebar, pinned below a divider, and stays put while the rest of the list scrolls. Delivery now reads in the order work actually travels, clients, then projects, then tasks, and the People section groups the directory pages together above Attendance and Gamification.',
      },
    ],
  },
  {
    version: '1.3.0',
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
    version: '1.2.0',
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
    version: '1.1.0',
    date: '2026-07-31',
    title: 'Fingerprint check-in and task history',
    entries: [
      { kind: 'added', text: 'Fingerprint check-in through the office terminal, with the portal button kept as a fallback when the device is offline.' },
      { kind: 'added', text: 'Every task now carries a full activity feed of what changed, when and by whom.' },
      { kind: 'improved', text: 'Names are clickable everywhere, task, comment, standup, leaderboard, chat, and all open the same profile.' },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-07-27',
    title: 'Team chat and the services model',
    entries: [
      { kind: 'added', text: 'Team chat: channels, direct messages, file sharing, reactions, replies, @-mentions and content search.' },
      { kind: 'added', text: 'Private channels with managed membership.' },
      {
        kind: 'added',
        text: 'Projects are now organised by service, Design, Development and Marketing each carry their own stages, tasks and people, so you only see the pipeline you work in.',
      },
      { kind: 'added', text: 'Team pages, with reusable project templates a team can apply to a new service in one action.' },
      { kind: 'added', text: 'Standup history, team board and participation settings.' },
    ],
  },
  {
    version: '0.9.0',
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
    version: '0.8.0',
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
    version: '0.7.0',
    date: '2026-07-15',
    title: 'Push notifications and group rewards',
    entries: [
      { kind: 'added', text: 'Push notifications, enabled per device, with per-event-type preferences.' },
      { kind: 'added', text: 'Group rewards, club together on a pooled reward and contribute an equal share each.' },
      { kind: 'added', text: 'Company-wide work-from-home days.' },
    ],
  },
  {
    version: '0.6.0',
    date: '2026-06-23',
    title: 'Designations and check-in policy',
    entries: [
      { kind: 'added', text: 'Designations, and team membership management.' },
      { kind: 'added', text: 'Per-person allowed check-in time, for anyone on a different schedule.' },
      { kind: 'added', text: 'Attendance exclusion for roles that are not tracked.' },
    ],
  },
  {
    version: '0.5.0',
    date: '2026-06-18',
    title: 'Profiles, mobile and installable app',
    entries: [
      { kind: 'added', text: 'Profile page with avatar upload and password change.' },
      { kind: 'added', text: 'A mobile layout with a bottom tab bar, and the portal became installable as an app.' },
      { kind: 'added', text: 'Points history. A full ledger of every point earned and spent.' },
      { kind: 'added', text: 'Device enrolment and approval for shared check-in devices.' },
      { kind: 'added', text: 'Password reset by email.' },
    ],
  },
  {
    version: '0.4.0',
    date: '2026-06-05',
    title: 'Recognition, people and services',
    entries: [
      { kind: 'added', text: 'Gamification rebuilt: quest board, shoutouts, badges, rewards shop and a monthly reset.' },
      { kind: 'added', text: 'People management, invite staff, set roles, control access.' },
      { kind: 'added', text: 'Work-from-home and leave requests, synced into the attendance record.' },
      { kind: 'added', text: 'A configurable service catalogue.' },
    ],
  },
  {
    version: '0.3.0',
    date: '2026-05-24',
    title: 'Attendance',
    entries: [
      { kind: 'added', text: 'Check in and out, with attendance history and monthly stats.' },
      { kind: 'added', text: 'Overtime, out-of-office and exception requests.' },
      { kind: 'added', text: 'Schedule-aware check-in that knows your working day.' },
    ],
  },
  {
    version: '0.2.0',
    date: '2026-05-20',
    title: 'Accounts',
    entries: [
      { kind: 'added', text: 'Sign-in, invitations and role-based access to the portal.' },
    ],
  },
  {
    version: '0.1.0',
    date: '2026-05-18',
    title: 'First build',
    entries: [
      { kind: 'added', text: 'The portal shell: dashboard, projects, tasks, teams, settings and the client-facing views.' },
    ],
  },
]
