# Linknbit Unified Operations Portal — Development Rules

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

All design tokens are defined in `tailwind.config.js`. Never hardcode hex values or pixel sizes that exist as tokens.

### Color Naming Convention

| Token | Usage |
|-------|-------|
| `bg-base` | Page background (`#0B1018`) |
| `bg-canvas` | Content canvas (`#0F1620`) |
| `surface-1/2/3` | Cards, elevated cards, overlays |
| `surface-inset` | Inputs, code blocks |
| `border-default/subtle/strong/focus` | All borders |
| `text-1/2/3/4` | Text hierarchy (primary → disabled) |
| `brand-red` | Primary brand color (`#EE2737`) |
| `service-design` | Violet (`#A78BFA`) |
| `service-dev` | Cyan (`#22D3EE`) |
| `service-mkt` | Amber (`#FBBF24`) |

### Typography

| Font | Variable | Usage |
|------|----------|-------|
| Space Grotesk | `font-display` | Headings, brand text |
| IBM Plex Sans | `font-ui` | Body, labels, UI text |
| JetBrains Mono | `font-mono` | Code, metadata, timestamps |

### Border Radius

- `rounded-xs` = 4px (chips, small badges)
- `rounded-sm` = 6px (buttons, nav items)
- `rounded-md` = 10px (cards, inputs)
- `rounded-lg` = 14px (elevated cards)
- `rounded-xl` = 20px (large cards, panels)
- `rounded-full` = 999px (avatars, pills)

---

## Color Themes

### Internal Portal (dark mode — default)

Background: `bg-base` (`#0B1018`) — deep navy, NOT pure black.
Cards: `surface-1` with `border-default` borders.
Use surfaces 1→2→3 for depth hierarchy.

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

| Component | Props | Notes |
|-----------|-------|-------|
| `ServiceChip` | `service: 'design' \| 'development' \| 'marketing'` | Always shows on project context |
| `StatusChip` | `status: TaskStatus` | Backlog/ToDo/InProgress/Review/Approved/Completed/Blocked |
| `PriorityChip` | `priority: Priority` | Critical/High/Medium/Low |
| `RoleBadge` | `role: UserRole` | All 7 roles with distinct colors |
| `ClickUpStatus` | `status: 'synced' \| 'pending' \| 'error'` | Inline indicator |
| `XPBar` | `current, max, level` | Gamified progress bar |
| `ClientVisibility` | `visible: boolean` | Lock/eye icon with visual treatment |
| `Avatar` | `name, size, online?` | Initials fallback, online indicator |
| `AvatarGroup` | `users[], max` | Stacked overlap with +N |

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

### Hard rules

- Never apply SQL directly in the Supabase dashboard SQL editor
- Never edit an existing migration file — create a new corrective migration instead
- Never run `supabase db push` on the production project manually — CI/CD only
- A migration is not done until `src/types/database.ts` is regenerated and committed alongside it

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
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .is('deleted_at', null)

  if (error) throw error
  return data
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
  all: ['tasks'] as const,
  byProject: (projectId: string) => ['tasks', projectId] as const,
}

export function useTasks(projectId: string) {
  return useQuery({
    queryKey: TASK_KEYS.byProject(projectId),
    queryFn: () => fetchTasks(projectId),
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateTask,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.byProject(variables.projectId) })
    },
  })
}
```

### Realtime rules

- All Supabase Realtime subscriptions live in `src/hooks/realtime/` — never inline in a component
- Realtime updates flow into the TanStack Query cache via `queryClient.setQueryData` or `queryClient.invalidateQueries` — never into a separate `useState`
- Always clean up channels in the `useEffect` return function

```typescript
// src/hooks/realtime/useRealtimeComments.ts — correct pattern
export function useRealtimeComments(taskId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel(`comments:${taskId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments',
          filter: `task_id=eq.${taskId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: COMMENT_KEYS.byTask(taskId) })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [taskId, queryClient])
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
- No pure-black backgrounds (`#000000`) — use `bg-base` (`#0B1018`)
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

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- ALWAYS read graphify-out/GRAPH_REPORT.md before reading any source files, running grep/glob searches, or answering codebase questions. The graph is your primary map of the codebase.
- IF graphify-out/wiki/index.md EXISTS, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
