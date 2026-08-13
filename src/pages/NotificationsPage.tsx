import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Check, CheckCheck } from 'lucide-react'
import { StackScreen } from '../components/layout/StackScreen'
import { useAuthContext } from '../context/AuthContext'
import { useNotifications, useMarkGroupRead, useMarkAllRead } from '../hooks/useNotifications'
import { notificationHref } from '../constants/notifications'
import { groupNotifications, groupTitle } from '../lib/notificationGroups'
import { formatRelativeTime } from '../lib/utils'
import { cn } from '../lib/cn'

/**
 * The full notification list, on every size. It used to bounce desktop visitors
 * to /dashboard on the grounds that the bell dropdown was enough — but the
 * dropdown is capped at a short scroll, so "View all" needs somewhere to land.
 */
export default function NotificationsPage() {
  const navigate = useNavigate()
  const { profile } = useAuthContext()
  const profileId = profile?.id ?? ''

  const { data: notifications = [], isLoading } = useNotifications(profileId)
  const groups = useMemo(() => groupNotifications(notifications), [notifications])
  const { mutate: markGroupRead } = useMarkGroupRead(profileId)
  const { mutate: markAllRead } = useMarkAllRead(profileId)

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
            {groups.map((group) => {
              const notif = group.latest
              const isUnread = group.unreadCount > 0
              return (
                <button
                  key={group.key}
                  onClick={() => {
                    if (isUnread) markGroupRead(group.ids)
                    const href = notificationHref(notif.resource_type, notif.resource_id)
                    if (href) navigate(href)
                  }}
                  className={cn(
                    'w-full text-left px-4 py-3 border-b border-border-subtle last:border-0 flex gap-3 items-start transition-colors active:bg-surface-2/60',
                    isUnread && 'bg-brand-red/4',
                  )}
                >
                  <span className={cn('size-1.5 rounded-full mt-1.5 shrink-0', isUnread ? 'bg-brand-red' : 'bg-transparent')} />
                  <span className="flex-1 min-w-0">
                    <span className={cn('block font-ui text-body-sm/snug', isUnread ? 'text-text-1 font-semibold' : 'text-text-3')}>
                      {groupTitle(group)}
                    </span>
                    {notif.body && (
                      <span className="block font-ui text-caption/snug text-text-3 mt-0.5 line-clamp-2">{notif.body}</span>
                    )}
                    <span className="block font-mono text-[10px] text-text-4 mt-1">
                      {formatRelativeTime(notif.created_at)}
                    </span>
                  </span>
                  {group.count > 1
                    ? <span className="shrink-0 mt-0.5 rounded-full bg-surface-3 px-1.5 font-mono text-[10px] text-text-3">{group.count}</span>
                    : !isUnread && <Check size={12} className="text-text-4 shrink-0 mt-1" />}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </StackScreen>
  )
}
