import {
  LayoutDashboard,
  FolderOpen,
  Users,
  UserCog,
  CheckSquare,
  BarChart2,
  Trophy,
  Link2,
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
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard', primaryMobile: true },
  { label: 'Projects', icon: FolderOpen, to: '/admin/projects', badge: 2, devOnly: true },
  { label: 'Clients', icon: UserCircle, to: '/admin/clients', devOnly: true },
  { label: 'Teams', icon: Users, to: '/teams', authoritativeOnly: true },
  { label: 'People', icon: UserCog, to: '/people', authoritativeOnly: true },
  { label: 'Tasks', icon: CheckSquare, to: '/admin/tasks', badge: 7, devOnly: true },
  { label: 'Attendance', icon: CalendarCheck, to: '/attendance', primaryMobile: true },
  { label: 'Gamification', icon: Trophy, to: '/gamification', primaryMobile: true },
  { label: 'Reports', icon: BarChart2, to: '/admin/reports', devOnly: true },
  { label: 'ClickUp', icon: Link2, to: '/admin/clickup', devOnly: true },
  { label: 'Settings', icon: Settings, to: '/settings', roles: SETTINGS_ROLES },
]

/** Nav items visible to the given role in the current build (WIP + authoritative filtering). */
export function visibleNavItems(role: string | null | undefined): NavItem[] {
  const authoritative = isAuthoritative(role)
  return NAV_ITEMS.filter(
    (item) =>
      (showWipFeatures || !item.devOnly) &&
      (authoritative || !item.authoritativeOnly) &&
      (!item.roles || item.roles.includes(role ?? '')),
  )
}

/** Secondary destinations for the mobile "More" tab (everything not in the bottom bar). */
export function moreNavItems(role: string | null | undefined): NavItem[] {
  return visibleNavItems(role).filter((item) => !item.primaryMobile)
}
