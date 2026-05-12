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
├── components/
│   ├── ui/          # Primitive reusable components (Button, Input, Badge, etc.)
│   ├── layout/      # App shells, Sidebar, Topbar, ClientShell
│   └── shared/      # Domain-specific reusables (ServiceChip, XPBar, ClickUpStatus)
├── pages/
│   ├── auth/        # Login, register
│   ├── admin/       # Admin/ops dashboard + sub-pages
│   ├── client/      # Client portal pages
│   └── employee/    # Employee dashboard
├── data/            # Mock data (typed, realistic placeholder data)
├── types/           # All TypeScript type definitions
└── lib/             # Utility functions
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

- All data is **mocked** in `src/data/` — realistic Pakistani names, real project names
- Types live in `src/types/index.ts`
- No real API calls — this is a UI prototype
- Component state is local (`useState`) unless it genuinely needs to be shared
- No global state library for the prototype phase

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

## What NOT to Do

- No pure-black backgrounds (`#000000`) — use `bg-base` (`#0B1018`)
- No Inter + purple gradient combos
- No Notion-clone card layouts
- No lorem ipsum
- No hardcoded pixel sizes that exist as spacing tokens
- No global state for prototype-phase data
- No default exports for components (only pages)
- No `any` types
- No inline `style` attributes unless for dynamic values that can't be expressed in Tailwind (e.g., CSS custom properties for dynamic widths)
