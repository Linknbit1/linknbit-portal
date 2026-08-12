import {
  LayoutDashboard,
  FolderOpen,
  Users,
  UserCog,
  CheckSquare,
  BarChart2,
  Trophy,
  Inbox,
  MessageCircle,
  ClipboardList,
  Settings,
  UserCircle,
  CalendarCheck,
  ShieldAlert,
  Crown,
  StickyNote,
  BookOpen,
  Tag,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'
import { showWipFeatures } from '../../lib/featureFlags'
import { SETTINGS_ROLES, ATTENDANCE_ADMIN_LANDING_ROLES } from '../../constants/roles'
import { useMyPermissions } from '../../hooks/usePermissions'
import { ADMINISTRATOR } from '../../api/permissions'
import { useAuditNewCount } from '../../hooks/useAuditLog'
import { useChatUnreadTotal } from '../../hooks/useChatUnreadCount'
import { useTeams } from '../../hooks/useTeams'
import {
  useAllLeaveRequests,
  useAllWfhRequests,
  useAllAttendanceExceptions,
  useAllOvertimeRequests,
} from '../../hooks/useAttendance'
import { useEnrolledDevices } from '../../hooks/useEnrolledDevices'
import { useClaimableQuestCount } from '../../hooks/useGamification'
import { useAuthContext } from '../../context/AuthContext'

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
  // If set, only rendered for these roles.
  roles?: readonly string[]
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

/** Attendance sub-pages — the management views at /attendance/:section. */
const ATTENDANCE_CHILDREN: NavItem[] = [
  // Only for the roles whose parent link goes to the management side — HR's
  // "Attendance" already lands on this exact page, so offering it twice is noise.
  { label: 'My Attendance',    icon: CalendarCheck, to: '/attendance/me',         feature: 'can_manage_attendance',
    roles: ATTENDANCE_ADMIN_LANDING_ROLES },
  { label: 'Daily Records',    icon: CalendarCheck, to: '/attendance/records',    feature: 'can_manage_attendance' },
  { label: 'Leave',            icon: CalendarCheck, to: '/attendance/leave',      feature: 'can_manage_attendance' },
  { label: 'WFH Requests',     icon: CalendarCheck, to: '/attendance/wfh',        feature: 'can_manage_attendance' },
  { label: 'Exceptions',       icon: CalendarCheck, to: '/attendance/exceptions', feature: 'can_manage_attendance' },
  { label: 'Overtime',         icon: CalendarCheck, to: '/attendance/overtime',   feature: 'can_manage_attendance' },
  { label: 'Schedule',         icon: CalendarCheck, to: '/attendance/schedule',   feature: 'can_manage_attendance' },
  { label: 'Enrolled Devices', icon: CalendarCheck, to: '/attendance/devices',    feature: 'can_manage_attendance' },
  { label: 'Terminals',        icon: CalendarCheck, to: '/attendance/terminals',  feature: 'can_manage_attendance' },
  { label: 'Reports',          icon: CalendarCheck, to: '/attendance/reports',    feature: 'can_manage_attendance' },
  { label: 'Settings',         icon: CalendarCheck, to: '/attendance/settings',   feature: 'can_manage_attendance' },
]

/** Gamification sub-pages — each is its own route at /gamification/:section. */
const GAMIFICATION_CHILDREN: NavItem[] = [
  { label: 'Leaderboard',    icon: Trophy, to: '/gamification/leaderboard' },
  { label: 'Quest Board',    icon: Trophy, to: '/gamification/board' },
  { label: 'Shoutouts',      icon: Trophy, to: '/gamification/shoutouts' },
  { label: 'Badges',         icon: Trophy, to: '/gamification/badges' },
  { label: 'Rewards Shop',   icon: Trophy, to: '/gamification/rewards' },
  { label: 'Points History', icon: Trophy, to: '/gamification/history' },
  // Governors run the catalog/approvals; recognizers post quests & review submissions.
  { label: 'Settings',       icon: Trophy, to: '/gamification/admin',
    feature: ['can_govern_gamification', 'can_recognize'] },
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
  { label: 'Targets & KPIs', icon: TrendingUp, to: '/bd/targets',   feature: 'can_view_bd' },
  { label: 'BD Reports',     icon: TrendingUp, to: '/bd/reports',   feature: 'can_view_bd' },
]

// Everyone internal except finance: finance is never required to submit a standup and
// cannot view the team tab, so the page is a dead end for them.
const STANDUP_ROLES = ['super_admin', 'admin', 'hr', 'project_manager', 'team_lead', 'employee'] as const

/** Roles with a team board to review — the same set `isAuthoritative()` covers. */
const STANDUP_REVIEW_ROLES = ['super_admin', 'admin', 'hr', 'project_manager', 'team_lead'] as const

/** Standup sub-pages — each is its own route at /standup/:section. */
const STANDUP_CHILDREN: NavItem[] = [
  { label: 'My Standup', icon: ClipboardList, to: '/standup',          roles: STANDUP_ROLES },
  { label: 'Team',       icon: ClipboardList, to: '/standup/team',     roles: STANDUP_REVIEW_ROLES },
  { label: 'History',    icon: ClipboardList, to: '/standup/history',  roles: STANDUP_ROLES },
  { label: 'Settings',   icon: ClipboardList, to: '/standup/settings', feature: 'can_manage_standups' },
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
  { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard', group: 'workspace', primaryMobile: true },
  { label: 'Inbox', icon: Inbox, to: '/inbox', group: 'workspace' },
  { label: 'Chat', icon: MessageCircle, to: '/chat', group: 'workspace', matchPrefix: '/chat', primaryMobile: true },
  // A daily personal ritual for employees; reviewers reach the team board through
  // its own sub-page, so it belongs here rather than under People.
  { label: 'Standup', icon: ClipboardList, to: '/standup', group: 'workspace', matchPrefix: '/standup', roles: STANDUP_ROLES, children: STANDUP_CHILDREN },
  // A private pin-board. Gated on a capability rather than a role so it can be
  // handed to anyone from Settings; the notes themselves are owner-only in RLS.
  { label: 'My Notes', icon: StickyNote, to: '/notes', group: 'workspace', feature: 'can_use_sticky_notes' },

  // Delivery — winning the work, then doing it. Ordered by the lifecycle a piece
  // of work actually travels (lead → client → project → task) rather than by
  // which screen was built first, so the section reads as one pipeline.
  // "Business Dev", not the full name: at 248px the expanded sidebar truncates
  // "Business Development" to "Business Develo…" once the expand chevron takes
  // its share of the row. The pages themselves keep the full name.
  { label: 'Business Dev', icon: TrendingUp, to: '/bd/pipeline', group: 'delivery', matchPrefix: '/bd', devOnly: true, feature: 'can_view_bd', children: BD_CHILDREN },
  { label: 'Clients', icon: UserCircle, to: '/admin/clients', group: 'delivery', feature: 'can_manage_clients' },
  { label: 'Projects', icon: FolderOpen, to: '/admin/projects', group: 'delivery' },
  { label: 'Tasks', icon: CheckSquare, to: '/admin/tasks', group: 'delivery' },

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

  // Admin — governance only, so the section genuinely disappears for the five
  // roles that have none of it. Audit Log leads because it is the one that ships;
  // Reports is still dev-only.
  { label: 'Audit Log', icon: ShieldAlert, to: '/admin/audit', group: 'admin', feature: 'can_view_audit_log' },
  { label: 'Reports', icon: BarChart2, to: '/admin/reports', group: 'admin', devOnly: true, feature: 'can_view_reports' },

  // Pinned to the footer — see NAV_GROUPS. Personal for most roles (My Devices,
  // Notifications); the admin-only sections filter themselves in-page.
  { label: 'Settings', icon: Settings, to: '/settings', group: 'bottom', roles: SETTINGS_ROLES },
]

type CanFn = (feature: string) => boolean

/** Pure filter — `can` supplies capability answers so this stays testable. */
export function filterNavItems(role: string | null | undefined, can: CanFn): NavItem[] {
  const hasFeature = (item: NavItem): boolean => {
    if (!item.feature) return true
    return Array.isArray(item.feature)
      ? item.feature.some(can)
      : can(item.feature as string)
  }
  const allowed = (item: NavItem) =>
    (showWipFeatures || !item.devOnly) &&
    (!item.roles || item.roles.includes(role ?? '')) &&
    hasFeature(item)

  return NAV_ITEMS.filter(allowed).map((item) => {
    const children = item.children?.filter(allowed)
    // Send non-managers — and HR, who manages attendance but is a tracked
    // employee — to their own attendance view rather than an admin URL.
    const landsOnAdminView =
      can('can_manage_attendance') && ATTENDANCE_ADMIN_LANDING_ROLES.includes(role ?? '')
    const to = item.matchPrefix === '/attendance'
      ? (landsOnAdminView ? '/attendance/records' : '/attendance')
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

  const devicesPending = devices.filter((d) => !d.approved_by && d.is_active).length
  const attendanceByPath: Record<string, number> = {
    '/attendance/leave': leavePending.length,
    '/attendance/wfh': wfhPending.length,
    '/attendance/exceptions': excPending.length,
    '/attendance/overtime': otPending.length,
    '/attendance/devices': devicesPending,
  }
  const attendanceTotal = Object.values(attendanceByPath).reduce((a, n) => a + n, 0)
  const gamificationByPath: Record<string, number> = { '/gamification/board': questCount }

  // Surface live counts on the relevant items (parent shows the section total).
  return filterNavItems(role, can).flatMap((item) => {
    if (item.label === 'My Team') {
      return myTeamId ? [{ ...item, to: `/teams/${myTeamId}` }] : []
    }
    if (item.to === '/admin/audit' && auditNewCount) return [{ ...item, badge: auditNewCount }]
    if (item.to === '/chat' && chatUnread) return [{ ...item, badge: chatUnread }]
    if (item.matchPrefix === '/attendance') {
      const withChildren = withChildBadges(item, attendanceByPath)
      return [attendanceTotal > 0 ? { ...withChildren, badge: attendanceTotal } : withChildren]
    }
    if (item.matchPrefix === '/gamification') {
      const withChildren = withChildBadges(item, gamificationByPath)
      return [questCount > 0 ? { ...withChildren, badge: questCount } : withChildren]
    }
    return [item]
  })
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
