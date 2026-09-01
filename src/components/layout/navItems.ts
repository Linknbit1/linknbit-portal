import {
  Sunrise,
  FolderOpen,
  Users,
  UserCog,
  CheckSquare,
  BarChart2,
  Trophy,
  Bell,
  MessageCircle,
  ClipboardList,
  Settings,
  UserCircle,
  CalendarCheck,
  CalendarClock,
  ShieldAlert,
  Crown,
  StickyNote,
  BookOpen,
  Tag,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'
import { showWipFeatures } from '../../lib/featureFlags'
import { isInternalRole } from '../../lib/roles'
import { useMyPermissions } from '../../hooks/usePermissions'
import { ADMINISTRATOR } from '../../api/permissions'
import { useAuditNewCount } from '../../hooks/useAuditLog'
import { useWaitingOnYou } from '../../hooks/useWaitingOnYou'
import { useChatUnreadTotal } from '../../hooks/useChatUnreadCount'
import { useTeams } from '../../hooks/useTeams'
import { useAmIStandupParticipant } from '../../hooks/useStandups'
import { useMyUpcomingMeetingCount } from '../../hooks/useBd'
import {
  useAllLeaveRequests,
  useAllWfhRequests,
  useAllAttendanceExceptions,
  useAllOvertimeRequests,
} from '../../hooks/useAttendance'
import { useEnrolledDevices } from '../../hooks/useEnrolledDevices'
import { useClaimableQuestCount, useGamificationPendingCount } from '../../hooks/useGamification'
import { useAuthContext } from '../../context/AuthContext'
import { countDecidable } from '../../lib/requestReview'

/**
 * Sidebar sections, in render order. The flat list had grown to 14 top-level
 * entries (34 destinations for an admin) mixing four unrelated kinds of work, so
 * they are grouped rather than split into separate portals — every role sees
 * broadly the same list, and a portal switcher would add a mode without removing
 * anything.
 */
export const NAV_GROUPS = [
  { id: 'workspace', label: 'Workspace' },
  { id: 'delivery',  label: 'Delivery' },
  { id: 'people',    label: 'People' },
  { id: 'admin',     label: 'Admin' },
  // Pinned to the sidebar footer instead of rendering as a labelled section.
  // Settings is somewhere you go occasionally to change how the portal behaves,
  // not a step in any workflow, so it sits out of the scan path in the corner
  // every desktop app puts it. An empty label means "render no heading".
  { id: 'bottom',    label: '' },
] as const

/** The section rendered in the sidebar footer rather than the scrolling body. */
export const BOTTOM_GROUP_ID = 'bottom'

export type NavGroupId = typeof NAV_GROUPS[number]['id']

export interface NavGroup {
  id: NavGroupId
  label: string
  items: NavItem[]
}

export interface NavItem {
  label: string
  icon: LucideIcon
  to: string
  /** Sidebar section this belongs to. Sub-pages inherit their parent's. */
  group?: NavGroupId
  badge?: number
  // Not yet production-ready — only rendered in development builds.
  devOnly?: boolean
  /** Hidden from the client portal's roles. The one non-permission audience split. */
  internalOnly?: boolean
  /**
   * Only for people expected to file a standup. Settings-driven (a role default
   * plus a per-person override), so it is a fact about the person rather than a
   * capability — asked of the database, not guessed from a list of roles.
   */
  standupParticipant?: boolean
  /**
   * Capability required to see this item. A string = that flag; an array = ANY of
   * them. Keeps the sidebar honest: if a role cannot use a destination, it is not
   * offered one. Route guards use the same key so URLs can't bypass it.
   */
  feature?: string | readonly string[]
  // Surfaced directly in the mobile bottom tab bar (the rest live behind "More").
  primaryMobile?: boolean
  /** Path prefix used for "is this section active" when `to` points at a child page. */
  matchPrefix?: string
  /** Sub-pages rendered as an expandable group in the desktop sidebar. */
  children?: NavItem[]
}

/**
 * Attendance sub-pages — the views at /attendance/:section.
 *
 * The first three are views, not destinations: Today, Calendar and Requests are
 * three ways of looking at one question, and Requests alone replaced the four
 * separate Leave / WFH / Exceptions / Overtime rows that used to sit here. They
 * are ungated because the question "who is working today" is not privileged —
 * `day_roster` withholds the private detail rather than the whole screen, and
 * the Requests queue hides its Approve and Reject buttons from anyone without
 * `can_manage_attendance`.
 *
 * What remains below the views is genuine administration, and stays gated.
 */
const ATTENDANCE_CHILDREN: NavItem[] = [
  { label: 'Today',            icon: CalendarCheck, to: '/attendance/today' },
  { label: 'Calendar',         icon: CalendarCheck, to: '/attendance/calendar' },
  { label: 'Requests',         icon: CalendarCheck, to: '/attendance/requests' },
  // Only for the roles whose parent link goes to the management side — HR's
  // "Attendance" already lands on this exact page, so offering it twice is noise.
  { label: 'My Attendance',    icon: CalendarCheck, to: '/attendance/me',         feature: 'can_manage_attendance' },
  { label: 'Daily Records',    icon: CalendarCheck, to: '/attendance/records',    feature: 'can_manage_attendance' },
]

/** Gamification sub-pages — each is its own route at /gamification/:section. */
const GAMIFICATION_CHILDREN: NavItem[] = [
  { label: 'Leaderboard',    icon: Trophy, to: '/gamification/leaderboard' },
  { label: 'Quest Board',    icon: Trophy, to: '/gamification/board' },
  { label: 'Shoutouts',      icon: Trophy, to: '/gamification/shoutouts' },
  { label: 'Badges',         icon: Trophy, to: '/gamification/badges' },
  { label: 'Rewards Shop',   icon: Trophy, to: '/gamification/rewards' },
  { label: 'Points History', icon: Trophy, to: '/gamification/history' },
  // Review queues: recognizers review quest proofs, governors review shoutouts and
  // redemptions, finance fulfils them — so all three capabilities open this page.
  { label: 'Approvals',      icon: Trophy, to: '/gamification/approvals',
    feature: ['can_govern_gamification', 'can_recognize', 'can_fulfill_payouts'] },
  // Governance, not configuration: this grants XP and decides who takes part.
  // The rule-set that used to share the name lives in Settings → Gamification.
  { label: 'Governance',     icon: Trophy, to: '/gamification/governance',
    feature: 'can_govern_gamification' },
]

/**
 * Business Development sub-pages — each is its own route at /bd/:section.
 *
 * Gated on `can_view_bd` rather than `can_manage_bd`: a BD rep holds only the
 * view key (their write access to their own leads comes from RLS ownership), so
 * gating on manage would hide the module from the very people who live in it.
 * The department-wide sections a rep cannot act on gate themselves in-page.
 */
const BD_CHILDREN: NavItem[] = [
  { label: 'Pipeline',       icon: TrendingUp, to: '/bd/pipeline',  feature: 'can_view_bd' },
  // Campaigns the BD team runs, and the work under them — the same pair as
  // Delivery's Projects/Tasks, in the same order.
  { label: 'Projects',       icon: TrendingUp, to: '/bd/projects',  feature: 'can_view_bd' },
  // The BD team's own work board. Scoped in-page: a rep sees only tasks assigned
  // to them, and only `can_manage_bd` unlocks the whole-department view.
  { label: 'Tasks',          icon: TrendingUp, to: '/bd/tasks',     feature: 'can_view_bd' },
  { label: 'Meetings',       icon: TrendingUp, to: '/bd/meetings',  feature: 'can_view_bd' },
  { label: 'Outreach',       icon: TrendingUp, to: '/bd/outreach',  feature: 'can_view_bd' },
  { label: 'Daily Updates',  icon: TrendingUp, to: '/bd/updates',   feature: 'can_view_bd' },
  // Targets, KPIs and reporting were two screens showing halves of the same
  // picture; a manager wants them in one place.
  { label: 'Performance',    icon: TrendingUp, to: '/bd/performance', feature: 'can_view_bd' },
]

/** Standup sub-pages — each is its own route at /standup/:section. */
const STANDUP_CHILDREN: NavItem[] = [
  { label: 'My Standup', icon: ClipboardList, to: '/standup',          standupParticipant: true },
  { label: 'Team',       icon: ClipboardList, to: '/standup/team',
    feature: ['can_view_standups', 'can_view_team_standups'] },
  { label: 'History',    icon: ClipboardList, to: '/standup/history',  standupParticipant: true },
]

/**
 * Pages that describe the portal itself rather than a destination inside it, so
 * they sit behind the arrow beside the logo instead of taking a sidebar row.
 * Ungated on purpose: both are staff-only via PrivateRoute, and the handbook
 * filters its own chapters per reader.
 */
export const BRAND_MENU_LINKS = [
  { to: '/docs', label: 'Documentation', hint: 'How the portal works', icon: BookOpen },
  { to: '/docs/changelog', label: "What's new", hint: 'Every release, newest first', icon: Tag },
] as const

export const NAV_ITEMS: NavItem[] = [
  // Workspace — what someone opens to do their own day.
  // First row, and the landing page: your own day before the company's.
  { label: 'My Day', icon: Sunrise, to: '/my-day', group: 'workspace', primaryMobile: true },
  { label: 'Notifications', icon: Bell, to: '/notifications', group: 'workspace' },
  { label: 'Chat', icon: MessageCircle, to: '/chat', group: 'workspace', matchPrefix: '/chat', primaryMobile: true },
  // A daily personal ritual for employees; reviewers reach the team board through
  // its own sub-page, so it belongs here rather than under People.
  { label: 'Standup', icon: ClipboardList, to: '/standup', group: 'workspace', matchPrefix: '/standup', children: STANDUP_CHILDREN },
  // A private pin-board. Gated on a capability rather than a role so it can be
  // handed to anyone from Settings; the notes themselves are owner-only in RLS.
  { label: 'My Notes', icon: StickyNote, to: '/notes', group: 'workspace', feature: 'can_use_sticky_notes' },
  // Client meetings you host or were invited to. Deliberately outside the BD
  // section and ungated: the people pulled into a negotiation — team leads, a
  // PM — hold no can_view_bd, and an invitation they cannot see is no
  // invitation. The page shows only the viewer's own schedule.
  { label: 'My Meetings', icon: CalendarClock, to: '/my-meetings', group: 'workspace', internalOnly: true },

  // Delivery — winning the work, then doing it. Ordered by the lifecycle a piece
  // of work actually travels (lead → client → project → task) rather than by
  // which screen was built first, so the section reads as one pipeline.
  // "Business Dev", not the full name: at 248px the expanded sidebar truncates
  // "Business Development" to "Business Develo…" once the expand chevron takes
  // its share of the row. The pages themselves keep the full name.
  { label: 'Business Dev', icon: TrendingUp, to: '/bd/pipeline', group: 'delivery', matchPrefix: '/bd', feature: 'can_view_bd', children: BD_CHILDREN },
  { label: 'Clients', icon: UserCircle, to: '/clients', group: 'delivery', feature: 'can_manage_clients' },
  { label: 'Projects', icon: FolderOpen, to: '/projects', group: 'delivery' },
  { label: 'Tasks', icon: CheckSquare, to: '/tasks', group: 'delivery' },
  // With Delivery rather than Admin: a PM reading where the hours went is doing
  // delivery work, not governance. No longer dev-only either — it reads real
  // timer and standup data now, not the mock arrays it shipped with.
  { label: 'Reports', icon: BarChart2, to: '/reports', group: 'delivery', feature: 'can_view_reports' },

  // People — who works here, when, and how they are recognised. The three
  // directory views sit together at the top; the two heavy sections with their
  // own sub-navigation follow, so expanding one never pushes a plain link
  // out of reach.
  // `to` is filled in by useNavItems() with the team this person leads; the item
  // is dropped for everyone who leads none.
  { label: 'My Team', icon: Crown, to: '/teams', group: 'people' },
  // Directory views: everyone internal can browse people/teams. The management
  // actions inside are gated on can_manage_people; RLS blocks writes regardless.
  { label: 'Teams', icon: Users, to: '/teams', group: 'people' },
  { label: 'People', icon: UserCog, to: '/people', group: 'people' },
  // `to` is rewritten below: managers land on Daily Records, everyone else on their
  // own self-service view (the old hardcoded /attendance/records bounced 4 of 7 roles).
  { label: 'Attendance', icon: CalendarCheck, to: '/attendance', group: 'people', matchPrefix: '/attendance', primaryMobile: true, children: ATTENDANCE_CHILDREN },
  { label: 'Gamification', icon: Trophy, to: '/gamification/leaderboard', group: 'people', matchPrefix: '/gamification', primaryMobile: true, children: GAMIFICATION_CHILDREN },

  // Admin — governance only, so the section genuinely disappears for the roles
  // that have none of it. One row holding terminals, devices, the working
  // calendar and the audit log, rather than four scattered through People.
  // matchPrefix is the bare /admin. Projects, Tasks, Clients and Reports used to
  // sit under it and no longer do, which is the point: those are the day job,
  // not governance. What is left under /admin genuinely belongs to this row.
  { label: 'Admin', icon: ShieldAlert, to: '/admin', group: 'admin', matchPrefix: '/admin',
    feature: ['can_manage_attendance', 'can_view_audit_log'] },

  // Pinned to the footer — see NAV_GROUPS. Personal for most roles (My Devices,
  // Notifications); the admin-only sections filter themselves in-page.
  { label: 'Settings', icon: Settings, to: '/settings', group: 'bottom', internalOnly: true },
]

type CanFn = (feature: string) => boolean

/**
 * Pure filter — `can` supplies capability answers so this stays testable, and
 * `isStandupParticipant` the one fact about the person that is not a capability.
 */
export function filterNavItems(
  role: string | null | undefined,
  can: CanFn,
  isStandupParticipant = true,
): NavItem[] {
  const hasFeature = (item: NavItem): boolean => {
    if (!item.feature) return true
    return Array.isArray(item.feature)
      ? item.feature.some(can)
      : can(item.feature as string)
  }
  const allowed = (item: NavItem) =>
    (showWipFeatures || !item.devOnly) &&
    (!item.internalOnly || isInternalRole(role)) &&
    (!item.standupParticipant || isStandupParticipant) &&
    hasFeature(item)

  return NAV_ITEMS.filter(allowed).map((item) => {
    const children = item.children?.filter(allowed)
    // Send non-managers — and HR, who manages attendance but is a tracked
    // employee — to their own attendance view rather than an admin URL.
    const landsOnAdminView =
      can('can_manage_attendance')
    const to = item.matchPrefix === '/attendance'
      ? (landsOnAdminView ? '/attendance/today' : '/attendance')
      : item.to
    return { ...item, to, children: children && children.length > 0 ? children : undefined }
  })
}

/** Applies a badge to one child (by path) when the count is > 0. */
function withChildBadges(item: NavItem, byPath: Record<string, number>): NavItem {
  if (!item.children) return item
  return {
    ...item,
    children: item.children.map((child) => {
      const n = byPath[child.to] ?? 0
      return n > 0 ? { ...child, badge: n } : child
    }),
  }
}

/** Nav items visible to the signed-in user, capability-filtered. */
export function useNavItems(): NavItem[] {
  const { profile } = useAuthContext()
  const { data: permissions } = useMyPermissions()
  const { data: auditNewCount } = useAuditNewCount()
  const chatUnread = useChatUnreadTotal()
  const { data: teams } = useTeams()
  const role = profile?.role
  // "My Team" is a shortcut, not a section: it points at the team this person
  // actually leads. Anyone who leads none never sees it.
  const myTeamId = profile ? teams?.find((t) => t.lead_id === profile.id)?.id : undefined

  const can: CanFn = (feature) => {
    if (!permissions) return false
    return permissions.includes(ADMINISTRATOR) || permissions.includes(feature)
  }

  // ── Live pending counts for sidebar badges ──────────────────────────────────
  // Each query is gated so it only fires for users who can act on it — the
  // sidebar is always mounted, so firing these for every employee would be waste.
  const canManageAttendance = can('can_manage_attendance')
  const { data: leavePending = [] } = useAllLeaveRequests('pending', canManageAttendance)
  const { data: wfhPending = [] } = useAllWfhRequests('pending', canManageAttendance)
  const { data: excPending = [] } = useAllAttendanceExceptions({ status: 'pending' }, canManageAttendance)
  const { data: otPending = [] } = useAllOvertimeRequests('pending', canManageAttendance)
  const { data: devices = [] } = useEnrolledDevices(canManageAttendance)
  // Claimable = open, not past deadline, slots remaining (quest status is never
  // auto-closed, so a plain open-count would include expired/full quests).
  // Claimable by everyone internal, so the badge shows for all.
  const { data: questCount = 0 } = useClaimableQuestCount(!!profile)
  // Gamification items waiting on a reviewer. Scoped server-side to the caller's
  // capabilities, so the number equals the queues they can actually open — and
  // gated here so an employee never fires it.
  const canReviewGamification =
    can('can_govern_gamification') || can('can_recognize') || can('can_fulfill_payouts')
  const { data: gamificationPending = 0 } = useGamificationPendingCount(!!profile && canReviewGamification)
  // Meetings still ahead of you, hosting or invited. Ungated like the page
  // itself — anyone can be pulled into a client call, so this is not a BD count.
  const { data: upcomingMeetings = 0 } = useMyUpcomingMeetingCount(!!profile)
  const amStandupParticipant = useAmIStandupParticipant()

  const devicesPending = devices.filter((d) => !d.approved_by && d.is_active).length
  // Leave, WFH, exceptions and overtime share one queue now, so their pending
  // counts sum onto that single row rather than four that no longer exist.
  const attendanceByPath: Record<string, number> = {
    // Only the ones this person can decide. Somebody who files a request for a
    // colleague cannot approve it, so counting it on their badge is a number
    // they can never clear — and it buries the ones that are theirs.
    '/attendance/requests':
      countDecidable(leavePending, profile?.id)
      + countDecidable(wfhPending, profile?.id)
      + countDecidable(excPending, profile?.id)
      + countDecidable(otPending, profile?.id),
  }
  const attendanceTotal = Object.values(attendanceByPath).reduce((a, n) => a + n, 0)
  const gamificationByPath: Record<string, number> = {
    '/gamification/board': questCount,
    '/gamification/approvals': gamificationPending,
  }
  // The Notifications badge counts what is BLOCKED on this person, not unread
  // news — a
  // number you can drive to zero by acting, rather than by reading.
  const { total: waitingTotal } = useWaitingOnYou()

  // Surface live counts on the relevant items (parent shows the section total).
  return filterNavItems(role, can, amStandupParticipant).flatMap((item) => {
    if (item.label === 'My Team') {
      return myTeamId ? [{ ...item, to: `/teams/${myTeamId}` }] : []
    }
    // The Admin row carries what is waiting inside it: devices to approve, plus
    // unseen audit entries. Folding four pages behind one door must not fold
    // away the reason to open it.
    if (item.matchPrefix === '/admin') {
      const total = devicesPending + (auditNewCount ?? 0)
      return [total > 0 ? { ...item, badge: total } : item]
    }
    if (item.to === '/chat' && chatUnread) return [{ ...item, badge: chatUnread }]
    if (item.to === '/notifications' && waitingTotal) return [{ ...item, badge: waitingTotal }]
    if (item.to === '/my-meetings' && upcomingMeetings) return [{ ...item, badge: upcomingMeetings }]
    if (item.matchPrefix === '/attendance') {
      const withChildren = withChildBadges(item, attendanceByPath)
      return [attendanceTotal > 0 ? { ...withChildren, badge: attendanceTotal } : withChildren]
    }
    if (item.matchPrefix === '/gamification') {
      const withChildren = withChildBadges(item, gamificationByPath)
      // Parent badge is the section total, matching how Attendance behaves.
      const total = questCount + gamificationPending
      return [total > 0 ? { ...withChildren, badge: total } : withChildren]
    }
    return [item]
  })
}

/**
 * The name of the actual page a path opens.
 *
 * A parent row is a shortcut to one of its children — "Business Dev" opens
 * /bd/pipeline, "Gamification" opens /gamification/leaderboard — so naming a pin
 * after the row you clicked would label the Pipeline page "Business Dev".
 * Children are checked first for exactly that reason.
 *
 * It also keeps pinning idempotent: the parent and the child resolve to one
 * path, so they must resolve to one label, or the pin's name would depend on
 * where you happened to click.
 */
export function navLabelForPath(items: NavItem[], path: string): string | null {
  for (const item of items) {
    for (const child of item.children ?? []) {
      if (child.to === path) return child.label
    }
  }
  return items.find((item) => item.to === path)?.label ?? null
}

/**
 * Which single top-level item the current URL belongs to. Prefix matching alone
 * lights up every ancestor — /teams/<id> matches both "Teams" (/teams) and
 * "My Team" (/teams/<id>) — so the longest match wins and only it is active.
 * Children are excluded on purpose: they mark themselves by exact path, and
 * including them would un-highlight (and collapse) their parent.
 */
export function activeNavPath(items: NavItem[], pathname: string): string | null {
  const matches = items
    .map((item) => item.matchPrefix ?? item.to)
    .filter((path) => pathname === path || pathname.startsWith(`${path}/`))
  if (matches.length === 0) return null
  return matches.reduce((longest, path) => (path.length > longest.length ? path : longest))
}

/**
 * Buckets already-filtered items into the sidebar sections. A section with no
 * items for this role is dropped entirely, so nobody sees a bare heading (an
 * employee has no Admin section at all).
 */
export function groupNavItems(items: NavItem[]): NavGroup[] {
  return NAV_GROUPS.flatMap(({ id, label }) => {
    const groupItems = items.filter((item) => (item.group ?? 'workspace') === id)
    return groupItems.length > 0 ? [{ id, label, items: groupItems }] : []
  })
}

/** Nav items for the signed-in user, grouped into sidebar sections. */
export function useNavGroups(): NavGroup[] {
  return groupNavItems(useNavItems())
}

/** Secondary destinations for the mobile "More" tab (everything not in the bottom bar). */
export function useMoreNavItems(): NavItem[] {
  return useNavItems().filter((item) => !item.primaryMobile)
}

/** The same "More" destinations, grouped — mobile gets the sections too. */
export function useMoreNavGroups(): NavGroup[] {
  return groupNavItems(useMoreNavItems())
}
