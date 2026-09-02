import type { ProductModule, RoadmapItem } from '../../types'

/**
 * The Product Purpose page — what this portal is, who it is for, and how far
 * along it is.
 *
 * Two readers, one document. Somebody being pitched the product reads the top
 * half and learns what it replaces; the product owner reads the bottom half and
 * learns whether we are on track. Splitting them into two documents is what
 * lets the sales half quietly drift ahead of the build.
 *
 * ── The rule this page lives by ───────────────────────────────────────────────
 * Every `state: 'live'` claim below is something a person can open in the
 * portal today and use against real data. A screen that exists but renders
 * `src/data/mock` is `'partial'`, not `'live'` — the client portal is the
 * standing example, and calling it finished is exactly the oversell this page
 * is meant to prevent.
 *
 * Anything marked `toConfirm` is inferred from the codebase rather than stated
 * by the product owner. Those are questions, not commitments. Answer them and
 * drop the flag.
 *
 * The handbook (`docsContent.ts`) is unaffected by this file: it teaches people
 * to use what shipped, and stays silent about what has not.
 */

/** The sentence to say out loud. Everything else on the page defends it. */
export const ONE_LINE_PITCH =
  'ClickUp hands you an empty canvas and a weekend of setup; this hands your agency a system that already runs — projects, attendance, business development and recognition, structured on day one.'

export const WHAT_THIS_IS =
  'An operations portal for a software or creative agency. It holds the four things such a company runs on — client delivery, the working day of its staff, its sales pipeline, and the way it recognises good work — in one place, already organised. Nobody configures it into being useful: the structure is the product. Somebody signs in and finds their tasks, their attendance, their leads and their standing already laid out the way that work naturally goes.'

export const WHO_ITS_FOR = [
  'Agencies of roughly 10–150 people delivering client work across more than one discipline — design, development, marketing — where the same person is often on two projects and one of them is late.',
  'Teams who have tried a blank-slate tool and stalled: the workspace was built once, half-adopted, and is now three months stale.',
  'Owners who want the company legible without asking for it — who is in today, what is blocked, which leads went quiet, who carried the month — instead of chasing four tools and a spreadsheet for the answer.',
]

/**
 * The core problem, as the contrast that sells it. Kept as a pair so the page
 * can set them side by side — the argument only lands as a comparison.
 */
export const THE_PROBLEM = {
  them: {
    title: 'A blank slate asks you to be a systems architect',
    points: [
      'ClickUp, Monday, Notion and Asana ship as infinitely configurable canvases. Before the first task is tracked, somebody has to invent the structure: spaces, statuses, custom fields, a taxonomy, automations, and a written convention for how the company will use it.',
      'That work is real design work, and it lands on someone who was hired to do something else. Most teams do it badly, half-finish it, or abandon it a few months in when the person who designed it moves on.',
      'The tool never disagrees with you, so nothing stops a workspace drifting: two projects with different status sets, a field nobody fills in, four ways to log a day off.',
      'Attendance, hiring, the sales pipeline and recognition were never in the tool anyway. They end up in spreadsheets, WhatsApp and a manager’s memory.',
    ],
  },
  us: {
    title: 'A structure you walk into',
    points: [
      'The shape is decided: a project belongs to a client and runs one or more services; each service has its own stages, tasks and people. You staff a service, not a vague project.',
      'The working day is part of the system, not a bolt-on — check-in, leave, remote days, overtime and corrections all run through one queue with one set of approvers.',
      'Business development sits in front of delivery, and a won lead hands off into a real project with its stages and team already provisioned.',
      'Recognition is built in rather than improvised: XP, levels, quests, shoutouts, badges and a rewards shop that spends real points.',
      'Roles carry permissions, and permissions decide what people see. Nobody maintains a taxonomy to keep that true.',
      'The trade is deliberate. You give up the freedom to model your company however you like, and you get a company that is modelled on the day you start.',
    ],
  },
} as const

/**
 * What a buyer is actually adopting, module by module.
 *
 * `replaces` is the honest question a buyer asks — "so what do I stop paying
 * for?" — and is worth more to them than a feature count.
 */
