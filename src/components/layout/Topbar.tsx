import { Bell, Search } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Avatar } from '../ui/Avatar'
import { RoleBadge } from '../shared/RoleBadge'
import { useAuthContext } from '../../context/AuthContext'
import type { UserRole } from '../../types'

const VALID_ROLES = new Set<string>([
  'super_admin', 'admin', 'project_manager', 'team_lead',
  'employee', 'hr', 'finance', 'client_owner', 'client_member',
])

function isUserRole(role: string): role is UserRole {
  return VALID_ROLES.has(role)
}

interface TopbarProps {
  title?: string
  breadcrumb?: string
  className?: string
  unreadCount?: number
}

export function Topbar({ title, breadcrumb, className, unreadCount = 0 }: TopbarProps) {
  const { profile } = useAuthContext()
  return (
    <header
      className={cn(
        'h-topbar topbar-glass border-b border-border-default sticky top-0 z-40 flex items-center px-8 gap-6',
        className,
      )}
    >
      {/* Title */}
      <div className="flex items-baseline gap-2.5">
        {breadcrumb && (
          <span className="font-mono text-[11px] text-text-4 uppercase tracking-wider">{breadcrumb}</span>
        )}
        {title && (
          <h1 className="font-display font-bold text-[20px] text-text-1 leading-none tracking-tight m-0">
            {title}
          </h1>
        )}
      </div>

      {/* Search */}
      <div className="ml-8 flex-1 max-w-md bg-surface-1 border border-border-default rounded-sm h-9 flex items-center gap-2.5 px-3">
        <Search size={14} className="text-text-3 flex-shrink-0" />
        <input
          type="text"
          placeholder="Search projects, tasks, people..."
          className="bg-transparent border-0 outline-none text-body font-ui text-text-1 placeholder:text-text-3 flex-1 min-w-0 font-medium"
        />
        <span className="font-mono text-[10px] text-text-4 border border-border-default rounded px-1.5 py-0.5 flex-shrink-0">
          ⌘K
        </span>
      </div>

      {/* Actions */}
      <div className="ml-auto flex items-center gap-3.5">
        {/* Notification bell */}
        <button className="relative w-9 h-9 rounded-sm bg-surface-1 border border-border-default text-text-2 hover:bg-surface-2 hover:text-text-1 flex items-center justify-center transition-colors">
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-4 h-4 bg-brand-red text-white text-[9.5px] font-ui font-bold rounded-full flex items-center justify-center px-1 leading-none border-2 border-bg-base">
              {unreadCount}
            </span>
          )}
        </button>

        {/* User */}
        {profile && isUserRole(profile.role) && (
          <button className="flex items-center gap-2.5 pl-1 pr-2.5 py-1 rounded-full bg-surface-1 border border-border-default hover:bg-surface-2 transition-colors">
            <Avatar name={profile.name} size="sm" />
            <div className="flex flex-col items-start leading-tight">
              <span className="font-ui font-semibold text-[12.5px] text-text-1 whitespace-nowrap">
                {profile.name}
              </span>
              <RoleBadge role={profile.role} size="sm" className="border-0 bg-transparent px-0 py-0 text-text-3" />
            </div>
          </button>
        )}
      </div>
    </header>
  )
}
