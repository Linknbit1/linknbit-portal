# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Linknbit Operations Portal — Development Rules

## Commands

```bash
# Development
pnpm dev              # start Vite dev server (exposed on LAN via --host)
pnpm build            # tsc type-check + Vite production build
pnpm lint             # ESLint

# Supabase (requires supabase CLI + Docker Desktop for local stack)
pnpm sb:link          # link to remote project pifsboyhheazpccyliwy
pnpm sb:migration     # create a new timestamped migration file (append the name: pnpm sb:migration add_foo)
pnpm sb:push          # push pending migrations to the linked remote project
pnpm sb:types         # regenerate src/types/database.ts from the linked remote schema
pnpm sb:reset         # wipe local DB and replay all migrations from scratch (requires Docker)
pnpm sb:start / pnpm sb:stop  # start/stop local Supabase stack (requires Docker Desktop)
```

**Docker Desktop is required for the local Supabase stack.** When Docker is not running, apply migrations to the remote project via the Supabase MCP tool (`mcp__supabase__apply_migration`) and regenerate types via `mcp__supabase__generate_typescript_types` instead of `pnpm sb:types`.

After every migration — whether applied locally or remotely — run `pnpm sb:types` (or use the MCP) and commit the updated `src/types/database.ts` alongside the migration file.

---

## Product Overview

Multi-role SaaS operations portal for Linknbit (Pakistan-based software agency).
Combines client project tracking, employee task management, gamified rewards, and ClickUp integration.

**User roles:** Super Admin, Admin/Ops Manager, Project Manager, Team Lead, Employee, Client Owner, Client Member

**Services:** Design (violet), Development (cyan/teal), Marketing (amber/orange)

---

## Tech Stack

- **Framework:** React 18 + Vite + TypeScript (strict)
- **Styling:** Tailwind CSS v3 (token-mapped config) — NO inline styles unless absolutely required
- **Routing:** React Router v6 (data router pattern)
- **Icons:** Lucide React only — no other icon libraries
- **Charts:** Recharts (for reports pages)
- **Animations:** Framer Motion (drawers, modals, transitions only — keep subtle)
- **Utilities:** `cn()` from `src/lib/cn.ts` (clsx + tailwind-merge) — always use for conditional classes
- **Backend:** Supabase (Postgres + RLS + Realtime + Edge Functions + Storage)
- **Server state:** TanStack Query v5 — all data fetching and mutation go through it, no exceptions
- **DB client:** Supabase JS client — used for all queries, Realtime subscriptions, Auth, and Storage
- **Migrations:** Supabase CLI (`supabase migration new`) — never the Supabase dashboard SQL editor

---

## Design Token Rules

All design tokens are defined in the `@theme` block of `src/index.css` (Tailwind v4 — there is no
`tailwind.config.js`). Never hardcode hex values or pixel sizes that exist as tokens: every colour in
the portal must resolve through a `var(--color-…)`, because that is what makes the per-user themes work.

### Color Naming Convention

| Token                                | Usage                               |
| ------------------------------------ | ----------------------------------- |
| `bg-base`                            | Page background (`#0A0A0A`)         |
| `bg-canvas`                          | Content canvas (`#0F0F0F`)          |
| `surface-1/2/3`                      | Cards, elevated cards, overlays     |
| `surface-inset`                      | Inputs, code blocks                 |
| `border-default/subtle/strong/focus` | All borders                         |
| `text-1/2/3/4`                       | Text hierarchy (primary → disabled) |
| `brand-red`                          | Primary brand color (`#E01414`)     |
| `topbar-glass` / `overlay-scrim`     | Translucent chrome                  |
| `service-design`                     | Violet (`#A78BFA`)                  |
| `service-dev`                        | Cyan (`#22D3EE`)                    |
| `service-mkt`                        | Amber (`#FBBF24`)                   |

### Typography

One family, five weights — the Linknbit 3.0 brand runs on Poppins alone.

