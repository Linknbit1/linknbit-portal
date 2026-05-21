import { useEffect, useRef, useState } from 'react'
import { Bell, Search, Check, CheckCheck } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Avatar } from '../ui/Avatar'
import { RoleBadge } from '../shared/RoleBadge'
import { useAuthContext } from '../../context/AuthContext'
import { useNotifications, useMarkRead, useMarkAllRead } from '../../hooks/useNotifications'
import { formatRelativeTime } from '../../lib/utils'
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
}

export function Topbar({ title, breadcrumb, className }: TopbarProps) {
  const { profile } = useAuthContext()
  const profileId = profile?.id ?? ''

  const { data: notifications = [] } = useNotifications(profileId)
  const { mutate: markRead } = useMarkRead(profileId)
  const { mutate: markAllRead } = useMarkAllRead(profileId)

  const unreadCount = notifications.filter((n) => !n.read).length
  const [bellOpen, setBellOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false)
      }
    }
    if (bellOpen) document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [bellOpen])

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
        <div ref={bellRef} className="relative">
          <button
            onClick={() => setBellOpen((o) => !o)}
            className="relative w-9 h-9 rounded-sm bg-surface-1 border border-border-default text-text-2 hover:bg-surface-2 hover:text-text-1 flex items-center justify-center transition-colors"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-4 h-4 bg-brand-red text-white text-[9.5px] font-ui font-bold rounded-full flex items-center justify-center px-1 leading-none border-2 border-bg-base">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {bellOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] w-80 bg-surface-1 border border-border-default rounded-xl shadow-2xl overflow-hidden z-50">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
                <span className="font-display font-bold text-[14px] text-text-1">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllRead()}
                    className="flex items-center gap-1 text-[11px] font-ui text-text-3 hover:text-text-1 transition-colors"
                  >
                    <CheckCheck size={12} />
                    Mark all read
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-[12px] font-ui text-text-4">
                    No notifications yet
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <button
                      key={notif.id}
                      onClick={() => { if (!notif.read) markRead(notif.id) }}
                      className={cn(
                        'w-full text-left px-4 py-3 border-b border-border-subtle last:border-0 hover:bg-surface-2/60 transition-colors flex gap-3 items-start',
                        !notif.read && 'bg-brand-red/[0.04]',
                      )}
                    >
                      <div className={cn(
                        'w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0',
                        notif.read ? 'bg-transparent' : 'bg-brand-red',
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className={cn('font-ui text-[12.5px] leading-snug', notif.read ? 'text-text-3' : 'text-text-1 font-semibold')}>
                          {notif.title}
                        </p>
                        {notif.body && (
                          <p className="font-ui text-[11.5px] text-text-3 mt-0.5 leading-snug line-clamp-2">
                            {notif.body}
                          </p>
                        )}
                        <p className="font-mono text-[10px] text-text-4 mt-1">
                          {formatRelativeTime(notif.created_at)}
                        </p>
                      </div>
                      {notif.read && <Check size={12} className="text-text-4 flex-shrink-0 mt-1" />}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

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
