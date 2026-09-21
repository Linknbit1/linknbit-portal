# Claude Design — Prompt

> Paste everything below the line into Claude Design, together with `portal-specification.md`.

---

Design a complete, production-grade UI for an **agency operations portal** — a multi-role web application that a software/creative agency of 10–150 people runs its entire company on. This is a fresh design with no existing visual system to honour; you are defining the design language from scratch. The attached specification defines the functionality; design the interface for it.

## What the product is

One system holding five things: client delivery (projects → services → stages → tasks), the working day (attendance, leave, time tracking), business development (lead pipeline, outreach, meetings, targets), people (directory, teams, roles, permissions), and recognition (XP, quests, shoutouts, a rewards shop).

It has **two separate surfaces** that must look like siblings, not twins:

1. **Internal portal** — staff-facing. Dense, fast, information-rich. Left sidebar, persistent top bar. People live in it eight hours a day.
2. **Client portal** — the agency's clients. Calm, spacious, premium, reassuring. Top horizontal navigation, no sidebar. It is the product the agency is proud to hand over. No internal metric ever appears here.

## Typography — hard constraints

- **No monospace, anywhere.** Not for timestamps, IDs, metadata, code, table numbers or labels. Where numbers must align in a column, use **tabular figures** (`font-variant-numeric: tabular-nums`) of the primary family.
- **No grotesque or neo-grotesque faces.** Rule out Helvetica, Arial, Inter, Roboto, Suisse, Söhne, Untitled Sans, Aeonik, Graphik and anything of that lineage.
- Choose instead from **humanist sans** (warm, open apertures, calligraphic skeleton), **geometric sans** (circular, constructed), **transitional or contemporary serif**, or a **serif display + humanist sans** pair.
- Two families maximum: one for the interface, optionally one for headings and display moments. State your choice and why it fits an operations tool that is read all day.
- Define a full type scale — display, page title, section heading, card title, body, label, caption — with weights, sizes, line-heights and letter-spacing. Metadata gets a smaller size and a lighter colour, never a different family.

## Visual direction

- Pick a clear point of view and commit to it: this should not read as another generic SaaS dashboard. Say what the design is in one sentence before you start drawing.
- Choose a **dark interface for the internal portal** and a **light interface for the client portal**, each with its own token set, or argue for a different split.
- Define a full token system: background, surface elevations (three levels), inset surfaces for inputs, border weights (subtle / default / strong / focus), four levels of text hierarchy, one brand accent, semantic colours (success, warning, danger, info), and three discipline accents for Design / Development / Marketing.
- **Every colour resolves through a token** — the system must support additional themes by redefining variables only.
- Decide a corner-radius stance and apply it consistently. Decide whether the system uses shadows, borders, or both, for elevation — and never mix arbitrarily.
- Motion: subtle and functional. Drawers, modals, board-card drags, status transitions. Nothing decorative that costs time.

## Screens to design

**Internal, in priority order**

1. **My Day** — the landing screen. Today's meetings, your overdue and due work with inline timer start, a check-in card, the standup prompt, who is out today. No charts.
2. **Task board** — kanban with seven configurable columns (Backlog, To Do, In Progress, In Review, Approved, Completed, Blocked). Each column header carries its own colour and an icon; cards are wide enough to read comfortably. Show the column header treatment, an empty column, a dragging state and a drop target.
3. **Task detail** — as a side panel over the board and as a full page. Status, priority, assignees, reviewers, estimate, due date, subtasks, comments with mentions, attachments, time entries, activity history.
4. **Project detail** — tab bar: Board · Pipeline · Overview · Files · Team · Backlog. Design the Team tab carefully: member cards in a proper responsive grid that fills the width, with role, designation, the services they are staffed on, and an add-member affordance.
5. **Projects list** — card grid and table view, with a Mine / My Team / Everyone scope switch and filters.
6. **Attendance — Today** — the company roster for a date: in office, working from home, off, not yet checked in.
7. **Attendance — Requests** — one approval queue holding leave, WFH, overtime and corrections.
8. **BD Pipeline** — nine-stage lead board with drag-to-move, plus the lead detail drawer.
9. **Chat** — channel list with categories and unread state, message thread with reactions, replies-with-quote, read-receipt ticks, mention banding, sticky date dividers, and the composer.
10. **Gamification** — leaderboard with distinct top-three treatment, quest board cards, rewards shop.
11. **People directory** and a **member profile**.
12. **Reports** — charts plus a data table with export.
13. **Settings** — the sectioned configuration screen, including the status-column editor.
14. **Sidebar** in expanded and collapsed states, with the pinned section, badge counts and group headings.
15. **Command palette** overlay.

**Client portal**

16. **Client dashboard**, **project detail**, and **approvals** — approve / request revision / reject.

**Mobile**

17. Phone versions of My Day, the task board, attendance and chat, with the bottom tab bar and the pushed-stack pattern for sub-pages.

## Component system

Design these as a reusable set, each with all its states (default, hover, focus, active, disabled, loading, error):

Button (primary, secondary, ghost, danger) · Input · Textarea · Select · Multi-select · Date picker · Time picker · Date-range picker · Toggle · Checkbox · Radio · Search field · Modal · Drawer / side panel · Dropdown menu · Tooltip · Tab bar · Table (sortable, with row actions and sticky header) · Card · Avatar and stacked avatar group with overflow count · Status chip (one per board column, each with an icon) · Priority chip · Service chip · Role badge · Progress bar · XP bar · Toast · Empty state · Skeleton loader · Pagination · Filter bar · File attachment row · Comment with mention.

**No native form controls.** Every select, date field, time field, checkbox and toggle is a designed component.

## Rules

- **Status columns must be colourful and iconic.** Each of the seven statuses gets its own hue and its own glyph, readable at a glance across board headers, table rows, chips and filters. The same colour and glyph mean the same status everywhere in the product.
- **Density is a feature.** Staff scan hundreds of rows. Tighten line-height and padding on tables and lists relative to a marketing site, without losing tap targets on mobile.
- **Empty states carry the action that fills them**, never a shrug.
- **Nothing half-width.** Any grid of cards fills its container and reflows at every breakpoint; a two-item list must not leave the right half of the screen blank.
- Design **every screen for phone width as well as desktop** — this is a full mobile product, not a responsive afterthought.
- Show the **loading** and **error** state of at least one data-heavy screen.
- No lorem ipsum. Use realistic agency content: Pakistani staff names, real-sounding client and project names, plausible dates and durations.

## Deliverables

1. A one-paragraph statement of the design direction.
2. The token sheet: colour, type, spacing, radius, elevation, motion.
3. The component library with states.
4. The screens above, desktop and mobile.
5. Notes on anything you decided differently from this brief, and why.
