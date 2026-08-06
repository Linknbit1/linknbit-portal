import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell, CheckCheck, AtSign, CheckSquare, MessageSquare, Inbox as InboxIcon, Flag,
} from 'lucide-react'
import { Topbar } from '../components/layout/Topbar'
import { Skeleton } from '../components/ui/Skeleton'
import { useAuthContext } from '../context/AuthContext'
import { useNotifications, useMarkGroupRead, useMarkAllRead } from '../hooks/useNotifications'
import { notificationHref } from '../constants/notifications'
import { groupNotifications, groupTitle, type NotificationGroup } from '../lib/notificationGroups'
import { formatRelativeTime } from '../lib/utils'
import { cn } from '../lib/cn'
import type { NotificationRow } from '../api/notifications'

function iconFor(n: NotificationRow) {
  switch (n.type) {
    case 'mention': return AtSign
    case 'project_task_added': return CheckSquare
    case 'project_comment_added': return MessageSquare
    default:
      if (n.resource_type === 'task') return CheckSquare
      if (n.resource_type === 'project') return Flag
      return Bell
  }
}

export default function InboxPage() {
  const navigate = useNavigate()
  const { profile } = useAuthContext()
  const profileId = profile?.id ?? ''
  const { data: notifications = [], isLoading } = useNotifications(profileId)
  const { mutate: markGroupRead } = useMarkGroupRead(profileId)
  const { mutate: markAllRead } = useMarkAllRead(profileId)
  const [tab, setTab] = useState<'all' | 'unread'>('all')

  const unread = notifications.filter((n) => !n.read).length
  // Group after filtering, so the unread tab counts only what it is showing.
  const shown = useMemo(
    () => groupNotifications(tab === 'unread' ? notifications.filter((n) => !n.read) : notifications),
    [notifications, tab],
  )

  const open = (group: NotificationGroup) => {
    // One write for the whole run; re-marking an already-read id is a no-op.
    if (group.unreadCount > 0) markGroupRead(group.ids)
    const href = notificationHref(group.latest.resource_type, group.latest.resource_id)
    if (href) navigate(href)
  }

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Inbox" />
      <div className="p-4 lg:px-8 lg:py-7 flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <h2 className="font-display font-bold text-[22px] text-text-1">Inbox</h2>
          {unread > 0 && <span className="px-2 py-0.5 rounded-full bg-brand-red text-white text-[11px] font-bold">{unread}</span>}
          {unread > 0 && (
            <button onClick={() => markAllRead()} className="ml-auto flex items-center gap-1.5 font-ui text-[12px] text-text-3 hover:text-text-1 transition-colors">
              <CheckCheck size={14} /> Mark all read
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 bg-surface-1 border border-border-default rounded-lg p-1 w-fit">
          {(['all', 'unread'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn('px-3 h-8 rounded-md font-ui font-medium text-[12.5px] capitalize transition-colors', tab === t ? 'bg-surface-3 text-text-1 shadow-sm' : 'text-text-3 hover:text-text-1')}
            >
              {t}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : shown.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-20 text-center">
            <span className="size-12 rounded-full bg-surface-2 flex items-center justify-center text-text-3"><InboxIcon size={22} /></span>
            <p className="font-ui font-semibold text-[14px] text-text-1">You're all caught up</p>
            <p className="font-ui text-[12px] text-text-4 max-w-sm">Mentions, new tasks, and comments on projects you're watching show up here.</p>
          </div>
        ) : (
          <div className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
            {shown.map((group) => {
              const n = group.latest
              const Icon = iconFor(n)
              const href = notificationHref(n.resource_type, n.resource_id)
              const isUnread = group.unreadCount > 0
              return (
                <button
                  key={group.key}
                  onClick={() => open(group)}
                  className={cn(
                    'w-full text-left px-4 py-3.5 border-b border-border-subtle last:border-0 flex gap-3 items-start transition-colors hover:bg-surface-2/50',
                    isUnread && 'bg-brand-red/4',
                  )}
                >
                  <span className="size-8 rounded-lg bg-surface-2 flex items-center justify-center text-text-3 shrink-0"><Icon size={15} /></span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2">
                      <span className={cn('font-ui text-[13px]', isUnread ? 'text-text-1 font-semibold' : 'text-text-2')}>{groupTitle(group)}</span>
                      {group.count > 1 && (
                        <span className="shrink-0 rounded-full bg-surface-3 px-1.5 font-mono text-[10px] text-text-3">{group.count}</span>
                      )}
                      {isUnread && <span className="size-1.5 rounded-full bg-brand-red shrink-0" />}
                    </span>
                    {n.body && <span className="block font-ui text-[12px] text-text-3 mt-0.5 line-clamp-2">{n.body}</span>}
                    <span className="block font-mono text-[10px] text-text-4 mt-1">{formatRelativeTime(n.created_at)}{href ? ' · click to open' : ''}</span>
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