| Font    | Variable       | Usage                      |
| ------- | -------------- | -------------------------- |
| Poppins | `font-display` | Headings, brand text       |
| Poppins | `font-ui`      | Body, labels, UI text      |
| Poppins | `font-mono`    | Metadata, timestamps       |
| Caveat  | `font-hand`    | Sticky notes only          |

`font-mono` is a role name, not a promise of a monospaced face — it marks metadata, and stays in
Poppins so the UI reads as one voice. Do not reintroduce a second family.

### Border Radius

**The theme is square.** Every radius token except `--radius-full` is `0px`, so `rounded-sm`,
`rounded-md`, `rounded-lg` and `rounded-xl` all render as hard rectangles today. Keep using the
token that matches the element's weight rather than deleting the class — the names still carry the
intent, and a future theme can move the scale in one place.

- `rounded-xs` / `-sm` / `-md` / `-lg` / `-xl` = 0px (everything: chips, buttons, cards, panels)
- `rounded-full` = 999px — **circles only**: avatars, status dots, spinners. Never on a padded
  text pill; a capsule chip is the one shape that reads as "not this theme".

Never write an arbitrary radius (`rounded-[6px]`). There are none left in the internal portal.

---

## Color Themes

### Internal Portal (dark mode — default)

Background: `app-backdrop` over `bg-base` (`#0A0A0A`) — near-black under a soft red radial wash.
Cards: `surface-1` with `border-default` borders.
Use surfaces 1→2→3 for depth hierarchy.

The app shell paints the `app-backdrop` utility rather than `bg-base`, and `<main>` carries no
background of its own — that is what lets a theme's gradient reach the content area. Do not add a
`bg-bg-base` back onto either.

### Per-user themes

`profiles.theme` → a `theme-<slug>` class on `<html>` (applied in `AppShell`). A theme is a single
`:root.theme-<slug>` block in `src/index.css` that redefines the variables it moves; because every
utility resolves through those variables, one class repaints the sidebar, topbar, inputs, tables,
modals, scrollbars and the backdrop at once.

To add a theme: add the CSS block, register the slug in `src/constants/themes.ts`, and widen the
`profiles_theme_check` constraint in a migration. Never theme the semantic status colours or the
service accents — those carry meaning, not branding.

### Client Portal (light mode — completely separate theme)

Background: warm cream (`#FAF7F2`).
Cards: white (`#FFFFFF`).
Text: warm ink tones.
Nav: top horizontal bar, NO sidebar.
Apply using `.client-portal` class on the root or use `ClientShell` layout.
Import `src/styles/client-theme.css` for client-portal CSS vars override.

The client portal must visually feel like a **premium product** the agency delivers to clients — polished, warm, professional. No internal metrics (XP, ClickUp, team performance) should leak into client views.

---

## Component Architecture

### Directory Structure

```
src/
├── api/                    # Pure async functions — no React, no hooks, no JSX
│   ├── tasks.ts            # fetchTasks(), createTask(), updateTask(), deleteTask()
│   ├── projects.ts         # fetchProjects(), createProject(), etc.
│   ├── comments.ts
│   ├── clients.ts
│   ├── teams.ts
│   ├── auth.ts
│   ├── attachments.ts
│   ├── gamification.ts     # XP, rewards, quests
│   ├── notifications.ts
│   └── index.ts            # re-exports all api functions
├── hooks/                  # TanStack Query hooks that call src/api/ functions
│   ├── useTasks.ts         # useQuery + useMutation wrappers
│   ├── useProjects.ts
│   ├── useComments.ts
│   ├── useClients.ts
│   ├── useTeams.ts
│   ├── useNotifications.ts
│   ├── useGamification.ts
│   └── realtime/           # Supabase Realtime subscriptions only
│       ├── useRealtimeComments.ts
│       ├── useRealtimeTasks.ts
│       └── useRealtimeNotifications.ts
├── components/
│   ├── ui/                 # Primitive reusable components (Button, Input, Badge, etc.)
│   ├── layout/             # App shells, Sidebar, Topbar, ClientShell
│   └── shared/             # Domain-specific reusables (ServiceChip, XPBar, ClickUpStatus)
├── pages/
│   ├── auth/               # Login, register
│   ├── admin/              # Admin/ops dashboard + sub-pages
│   ├── client/             # Client portal pages
│   └── employee/           # Employee dashboard
├── data/                   # Temporary mock data — replaced by real API during backend integration
├── lib/                    # Pure utility functions only — no hooks, no API calls
│   └── cn.ts
├── types/
│   ├── index.ts            # App-level types, domain interfaces
│   └── database.ts         # Auto-generated by supabase gen types — NEVER hand-edit this file
└── styles/
```

