import {
  LayoutDashboard,
  FolderOpen,
  Users,
  UserCog,
  CheckSquare,
  BarChart2,
  Trophy,
  Inbox,
  ClipboardList,
  Settings,
  UserCircle,
  CalendarCheck,
  type LucideIcon,
} from 'lucide-react'
import { showWipFeatures } from '../../lib/featureFlags'
import { isAuthoritative } from '../../lib/roles'
import { SETTINGS_ROLES } from '../../constants/roles'

export interface NavItem {
  label: string
  icon: LucideIcon
  to: string
  badge?: number
  // Not yet production-ready — only rendered in development builds.
  devOnly?: boolean
  // Only rendered for authoritative (management) roles.
  authoritativeOnly?: boolean
  // If set, only rendered for these roles (e.g. Settings → super_admin/admin).
  roles?: readonly string[]
  // Surfaced directly in the mobile bottom tab bar (the rest live behind "More").
  primaryMobile?: boolean
  /** Path prefix used for "is this section active" when `to` points at a child page. */
  matchPrefix?: string
  /** Sub-pages rendered as an expandable group in the desktop sidebar. */
  children?: NavItem[]
}

/** Attendance sub-pages — each is its own route at /attendance/:section. */
const ATTENDANCE_CHILDREN: NavItem[] = [
  { label: 'Daily Records',    icon: CalendarCheck, to: '/attendance/records', authoritativeOnly: true },
  { label: 'Leave',            icon: CalendarCheck, to: '/attendance/leave', authoritativeOnly: true },
  { label: 'WFH Requests',     icon: CalendarCheck, to: '/attendance/wfh', authoritativeOnly: true },
  { label: 'Exceptions',       icon: CalendarCheck, to: '/attendance/exceptions', authoritativeOnly: true },
  { label: 'Overtime',         icon: CalendarCheck, to: '/attendance/overtime', authoritativeOnly: true },
  { label: 'Schedule',         icon: CalendarCheck, to: '/attendance/schedule', authoritativeOnly: true },
  { label: 'Enrolled Devices', icon: CalendarCheck, to: '/attendance/devices', authoritativeOnly: true },
  { label: 'Reports',          icon: CalendarCheck, to: '/attendance/reports', authoritativeOnly: true },
  { label: 'Settings',         icon: CalendarCheck, to: '/attendance/settings', authoritativeOnly: true },
]

/** Gamification sub-pages — each is its own route at /gamification/:section. */
const GAMIFICATION_CHILDREN: NavItem[] = [
  { label: 'Leaderboard',   icon: Trophy, to: '/gamification/leaderboard' },
  { label: 'Quest Board',   icon: Trophy, to: '/gamification/board' },
  { label: 'Shoutouts',     icon: Trophy, to: '/gamification/shoutouts' },
  { label: 'Badges',        icon: Trophy, to: '/gamification/badges' },
  { label: 'Rewards Shop',  icon: Trophy, to: '/gamification/rewards' },
  { label: 'Points History', icon: Trophy, to: '/gamification/history' },
  { label: 'Settings',      icon: Trophy, to: '/gamification/admin', authoritativeOnly: true },
]

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard', primaryMobile: true },
  { label: 'Projects', icon: FolderOpen, to: '/admin/projects' },
  { label: 'Tasks', icon: CheckSquare, to: '/admin/tasks' },
  { label: 'Inbox', icon: Inbox, to: '/inbox' },
  { label: 'Clients', icon: UserCircle, to: '/admin/clients', authoritativeOnly: true },
  { label: 'Teams', icon: Users, to: '/teams', authoritativeOnly: true },
  { label: 'People', icon: UserCog, to: '/people', authoritativeOnly: true },
  { label: 'Attendance', icon: CalendarCheck, to: '/attendance/records', matchPrefix: '/attendance', primaryMobile: true, children: ATTENDANCE_CHILDREN },
  { label: 'Standup', icon: ClipboardList, to: '/standup' },
  { label: 'Gamification', icon: Trophy, to: '/gamification/leaderboard', matchPrefix: '/gamification', primaryMobile: true, children: GAMIFICATION_CHILDREN },
  { label: 'Reports', icon: BarChart2, to: '/admin/reports', devOnly: true },
  { label: 'Settings', icon: Settings, to: '/settings', roles: SETTINGS_ROLES },
]

/** Nav items visible to the given role in the current build (WIP + authoritative filtering). */
export function visibleNavItems(role: string | null | undefined): NavItem[] {
  const authoritative = isAuthoritative(role)
  const allowed = (item: NavItem) =>
    (showWipFeatures || !item.devOnly) &&
    (authoritative || !item.authoritativeOnly) &&
    (!item.roles || item.roles.includes(role ?? ''))

  return NAV_ITEMS.filter(allowed).map((item) => {
    if (!item.children) return item
    const children = item.children.filter(allowed)
    return children.length > 0 ? { ...item, children } : { ...item, children: undefined }
  })
}

/** Secondary destinations for the mobile "More" tab (everything not in the bottom bar). */
export function moreNavItems(role: string | null | undefined): NavItem[] {
  return visibleNavItems(role).filter((item) => !item.primaryMobile)
}
