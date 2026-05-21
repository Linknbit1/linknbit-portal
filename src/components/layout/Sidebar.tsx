import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  CheckSquare,
  BarChart2,
  Trophy,
  Link2,
  Settings,
  UserCircle,
  ChevronRight,
  CalendarCheck,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import { Avatar } from '../ui/Avatar'
import { RoleBadge } from '../shared/RoleBadge'
import { useAuthContext } from '../../context/AuthContext'

const ATTENDANCE_ADMIN_ROLES = ['super_admin', 'admin', 'hr', 'project_manager']

const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/admin/dashboard' },
  { label: 'Projects', icon: FolderOpen, to: '/admin/projects', badge: 2 },
  { label: 'Clients', icon: UserCircle, to: '/admin/clients' },
  { label: 'Teams', icon: Users, to: '/admin/teams' },
  { label: 'Tasks', icon: CheckSquare, to: '/admin/tasks', badge: 7 },
  { label: 'Attendance', icon: CalendarCheck, to: '/admin/attendance' },
  { label: 'Reports', icon: BarChart2, to: '/admin/reports' },
  { label: 'Gamification', icon: Trophy, to: '/admin/gamification' },
  { label: 'ClickUp', icon: Link2, to: '/admin/clickup' },
  { label: 'Settings', icon: Settings, to: '/admin/settings' },
]

export function Sidebar() {
  const location = useLocation()
  const { profile } = useAuthContext()
  const role = profile?.role ?? 'employee'
  const attendancePath = ATTENDANCE_ADMIN_ROLES.includes(role) ? '/admin/attendance' : '/employee/attendance'

  const navItems = NAV_ITEMS.map((item) =>
    item.label === 'Attendance' ? { ...item, to: attendancePath } : item
  )

  return (
    <aside className="w-sidebar-expanded bg-surface-1 border-r border-border-default flex flex-col sticky top-0 h-screen overflow-y-auto flex-shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-4 border-b border-border-subtle">
        <span className="w-7 h-7 rounded-sm bg-brand-red flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 41 45" width="20" height="20" fill="none">
            <rect x="0" y="3.5" width="10.5" height="10.5" rx="0.4" fill="white" />
            <rect x="0" y="18.7" width="10.5" height="26" rx="0.4" fill="white" />
            <rect x="15" y="3.5" width="10.5" height="25.9" rx="0.4" fill="white" />
            <rect x="15" y="33.9" width="10.5" height="10.5" rx="0.4" fill="white" />
            <rect x="30.4" y="3.5" width="10.5" height="10.5" rx="0.4" fill="#EE2737" />
            <rect x="30.4" y="18.7" width="10.5" height="26" rx="0.4" fill="white" />
          </svg>
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-body-sm text-text-1 leading-tight">Linknbit</p>
          <p className="font-mono text-[9px] text-text-4 uppercase tracking-wider mt-0.5">Operations Portal</p>
        </div>
        <button className="w-5 h-5 rounded flex items-center justify-center text-text-4 hover:text-text-2 hover:bg-surface-2 transition-colors">
          <ChevronRight size={12} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pt-3 pb-2 flex flex-col gap-px">
        <p className="text-[10px] font-ui font-semibold text-text-4 uppercase tracking-widest px-2 py-2">
          Main Menu
        </p>
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.to)
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-2 rounded-sm font-ui font-medium text-body-sm transition-colors relative',
                isActive
                  ? 'bg-brand-red/[0.13] text-white nav-active-indicator'
                  : 'text-text-2 hover:bg-surface-2 hover:text-text-1',
              )}
            >
              <item.icon
                size={16}
                className={cn('flex-shrink-0', isActive ? 'text-brand-red' : 'text-text-3')}
              />
              <span>{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="ml-auto bg-brand-red text-white font-ui font-bold text-[10px] px-1.5 py-px rounded-full leading-tight">
                  {item.badge}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* User pill */}
      <div className="border-t border-border-subtle px-3 py-3 mt-auto">
        <div className="flex items-center gap-2.5">
          <Avatar name={profile?.name ?? '?'} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="font-ui font-semibold text-body-sm text-text-1 leading-tight truncate">
              {profile?.name ?? '—'}
            </p>
            <RoleBadge role={role as import('../../types').UserRole} size="sm" className="mt-0.5" />
          </div>
          <button className="w-6 h-6 rounded flex items-center justify-center text-text-3 hover:text-text-1 hover:bg-surface-2 transition-colors">
            <ChevronRight size={12} />
          </button>
        </div>
      </div>
    </aside>
  )
}