### Component Rules

1. **All components are typed** — no `any`, no implicit `any`
2. **Use `cn()` for conditional classes** — never string concatenation
3. **Export named components** — no default exports except page components
4. **Props interfaces** are defined above the component in the same file
5. **Variants via props** — use discriminated unions for complex state variations (e.g., `status: 'synced' | 'pending' | 'error'`)
6. **No hardcoded colors** — always use Tailwind token classes
7. **Accessible by default** — proper `aria-*` attributes, keyboard navigation on interactive elements
8. **Use the existing custom UI primitives** — never use native `<select>`, `<input type="date">`, `<input type="time">`, checkboxes/toggles, or other raw form controls when a matching component already exists in `src/components/ui/` (`Select`, `DatePicker`, `TimePicker`, `Toggle`, `Input`, etc.). Reach for the native element only when no custom equivalent exists, and prefer building/extending the shared component over a one-off.

---

## Service Type Rules

Service types are a first-class concept. Every project has exactly one:

- `design` → violet accent (`service-design`, `service-design-soft`, `service-design-strong`)
- `development` → cyan accent (`service-dev`, `service-dev-soft`, `service-dev-strong`)
- `marketing` → amber accent (`service-mkt`, `service-mkt-soft`, `service-mkt-strong`)

Service chips appear on **every** project card, table row, and task that belongs to a project. Use the `ServiceChip` component.

---

## Data & State

- **Server state** is owned by TanStack Query — never duplicate it in `useState`
- **UI/client state** (open modals, selected tabs, form input) uses `useState` or `useReducer`
- **No global state library** — TanStack Query handles server state; React Context handles shared UI state only
- `src/data/` contains temporary mock data for the prototype phase; it is replaced file-by-file as real API endpoints are implemented — do not delete the whole folder at once
- App-level TypeScript types live in `src/types/index.ts`; DB types live in `src/types/database.ts` (generated, never hand-edited)

---

## Page Layout Pattern (Internal)

Every internal page follows this shell:

```
AppShell
  ├── Sidebar (248px expanded, 72px collapsed — sticky, full height)
  └── Main
      ├── Topbar (64px sticky — with search, bell, user avatar)
      └── Content (padding: 28px 32px, max-width: 1440px)
```

Active nav item: `bg-brand-red/13 text-white` with a 3px left red indicator bar.

## Page Layout Pattern (Client)

```
ClientShell
  ├── ClientTopbar (72px — horizontal nav, sticky)
  └── Content (max-width: 1280px centered, padding: 40px)
```

---

## Sidebar Navigation Items (Internal)

Dashboard, Projects, Clients, Teams, Tasks, Reports, Gamification, ClickUp, Settings

Show notification count badges on: Projects (blocked count), Tasks (overdue count).

---

## Key Reusable Components Reference

| Component          | Props                                               | Notes                                                     |
| ------------------ | --------------------------------------------------- | --------------------------------------------------------- |
| `ServiceChip`      | `service: 'design' \| 'development' \| 'marketing'` | Always shows on project context                           |
| `StatusChip`       | `status: TaskStatus`                                | Backlog/ToDo/InProgress/Review/Approved/Completed/Blocked |
| `PriorityChip`     | `priority: Priority`                                | Critical/High/Medium/Low                                  |
| `RoleBadge`        | `role: UserRole`                                    | All 7 roles with distinct colors                          |
| `ClickUpStatus`    | `status: 'synced' \| 'pending' \| 'error'`          | Inline indicator                                          |
| `XPBar`            | `current, max, level`                               | Gamified progress bar                                     |
| `ClientVisibility` | `visible: boolean`                                  | Lock/eye icon with visual treatment                       |
| `Avatar`           | `name, size, online?`                               | Initials fallback, online indicator                       |
| `AvatarGroup`      | `users[], max`                                      | Stacked overlap with +N                                   |

