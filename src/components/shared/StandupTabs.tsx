import { NavLink } from 'react-router-dom'
import { ClipboardList, Users, History, Settings as SettingsIcon, type LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useAuthContext } from '../../context/AuthContext'
import { useCanAccess } from '../../hooks/useRoleFlags'
import { isAuthoritative } from '../../lib/roles'

interface StandupTab {
  to: string
  label: string
  icon: LucideIcon
  visible: boolean
}

/**
 * Section switcher for the standup pages. The desktop sidebar shows the same
 * destinations as an expandable group; this strip is what makes them reachable on
 * mobile, where "More" only lists top-level items.
 */
export function StandupTabs() {
  const { profile } = useAuthContext()
  const canReviewTeam = isAuthoritative(profile?.role)
  const canManage = useCanAccess('can_manage_standups')

  const tabs: StandupTab[] = [
    { to: '/standup',          label: 'My Standup', icon: ClipboardList, visible: true },
    { to: '/standup/team',     label: 'Team',       icon: Users,         visible: canReviewTeam },
    { to: '/standup/history',  label: 'History',    icon: History,       visible: true },
    { to: '/standup/settings', label: 'Settings',   icon: SettingsIcon,  visible: canManage },
  ]

  const visible = tabs.filter((t) => t.visible)
  if (visible.length < 2) return null

  return (
    <nav className="flex items-center gap-1 bg-surface-1 border border-border-default rounded-lg p-1 overflow-x-auto no-scrollbar max-w-full">
      {visible.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end
          className={({ isActive }) => cn(
            'flex items-center gap-2 px-4 py-2 rounded-sm text-[13px] font-ui font-medium transition-colors shrink-0 whitespace-nowrap',
            isActive ? 'bg-surface-3 text-text-1 shadow-sm' : 'text-text-3 hover:text-text-2',
          )}
        >
          <Icon size={14} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