export const MODULES: ProductModule[] = [
  {
    name: 'Delivery — projects, services, tasks',
    replaces: 'ClickUp / Asana / Monday',
    contains:
      'Projects under clients, split into services (design, development, marketing), each with its own stages, tasks and staffed people. Board and pipeline views, task detail with subtasks, assignees, reviewers, estimates, comments, @mentions, attachments and full activity history. Reusable project templates owned by a team. Client-visibility and approval flow on the work itself.',
    state: 'live',
  },
  {
    name: 'Time — timers, timesheet, backlog',
    replaces: 'Toggl / Harvest / a spreadsheet',
    contains:
      'A timer on the task you are working, manual entries for the time you forgot, a timesheet roster showing everybody’s logged day against their expected window, and backlog reports over logged time by project or person.',
    state: 'live',
  },
  {
    name: 'Attendance and time off',
    replaces: 'An HR tracker, a leave spreadsheet, a WhatsApp thread',
    contains:
      'Check-in and check-out from the office network or a work-from-home day, biometric terminal punches, a today view and a month calendar, leave / WFH / overtime / correction requests in one approval queue, leave balances, holidays, working Saturdays, company-wide WFH days and per-person check-in rules.',
    state: 'live',
  },
  {
    name: 'Business development',
    replaces: 'A lightweight CRM, or notes nobody else can see',
    contains:
      'A lead pipeline, BD campaigns and their tasks, meetings with attendees, outreach logging, daily updates, targets and a performance view. A won lead hands off into a delivery project — client, services, stages and team created in one action.',
    state: 'live',
  },
  {
    name: 'People, roles and teams',
    replaces: 'An HR directory and a permissions spreadsheet',
    contains:
      'A directory of everyone internal, one profile page per person (teams, projects, recognition, and compensation for those entitled to see it), teams under a lead, designations, job types, and a roles-and-permissions model where a role is a bag of capabilities rather than a hardcoded name. Deactivation reads as "left the company" everywhere at once.',
    state: 'live',
  },
  {
    name: 'Recognition and rewards',
    replaces: 'Nothing — most agencies simply do not do this',
    contains:
      'XP and levels earned from real work, a quest board with claimable tasks and proof, peer shoutouts, badges, employee of the month, a leaderboard, and a rewards shop where points are spent — including pooled rewards a group claims together. Monthly points reset with history kept.',
    state: 'live',
  },
  {
    name: 'The daily rhythm',
    replaces: 'A standup call and a status-chasing DM',
    contains:
      'My Day as the landing screen, a written standup with a settings-driven participation list, chat with channels and DMs (mentions, reactions, read receipts, file attachments), notifications with per-person preferences, and push notifications to an installed device.',
    state: 'live',
  },
  {
    name: 'Governance',
    replaces: 'Trust and a paper trail nobody kept',
    contains:
      'An audit log across attendance, people and gamification with danger flags for the edits worth noticing, admin sign-in as a member for support, terminal and device provisioning, and the working calendar.',
    state: 'live',
  },
  {
    name: 'The portal explains itself',
    replaces: 'An onboarding doc that went stale',
    contains:
      'A role-gated staff handbook and a release changelog, both rendered from data that ships with the feature, so a reader is never shown instructions for a screen they cannot open.',
    state: 'live',
  },
  {
    name: 'Client portal',
    replaces: 'Status emails and a shared drive',
    contains:
      'A separate light-themed portal for the client: their projects, approvals, files and reports, with none of the internal detail leaking in.',
    state: 'partial',
    gap: 'All six client screens render sample data from src/data/mock rather than the database. The shell, the routing and the client roles are real; the data layer behind them is not wired up yet.',
  },
  {
    name: 'ClickUp sync',
    replaces: 'Double entry for teams already living in ClickUp',
    contains:
      'A sync status per project and task — synced, pending, error — with a retry.',
    state: 'planned',
    gap: 'A mock screen only. It is not in the navigation, talks to no ClickUp API, and nothing syncs.',
  },
]

/**
 * Where this is heading. Derived from the build — what is half-finished, and
 * what the shape of the product implies it still needs — not from a stated
 * plan, which is why several carry `toConfirm`.
 */
export const ROADMAP: RoadmapItem[] = [
  {
    title: 'Client portal on real data',
    detail:
      'Replace the mock arrays behind the six client screens with the queries the internal side already has. This is the single largest gap between what the product demonstrates and what it does, and the most visible one to a buyer, because the client portal is the part their clients would see.',
    state: 'partial',
  },
  {
    title: 'Multi-company support',
    detail:
      'The database holds one company. There is no organisation or tenant table, so every profile, project and attendance record belongs to the same agency. Selling this to a second agency means either a separate deployment per customer or a tenancy column through the schema and every RLS policy.',
    state: 'planned',
    toConfirm: true,
  },
  {
    title: 'Self-serve onboarding',
    detail:
      'People are invited by an admin, and the working calendar, roles, services and statuses are set up by hand. A product sold to other agencies needs a first-run that stands up a working company without us.',
    state: 'planned',
    toConfirm: true,
  },
  {
    title: 'ClickUp (or equivalent) import',
    detail:
      'The one honest objection to an opinionated system is the work already sitting in the blank-slate tool. An importer that maps an existing workspace into this structure turns that objection into the demo.',
    state: 'planned',
    toConfirm: true,
  },
  {
    title: 'Reporting a buyer can act on',
    detail:
      'Reports read real timer and standup data today. What an owner asks for next — margin per project, utilisation per person, pipeline conversion — sits across modules that now all exist in one database, which is the advantage a stitched-together toolchain cannot answer from.',
    state: 'planned',
    toConfirm: true,
  },
]

/** The honest summary line for the owner half of the page. */
export const WHERE_WE_STAND =
  'Nine of eleven modules are live against real data and in daily use inside Linknbit. The client portal is built but still on sample data, and the ClickUp integration is a stub. The product is a working internal platform today, and one deployment away from being a single-customer product; the distance to a sellable multi-company product is the roadmap below.'