---

## Gamification Rules

- XP bar gradient: amber → pink → violet (`xp-gradient`)
- Level badges: `Level N` with a subtle glow on high levels
- Quest cards feel like game achievement cards — use rich accent colors
- Leaderboard top 3: gold/silver/bronze visual treatment
- Rewards shop cards: enticing, aspirational feel for locked items

---

## ClickUp Integration UI

Three states only: `synced` (green check), `pending` (amber clock/spinner), `error` (red warning).
Small enough to sit inline on table rows and cards.
Show `Retry Sync` link on error state.

---

## Client Visibility

Each task/file has a `clientVisible: boolean` toggle.

- `visible=true` → eye icon, normal appearance
- `visible=false` → lock icon, slightly dimmed row/card
  Use the `ClientVisibility` toggle component consistently.

---

## Approval Flow States

`pending` → `approved` | `revision_requested` | `rejected`

- Approved: success green, optional confetti
- Revision: constructive amber, not alarming
- Rejected: danger red with confirmation requirement

---

## Code Style

- TypeScript strict mode enabled
- Functional components only — no class components
- `const` component declarations: `const MyComponent = () => {}`
- Imports order: React → libraries → types → components → utils → styles
- No `console.log` in production code
- Comments: only for non-obvious WHY (not what)
- File naming: PascalCase for components, camelCase for utilities
- Tailwind class order: layout → spacing → typography → color → effects

---

## Mock Data Guidelines

Use realistic data throughout:

- **Pakistani names:** Ahmad Karimi, Zain Malik, Sara Qureshi, Usman Tariq, Bilal Ahmed, Hina Rizvi
- **Client names:** Cricket Sansar, Rahim Gul GLT, VPNGuider, Starr Luxury Cars, Irene Teo Coaching, Offsite Pro, MediGrow, Linknbit (internal)
- **Project names:** Cricket Sansar App, Linknbit Brand Identity, VPNGuider SEO Campaign, Rahim Gul Transport Website, Starr Luxury Cars Portal, etc.
- No lorem ipsum anywhere
- Dates relative to 2026-05-12 (current date context)

---

## Performance & Quality

- Images: always provide `alt` text
- Use semantic HTML (`nav`, `main`, `header`, `section`, `article`)
- `key` props must be stable IDs, never array indices for dynamic lists
- Avoid layout shift — skeleton states for loading
- Memoize expensive computations with `useMemo`
- Don't over-memoize: only when profiling shows it's needed

---

## AI Collaboration Rules

- **Ask before assuming** — if anything about the intent, scope, or design is unclear, ask first. Never guess and implement. A wrong assumption wastes more time than a 30-second clarifying question.
- **No surprises** — if a task requires changing folder structure, adding a dependency, modifying a migration, or touching shared utilities, flag it before doing it.
- **Suggest, don't silently decide** — if there are two valid approaches, present both with tradeoffs and wait for a decision.

---

## Documentation Rules

The portal documents itself. `/docs` is the staff handbook and `/docs/changelog` is the release history, both rendered from data:

| File                              | Holds                                                          |
| --------------------------------- | -------------------------------------------------------------- |
| `src/pages/docs/docsContent.ts`   | `DOC_CHAPTERS` — every user-facing feature, gated by role/capability |
| `src/pages/docs/changelogData.ts` | `RELEASES` — newest first; `RELEASES[0]` is the "What's new" callout |

**A user-facing functionality change is not done until both are updated in the same change.** Not a follow-up commit, not a TODO — the same PR that ships the feature.

### On every functionality change

