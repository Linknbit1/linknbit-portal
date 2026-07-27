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
  type LucideIcon,
} from 'lucide-react'
import { showWipFeatures } from '../../lib/featureFlags'
import { SETTINGS_ROLES } from '../../constants/roles'
import { useRoleFlags } from '../../hooks/useRoleFlags'
import { useAuditDangerCount } from '../../hooks/useAuditLog'
import { useChatUnreadTotal } from '../../hooks/useChatUnreadCount'
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
] as const

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
  { label: 'Daily Records',    icon: CalendarCheck, to: '/attendance/records',    feature: 'can_manage_attendance' },
  { label: 'Leave',            icon: CalendarCheck, to: '/attendance/leave',      feature: 'can_manage_attendance' },
  { label: 'WFH Requests',     icon: CalendarCheck, to: '/attendance/wfh',        feature: 'can_manage_attendance' },
  { label: 'Exceptions',       icon: CalendarCheck, to: '/attendance/exceptions', feature: 'can_manage_attendance' },
  { label: 'Overtime',         icon: CalendarCheck, to: '/attendance/overtime',   feature: 'can_manage_attendance' },
  { label: 'Schedule',         icon: CalendarCheck, to: '/attendance/schedule',   feature: 'can_manage_attendance' },
  { label: 'Enrolled Devices', icon: CalendarCheck, to: '/attendance/devices',    feature: 'can_manage_attendance' },
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

export const NAV_ITEMS: NavItem[] = [
  // Workspace — what someone opens to do their own day.
  { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard', group: 'workspace', primaryMobile: true },
  { label: 'Inbox', icon: Inbox, to: '/inbox', group: 'workspace' },
  { label: 'Chat', icon: MessageCircle, to: '/chat', group: 'workspace', matchPrefix: '/chat', primaryMobile: true },
  // A daily personal ritual for employees; reviewers reach the team board through
  // its own sub-page, so it belongs here rather than under People.
  { label: 'Standup', icon: ClipboardList, to: '/standup', group: 'workspace', matchPrefix: '/standup', roles: STANDUP_ROLES, children: STANDUP_CHILDREN },
  // Personal for most roles (My Devices, Notifications); the admin-only sections
  // filter themselves in-page. Grouping it under Admin would put an "Admin"
  // heading in front of all seven roles and mean nothing.
  { label: 'Settings', icon: Settings, to: '/settings', group: 'workspace', roles: SETTINGS_ROLES },

  // Delivery — the client work itself.
  { label: 'Projects', icon: FolderOpen, to: '/admin/projects', group: 'delivery' },
  { label: 'Tasks', icon: CheckSquare, to: '/admin/tasks', group: 'delivery' },
  { label: 'Clients', icon: UserCircle, to: '/admin/clients', group: 'delivery', feature: 'can_manage_clients' },

  // People — who works here, when, and how they are recognised.
  // `to` is rewritten below: managers land on Daily Records, everyone else on their
  // own self-service view (the old hardcoded /attendance/records bounced 4 of 7 roles).
  { label: 'Attendance', icon: CalendarCheck, to: '/attendance', group: 'people', matchPrefix: '/attendance', primaryMobile: true, children: ATTENDANCE_CHILDREN },
  // Directory views: everyone internal can browse people/teams. The management
  // actions inside are gated on can_manage_people; RLS blocks writes regardless.
  { label: 'Teams', icon: Users, to: '/teams', group: 'people' },
  { label: 'People', icon: UserCog, to: '/people', group: 'people' },
  { label: 'Gamification', icon: Trophy, to: '/gamification/leaderboard', group: 'people', matchPrefix: '/gamification', primaryMobile: true, children: GAMIFICATION_CHILDREN },

  // Admin — governance only, so the section genuinely disappears for the five
  // roles that have none of it.
  { label: 'Reports', icon: BarChart2, to: '/admin/reports', group: 'admin', devOnly: true, feature: 'can_view_reports' },
  { label: 'Audit Log', icon: ShieldAlert, to: '/admin/audit', group: 'admin', feature: 'can_view_audit_log' },
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
    // Send non-managers to their own attendance view rather than an admin URL.
    const to = item.matchPrefix === '/attendance' && !can('can_manage_attendance')
      ? '/attendance'
      : item.matchPrefix === '/attendance'
        ? '/attendance/records'
        : item.to
    return { ...item, to, children: children && children.length > 0 ? children : undefined }
  })
}

/** Nav items visible to the signed-in user, capability-filtered. */
export function useNavItems(): NavItem[] {
  const { profile } = useAuthContext()
  const { data: flags } = useRoleFlags()
  const { data: dangerCount } = useAuditDangerCount()
  const chatUnread = useChatUnreadTotal()
  const role = profile?.role

  const can: CanFn = (feature) => {
    if (role === 'super_admin') return true
    if (!flags || !role) return false
    return flags.find((f) => f.role === role && f.feature_key === feature)?.enabled ?? false
  }

  // Surface live counts: flagged actions on Audit Log, unread messages on Chat.
  return filterNavItems(role, can).map((item) => {
    if (item.to === '/admin/audit' && dangerCount) return { ...item, badge: dangerCount }
    if (item.to === '/chat' && chatUnread) return { ...item, badge: chatUnread }
    return item
  })
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
