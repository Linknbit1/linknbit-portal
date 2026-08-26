import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bell, CheckCheck, AtSign, CheckSquare, MessageSquare, BellOff, Flag,
  ChevronRight, CircleCheck,
} from 'lucide-react'
import { Topbar } from '../components/layout/Topbar'
import { Skeleton } from '../components/ui/Skeleton'
import { useAuthContext } from '../context/AuthContext'
import { useNotifications, useMarkGroupRead, useMarkAllRead } from '../hooks/useNotifications'
import { notificationHref, categoryForType, INBOX_CATEGORIES } from '../constants/notifications'
import { groupNotifications, groupTitle, type NotificationGroup } from '../lib/notificationGroups'
import { formatRelativeTime } from '../lib/utils'
import { cn } from '../lib/cn'
import { useWaitingOnYou } from '../hooks/useWaitingOnYou'
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

/**
 * Notifications: the "waiting on you" queue and the notification feed in one
 * screen. It opens on Waiting on you because that tab is a queue you clear by
 * acting; All and Unread are news you clear by reading.
 */
export default function NotificationsPage() {
  const navigate = useNavigate()
  const { profile } = useAuthContext()
  const profileId = profile?.id ?? ''
  const { data: notifications = [], isLoading } = useNotifications(profileId)
  const { mutate: markGroupRead } = useMarkGroupRead(profileId)
  const { mutate: markAllRead } = useMarkAllRead(profileId)
  const [tab, setTab] = useState<'waiting' | 'all' | 'unread'>('waiting')
  const [category, setCategory] = useState('all')

  const unread = notifications.filter((n) => !n.read).length
  // The actionable queue: things somebody is blocked on, as opposed to news.
  const { items: waiting, total: waitingTotal } = useWaitingOnYou()

  // Read/unread narrows first; the category counts then describe what that tab
  // actually holds, so "Chat 3" on the unread tab means three unread chat items.
  const inTab = useMemo(
    () => (tab === 'unread' ? notifications.filter((n) => !n.read) : notifications),
    [notifications, tab],
  )

  // Only categories with something in them get a chip — a list of empty
  // filters is worse than no filters.
  const categoryChips = useMemo(() => {
    const counts = new Map<string, number>()
    for (const n of inTab) {
      const key = categoryForType(n.type).key
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return [
      { key: 'all', label: 'All', count: inTab.length },
      ...INBOX_CATEGORIES
        .filter((c) => counts.has(c.key))
        .map((c) => ({ key: c.key, label: c.label, count: counts.get(c.key) ?? 0 })),
    ]
  }, [inTab])

  // Switching to Unread can empty the category you were on; fall back to All
  // rather than showing a blank list with no chip lit up.
  const activeCategory = categoryChips.some((c) => c.key === category) ? category : 'all'

  // Group last, so a run of "3 task updates" never spans two categories.
  const shown = useMemo(
    () => groupNotifications(
      activeCategory === 'all' ? inTab : inTab.filter((n) => categoryForType(n.type).key === activeCategory),
    ),
    [inTab, activeCategory],
  )

  const open = (group: NotificationGroup) => {
    // One write for the whole run; re-marking an already-read id is a no-op.
    if (group.unreadCount > 0) markGroupRead(group.ids)
    const href = notificationHref(group.latest.resource_type, group.latest.resource_id, group.latest.type)
    if (href) navigate(href)
  }

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Notifications" />
      <div className="p-4 lg:px-8 lg:py-7 flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <h2 className="font-display font-bold text-[22px] text-text-1">Notifications</h2>
          {waitingTotal > 0 && <span className="px-2 py-0.5 rounded-sm bg-brand-red text-white text-[11px] font-bold">{waitingTotal}</span>}
          {unread > 0 && (
            <button onClick={() => markAllRead()} className="ml-auto flex items-center gap-1.5 font-ui text-[12px] text-text-3 hover:text-text-1 transition-colors">
              <CheckCheck size={14} /> Mark all read
            </button>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1 bg-surface-1 border border-border-default rounded-lg p-1 w-fit">
            {([
              { key: 'waiting', label: 'Waiting on you', count: waitingTotal },
              { key: 'all', label: 'All', count: 0 },
              { key: 'unread', label: 'Unread', count: unread },
            ] as const).map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn('px-3 h-8 rounded-md font-ui font-medium text-[12.5px] transition-colors flex items-center gap-1.5', tab === t.key ? 'bg-surface-3 text-text-1 shadow-sm' : 'text-text-3 hover:text-text-1')}
              >
                {t.label}
                {t.count > 0 && <span className="font-mono text-[10.5px] tabular-nums opacity-70">{t.count}</span>}
              </button>
            ))}
          </div>

          {/* Category filters — same buckets the notification settings screen uses.
              They describe notifications, so the actionable queue has none. */}
          <div className={cn('flex flex-wrap items-center gap-1.5', tab === 'waiting' && 'hidden')}>
            {categoryChips.map((c) => {
              const on = activeCategory === c.key
              return (
                <button
                  key={c.key}
                  onClick={() => setCategory(c.key)}
                  aria-pressed={on}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-sm border px-3 py-1 font-ui text-[12px] transition-colors',
                    on
                      ? 'border-brand-red/30 bg-brand-red/10 text-brand-red'
                      : 'border-border-default bg-surface-1 text-text-3 hover:border-border-strong hover:text-text-1',
                  )}
                >
                  {c.label}
                  <span className={cn('font-mono text-[10px]', on ? 'text-brand-red/70' : 'text-text-4')}>{c.count}</span>
                </button>
              )
            })}
          </div>
        </div>

        {tab === 'waiting' ? (
          waiting.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-20 text-center">
              <span className="size-12 rounded-full bg-success/12 flex items-center justify-center text-success">
                <CircleCheck size={22} />
              </span>
              <p className="font-ui font-semibold text-[14px] text-text-1">Nothing is stuck on you</p>
              <p className="font-ui text-[12px] text-text-4 max-w-sm">
                Approvals, requests to review and mentions waiting for a reply appear here. When it
                is empty, nobody is blocked.
              </p>
            </div>
          ) : (
            <div className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
              {waiting.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.id}
                    to={item.to}
                    className="w-full text-left px-4 py-3.5 border-b border-border-subtle last:border-0 flex gap-3 items-center transition-colors hover:bg-surface-2/50"
                  >
                    <span className="size-8 rounded-lg bg-surface-2 flex items-center justify-center text-text-3 shrink-0">
                      <Icon size={15} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-ui text-[13px] font-semibold text-text-1 truncate">
                        {item.label}
                      </span>
                      {item.detail && (
                        <span className="block font-ui text-[12px] text-text-3 truncate">{item.detail}</span>
                      )}
                    </span>
                    <ChevronRight size={14} className="shrink-0 text-text-4" />
                  </Link>
                )
              })}
            </div>
          )
        ) : isLoading ? (
          <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : shown.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-20 text-center">
            <span className="size-12 rounded-full bg-surface-2 flex items-center justify-center text-text-3"><BellOff size={22} /></span>
            <p className="font-ui font-semibold text-[14px] text-text-1">
              {activeCategory === 'all' ? "You're all caught up" : 'Nothing in this category'}
            </p>
            <p className="font-ui text-[12px] text-text-4 max-w-sm">
              {activeCategory === 'all'
                ? "Mentions, new tasks, and comments on projects you're watching show up here."
                : 'Pick another category, or switch back to All.'}
            </p>
          </div>
        ) : (
          <div className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
            {shown.map((group) => {
              const n = group.latest
              const Icon = iconFor(n)
              const href = notificationHref(n.resource_type, n.resource_id, n.type)
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
                        <span className="shrink-0 rounded-sm bg-surface-3 px-1.5 font-mono text-[10px] text-text-3">{group.count}</span>
                      )}
                      {isUnread && <span className="size-1.5 rounded-full bg-brand-red shrink-0" />}
                    </span>
                    {n.body && <span className="block font-ui text-[12px] text-text-3 mt-0.5 line-clamp-2">{n.body}</span>}
                    <span className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="rounded-sm border border-border-subtle bg-surface-2 px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-text-4">
                        {categoryForType(n.type).label}
                      </span>
                      <span className="font-mono text-[10px] text-text-4">{formatRelativeTime(n.created_at)}{href ? ' · click to open' : ''}</span>
                    </span>
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