1. **Handbook** — add or edit the `DocTopic` in `docsContent.ts`. If behaviour changed, fix the affected `procedures[].steps` too; stale steps are worse than none.
2. **Changelog** — add a `ChangelogEntry` to the top release (`added` / `improved` / `fixed`). Start a new release entry when shipping a milestone rather than a single change, and move `highlight` onto it — only the newest release should carry one.
3. **Gate it** — set `roles` / `feature` to the *same* keys the nav item and route guard use. A reader must never be shown instructions for a screen they cannot open.

### What does NOT go in the handbook

Governance and plumbing: the audit log, the role/permission editor, impersonation, terminal provisioning, migrations, RLS. The handbook is read by all seven roles; internal machinery reads as noise and invites people to go looking for screens they have no access to.

### Undocumented modules

Some modules are deliberately invisible: they exist for the people explicitly granted them and are not part of the portal anyone else is told about.

**My Notes / sticky notes (`can_use_sticky_notes`) is one of these.**

- **Who may see it:** super admins (through `administrator`), and anyone holding the permission — granted only via the dedicated `Sticky Notes` role. Nobody else, in any role, at any rank.
- The permission is `is_hidden` in the catalogue on purpose, so it does not even appear as something to ask for.
- **It is never documented.** No handbook topic, no changelog entry, no release note, no What's-new callout — not even a gated one. A gated topic still tells the reader the module exists.
- **This holds for every future change to it.** Shipping a fix or a feature there means shipping it silently: the "update the docs with every change" rule above does not apply, and the change must not be mentioned anywhere user-facing.

Treat any module marked this way the same. If a new one is added, list it here.

### Writing rules

- Write procedures as **instructions** ("Press Start", "Choose a replacement"), never as descriptions of the UI.
- Put the surprising-but-true things in `notes` — the questions support gets asked twice.
- `where` is the nav trail (`"Workspace → Standup"`), so a reader can find the screen without hunting.
- No screenshots. They rot silently; this file does not.

---

## Migration Rules

Every schema change follows this exact sequence — no shortcuts.

### Creating a migration

```bash
supabase migration new <descriptive_name>
# Example: supabase migration new add_soft_delete_to_tasks
```

This creates a timestamped SQL file in `supabase/migrations/`. Write the **complete SQL** for that change in that file:

- `CREATE TABLE` / `ALTER TABLE` statements
- RLS: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + all policies
- Triggers and functions required by this change
- Indexes

### Applying migrations

```bash
supabase db reset          # local: wipes and replays all migrations from scratch
supabase db push           # local only: applies pending migrations to local DB
```

In CI/CD: `supabase db push --linked` against the hosted project.

### Regenerating types

Run this after **every** migration and commit the result:

```bash
supabase gen types typescript --local > src/types/database.ts
```

`src/types/database.ts` is always generated — never hand-edited. If a type looks wrong, fix the migration and regenerate.

### Breaking changes: expand, migrate, contract

**A migration that removes or renames something a deployed client still reads must ship in
three steps, not one.** The database updates the instant the migration runs; browsers do not.
Any tab or installed PWA opened before the deploy keeps running its old bundle, so between the
migration and that tab's next reload it is asking for a column that no longer exists — and a
missing field usually surfaces as `undefined`, several layers away from the cause.

This is not hypothetical: renaming `wfh_requests.date` → `start_date` in one step took the WFH
page down for every open session with `Cannot read properties of undefined (reading 'startsWith')`.

For a rename, a drop, a narrowed `CHECK`, a tightened `NOT NULL`, or an RPC signature change:

1. **Expand** — add the new column/function alongside the old one. Backfill it, and keep both
   in sync (a trigger, or write both from the app). Nothing is removed yet, so old and new
   clients both work.
2. **Migrate** — deploy the front end that reads and writes the new shape. Wait for it to
   actually be live, not merely merged.
3. **Contract** — a second migration drops the old column/function once no client uses it.

The cost is one extra migration and one extra deploy. The alternative is a window in which
every unreloaded session is broken, and the length of that window is decided by when people
happen to reload.

