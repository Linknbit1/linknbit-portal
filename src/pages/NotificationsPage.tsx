import { Navigate, useNavigate } from 'react-router-dom'
import { Bell, Check, CheckCheck } from 'lucide-react'
import { StackScreen } from '../components/layout/StackScreen'
import { useAuthContext } from '../context/AuthContext'
import { useIsDesktop } from '../hooks/useMediaQuery'
import { useNotifications, useMarkRead, useMarkAllRead } from '../hooks/useNotifications'
import { notificationHref } from '../constants/notifications'
import { formatRelativeTime } from '../lib/utils'
import { cn } from '../lib/cn'

/**
 * Mobile notification list. Desktop reads notifications from the Topbar bell
 * dropdown, so this redirects there rather than shipping two competing surfaces.
 */
export default function NotificationsPage() {
  const isDesktop = useIsDesktop()
  const navigate = useNavigate()
  const { profile } = useAuthContext()
  const profileId = profile?.id ?? ''

  const { data: notifications = [], isLoading } = useNotifications(profileId)
  const { mutate: markRead } = useMarkRead(profileId)
  const { mutate: markAllRead } = useMarkAllRead(profileId)

  if (isDesktop) return <Navigate to="/dashboard" replace />

  const unread = notifications.filter((n) => !n.read).length

  return (
    <StackScreen title="Notifications">
      <div className="flex flex-col gap-3">
        {unread > 0 && (
          <button
            onClick={() => markAllRead()}
            className="self-end flex items-center gap-1.5 font-ui text-[12px] text-text-3 active:text-text-1 transition-colors"
          >
            <CheckCheck size={13} /> Mark all read
          </button>
        )}

        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-surface-2 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <div className="size-11 rounded-full bg-surface-2 flex items-center justify-center">
              <Bell size={18} className="text-text-3" />
            </div>
            <p className="font-ui font-semibold text-[13px] text-text-1">You're all caught up</p>
            <p className="font-ui text-[12px] text-text-4 max-w-60">
              Shoutouts, request updates and schedule changes will show up here.
            </p>
          </div>
        ) : (
          <div className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
            {notifications.map((notif) => (
              <button
                key={notif.id}
                onClick={() => {
                  if (!notif.read) markRead(notif.id)
                  const href = notificationHref(notif.resource_type, notif.resource_id)
                  if (href) navigate(href)
                }}
                className={cn(
                  'w-full text-left px-4 py-3 border-b border-border-subtle last:border-0 flex gap-3 items-start transition-colors active:bg-surface-2/60',
                  !notif.read && 'bg-brand-red/4',
                )}
              >
                <span className={cn('size-1.5 rounded-full mt-1.5 shrink-0', notif.read ? 'bg-transparent' : 'bg-brand-red')} />
                <span className="flex-1 min-w-0">
                  <span className={cn('block font-ui text-body-sm/snug', notif.read ? 'text-text-3' : 'text-text-1 font-semibold')}>
                    {notif.title}
                  </span>
                  {notif.body && (
                    <span className="block font-ui text-caption/snug text-text-3 mt-0.5">{notif.body}</span>
                  )}
                  <span className="block font-mono text-[10px] text-text-4 mt-1">
                    {formatRelativeTime(notif.created_at)}
                  </span>
                </span>
                {notif.read && <Check size={12} className="text-text-4 shrink-0 mt-1" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </StackScreen>
  )
}