**Only skip this for additive changes** — a new nullable column, a new table, a new function.
Those cannot break a client that does not know about them.

Regardless: bump `CACHE_NAME` in `public/sw.js` on any release that changes the data shape, so
installed clients drop the cached bundle instead of serving it from disk.

### Hard rules

- Never apply SQL directly in the Supabase dashboard SQL editor
- Never edit an existing migration file — create a new corrective migration instead
- Never run `supabase db push` on the production project manually — CI/CD only
- A migration is not done until `src/types/database.ts` is regenerated and committed alongside it
- Never rename or drop in a single migration what a deployed client still reads — expand, migrate, contract

---

## Data Fetching Rules

### Layer separation

```
Component
  └── calls hook from src/hooks/
        └── hook calls function from src/api/
              └── api function calls Supabase JS client
```

Never skip a layer. No Supabase calls inside components. No TanStack Query logic inside `src/api/`.

### src/api/ rules

- Pure async functions only — no React, no hooks, no JSX
- Each function has an explicit TypeScript return type using types from `src/types/database.ts`
- One file per domain: `tasks.ts`, `projects.ts`, `comments.ts`, etc.
- Functions are named by action: `fetchTasks`, `createTask`, `updateTask`, `deleteTask`

```typescript
// src/api/tasks.ts — correct pattern
export async function fetchTasks(projectId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("project_id", projectId)
    .is("deleted_at", null);

  if (error) throw error;
  return data;
}
```

### src/hooks/ rules

- One file per domain, mirroring `src/api/`
- Each file exports named hooks: `useTasks`, `useCreateTask`, `useUpdateTask`
- Every query has a stable, documented query key
- Mutations always invalidate affected queries via `queryClient.invalidateQueries`
- Use `onMutate` for optimistic updates on frequent interactions (status toggle, checklist tick)

```typescript
// src/hooks/useTasks.ts — correct pattern
export const TASK_KEYS = {
  all: ["tasks"] as const,
  byProject: (projectId: string) => ["tasks", projectId] as const,
};

export function useTasks(projectId: string) {
  return useQuery({
    queryKey: TASK_KEYS.byProject(projectId),
    queryFn: () => fetchTasks(projectId),
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateTask,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: TASK_KEYS.byProject(variables.projectId),
      });
    },
  });
}
```

### Realtime rules

- All Supabase Realtime subscriptions live in `src/hooks/realtime/` — never inline in a component
- Realtime updates flow into the TanStack Query cache via `queryClient.setQueryData` or `queryClient.invalidateQueries` — never into a separate `useState`
- Always clean up channels in the `useEffect` return function

```typescript
// src/hooks/realtime/useRealtimeComments.ts — correct pattern
export function useRealtimeComments(taskId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`comments:${taskId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
          filter: `task_id=eq.${taskId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: COMMENT_KEYS.byTask(taskId),
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId, queryClient]);
}
```

---

## Security Rules

### Data storage

- **Never store auth tokens, session data, user profile data, or any sensitive information in `localStorage` or `sessionStorage`**
- Supabase Auth manages its own session internally — do not extract or manually store the JWT
- For any data that must persist across page refreshes, use TanStack Query's `staleTime` / `gcTime` or Supabase's session management — not `localStorage`

### API keys

- The Supabase **anon key** is the only key permitted in client-side code
- The Supabase **service role key** must never appear in any file under `src/` — it belongs only in Edge Functions (server-side) and CI/CD environment variables
- All secrets live in `.env` files — `.env` is never committed; `.env.example` documents the required keys without values

### Logging

- Never `console.log` a user object, auth token, API response containing PII, or any object from Supabase Auth
- `console.log` is banned in committed code entirely — use proper error boundaries and TanStack Query's `onError` handlers

---

## TypeScript Rules

These extend the existing "Code Style" rules and take precedence.

- No `as` type assertions — use type guards (`if ('id' in obj)`) or the `satisfies` operator instead. If `as` is genuinely the only option, add a comment explaining why.
- No `@ts-ignore` or `@ts-expect-error` — fix the actual type error
- All API function return types must use types from `src/types/database.ts` — never hand-write a type that duplicates a DB table shape
- Complex shared types belong in `src/types/index.ts` — never define them inline inside component or hook files
- Prop interfaces are defined directly above the component that uses them in the same file — not in `src/types/`

---

## Architecture Discipline

- **No new top-level folders under `src/`** without discussion — map everything to the existing structure first
- **No business logic in components** — if a component contains a calculation, transformation, or multi-step operation, extract it to a hook or an `src/api/` function
- **`src/lib/` is for pure utilities only** — no React hooks, no Supabase calls, no TanStack Query. If it needs React or Supabase, it belongs in `src/hooks/` or `src/api/`
- **No prop drilling beyond 2 levels** — if a prop needs to pass through more than 2 component layers, either lift the data fetch to the child via its own hook, or introduce a React Context for that UI subtree
- **One data fetch per page-level component** — page components fetch data via hooks and pass it down as props; leaf components do not fetch independently unless the data is genuinely isolated to them

---

## What NOT to Do

**UI / Design**

- No pure-black backgrounds (`#000000`) — use `bg-base` (`#0A0A0A`); the sticky-note board is the
  one deliberate exception
- No literal hex in a component — it breaks per-user themes. Use a token, or add one
- No `rounded-full` on a padded text pill — circles only (avatars, dots, spinners)
- No Inter + purple gradient combos
- No Notion-clone card layouts
- No lorem ipsum
- No hardcoded pixel sizes that exist as spacing tokens
- No inline `style` attributes unless for dynamic values that can't be expressed in Tailwind (e.g., CSS custom properties for dynamic widths)

**Components & TypeScript**

- No default exports for components (only pages)
- No `any` types
- No `as` type assertions without a justifying comment
- No `@ts-ignore` or `@ts-expect-error`
- No business logic inside components
- No native `<select>` / `<input type="date|time">` / raw form controls when a custom component exists in `src/components/ui/` — use `Select`, `DatePicker`, `TimePicker`, `Toggle`, etc.

**Data & State**

- No Supabase calls directly inside components — always go through `src/api/`
- No TanStack Query logic (`useQuery`, `useMutation`) inside `src/api/` functions
- No copying TanStack Query data into `useState`
- No Realtime subscriptions inline in components — use `src/hooks/realtime/`
- No prop drilling beyond 2 component levels

**Security**

- No sensitive data in `localStorage` or `sessionStorage` — no exceptions
- No Supabase service role key anywhere under `src/`
- No hardcoded secrets, API keys, or credentials in source files
- No `console.log` of user objects, tokens, or API responses

**Migrations & Schema**

- No SQL applied directly in the Supabase dashboard SQL editor
- No edits to existing migration files — create a new migration instead
- No hand-edits to `src/types/database.ts` — regenerate it with `supabase gen types typescript`
- No new top-level folders under `src/` without prior discussion

**Documentation**

- No shipping a user-facing change without updating `docsContent.ts` and `changelogData.ts` in the same change
- No documenting a screen the reader's role can't open — gate the topic with the same key as the route guard
- No governance internals in the handbook (audit log, permissions editor, impersonation, terminals)
- No mention of My Notes / sticky notes anywhere user-facing — not in the handbook, not in the changelog, not even gated
- No screenshots in the docs

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:

- ALWAYS read graphify-out/GRAPH_REPORT.md before reading any source files, running grep/glob searches, or answering codebase questions. The graph is your primary map of the codebase.
- IF graphify-out/wiki/index.md EXISTS, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

if you look into status we have backlog todo in progress review approved completed and blocked
i want to have all these in in boards columns also and also increase the width of the cards in board for tasks in projects as it seems very low in width and also if you look at the clickup how there header seeims colorfull for completed to do and everyhting and also they have icons svgs before them to show completed todo in rpgress stuff like that i want to have that also
and also if you go in projects in teams tab then it seems very not good Ui insense of. cards shwoing teams dont seems well fix Ui of it as well as whole screen is blank just showing on half left side the card for teams user
