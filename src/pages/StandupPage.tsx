import { useState } from 'react'
import {
  Lock, CheckCircle2, Clock, AlertTriangle, CalendarOff, Users, ClipboardList, Coffee,
} from 'lucide-react'
import { Topbar } from '../components/layout/Topbar'
import { Avatar } from '../components/ui/Avatar'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { DatePicker } from '../components/ui/DatePicker'
import { ServiceChip } from '../components/shared/ServiceChip'
import { cn } from '../lib/cn'
import { formatRelativeTime } from '../lib/utils'
import { useAuthContext } from '../context/AuthContext'
import { isAuthoritative } from '../lib/roles'
import { useStandupWindow, useWindowCountdown, useStandupsByDate, useStandupRoster } from '../hooks/useStandups'
import { StandupForm } from './StandupForm'
import type { StandupDetail } from '../api/standups'

function hhmm(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`
}

function fmtMinutes(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h${m ? ` ${m}m` : ''}` : `${m}m`
}

/** Office-local wall time of an ISO instant, e.g. "4:55 PM". */
function officeTime(iso: string, tz: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }).format(new Date(iso))
}

export default function StandupPage() {
  const { profile } = useAuthContext()
  const canSeeTeam = isAuthoritative(profile?.role)
  const { data: win, isLoading } = useStandupWindow()
  const [tab, setTab] = useState<'mine' | 'team'>(canSeeTeam ? 'team' : 'mine')

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Daily Standup" />
      <div className="p-4 lg:px-8 lg:py-7 flex flex-col gap-6">
        <div>
          <h2 className="font-display font-bold text-[22px] text-text-1">Daily Standup</h2>
          <p className="font-ui text-[13px] text-text-3">
            End-of-day update — what you worked on, how long it took, and anything blocking you.
          </p>
        </div>

        {canSeeTeam && (
          <div className="flex items-center gap-1 bg-surface-1 border border-border-default rounded-lg p-1 w-fit">
            {([['mine', 'My update', ClipboardList], ['team', 'Team', Users]] as const).map(([k, label, Icon]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={cn('flex items-center gap-1.5 px-3 h-8 rounded-md font-ui font-medium text-[12.5px] transition-colors',
                  tab === k ? 'bg-surface-3 text-text-1 shadow-sm' : 'text-text-3 hover:text-text-1')}
              >
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>
        )}

        {tab === 'mine' && (isLoading ? <Skeleton className="h-40" /> : win ? <MyStandup win={win} /> : null)}
        {tab === 'team' && canSeeTeam && <TeamStandups />}
      </div>
    </div>
  )
}

function MyStandup({ win }: { win: NonNullable<ReturnType<typeof useStandupWindow>['data']> }) {
  const untilOpen = useWindowCountdown(win.server_now, win.opens_at)
  const untilOnTime = useWindowCountdown(win.server_now, win.on_time_until)
  const opensLabel = officeTime(win.opens_at, win.timezone)
  const onTimeLabel = officeTime(win.on_time_until, win.timezone)
  const isLateNow = new Date(win.server_now) > new Date(win.on_time_until)

  if (!win.is_working_day) {
    return (
      <Panel icon={CalendarOff} tone="muted" title="Not a working day">
        No standup needed today. Enjoy the break.
      </Panel>
    )
  }

  if (win.already_done) {
    return (
      <Panel icon={CheckCircle2} tone="success" title="Standup submitted">
        You've logged today's update. Thanks — it's visible to your leads.
      </Panel>
    )
  }

  if (!win.is_required) {
    return (
      <Panel icon={Coffee} tone="muted" title="No standup required">
        Standups are for employees. You can review the team's updates in the Team tab.
      </Panel>
    )
  }

  // Before the slot opens — the whole point: no writing early.
  if (!win.is_open && untilOpen !== null && untilOpen > 0) {
    return (
      <Panel icon={Lock} tone="locked" title="Standup opens at " titleSuffix={opensLabel}>
        <p className="mb-3">
          The form unlocks 5 minutes before the end of the working day so updates reflect the full day.
          Submit by {onTimeLabel} to earn <strong className="text-text-1">5 XP</strong>.
        </p>
        <div className="inline-flex items-baseline gap-2 bg-surface-inset border border-border-default rounded-lg px-4 py-2.5">
          <span className="font-mono text-[22px] font-bold text-text-1 tabular-nums">{hhmm(untilOpen)}</span>
          <span className="font-ui text-[12px] text-text-3">until it opens</span>
        </div>
      </Panel>
    )
  }

  // After close (next working day's start).
  if (!win.is_open) {
    return (
      <Panel icon={AlertTriangle} tone="error" title="Window closed">
        The standup window has closed. Speak to your lead if you need today's update recorded.
      </Panel>
    )
  }

  return (
    <div className="space-y-4">
      {isLateNow ? (
        <div className="flex items-center gap-2 bg-error/8 border border-error/25 rounded-lg px-3.5 py-2.5">
          <AlertTriangle size={14} className="text-error shrink-0" />
          <span className="font-ui text-[12.5px] text-text-2">
            The on-time window (until {onTimeLabel}) has passed — you can still submit, but it'll be marked <strong className="text-text-1">late</strong> and won't earn XP.
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 bg-success/8 border border-success/25 rounded-lg px-3.5 py-2.5">
          <Clock size={14} className="text-success shrink-0" />
          <span className="font-ui text-[12.5px] text-text-2">
            Submit by <strong className="text-text-1">{onTimeLabel}</strong> to earn 5 XP + 5 reputation
            {untilOnTime !== null && untilOnTime > 0 && <> — <span className="font-mono tabular-nums">{hhmm(untilOnTime)}</span> left</>}
          </span>
        </div>
      )}
      <StandupForm />
    </div>
  )
}

function Panel({
  icon: Icon, title, titleSuffix, tone, children,
}: {
  icon: typeof Lock; title: string; titleSuffix?: string
  tone: 'locked' | 'success' | 'error' | 'muted'; children: React.ReactNode
}) {
  const toneCls = {
    locked: 'border-border-strong bg-surface-1 text-text-3',
    success: 'border-success/30 bg-success/8 text-text-2',
    error: 'border-error/30 bg-error/8 text-text-2',
    muted: 'border-border-default bg-surface-1 text-text-3',
  }[tone]
  const iconCls = { locked: 'text-text-3', success: 'text-success', error: 'text-error', muted: 'text-text-3' }[tone]
  return (
    <div className={cn('rounded-xl border p-6 text-center flex flex-col items-center', toneCls)}>
      <span className="size-11 rounded-full bg-surface-2 flex items-center justify-center mb-3"><Icon size={20} className={iconCls} /></span>
      <h3 className="font-display font-bold text-[16px] text-text-1 mb-1.5">{title}{titleSuffix}</h3>
      <div className="font-ui text-[13px] max-w-md">{children}</div>
    </div>
  )
}

function TeamStandups() {
  const [date, setDate] = useState(() => new Intl.DateTimeFormat('en-CA').format(new Date()))
  const { data: standups = [], isLoading } = useStandupsByDate(date)
  const { data: roster = [] } = useStandupRoster(date)
  const { data: win } = useStandupWindow()

  const submittedIds = new Set(standups.map((s) => s.profile_id))
  const notSubmitted = roster.filter((r) => !submittedIds.has(r.profile_id) && !r.on_leave)
  const onLeave = roster.filter((r) => r.on_leave)

  // The window only counts people as "missing" once it has actually opened for
  // the selected day. Before that (e.g. viewing today at 3am) nobody could have
  // submitted, so they're "pending", not missing.
  const hasOpened = win
    ? (date < win.standup_date || (date === win.standup_date && new Date(win.server_now) >= new Date(win.opens_at)))
    : false
  const missing = hasOpened ? notSubmitted : []
  const pending = hasOpened ? [] : notSubmitted

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <DatePicker value={date} onChange={setDate} className="w-44" />
        <div className="flex items-center gap-2">
          <Badge variant="success">{standups.length} submitted</Badge>
          {missing.length > 0 && <Badge variant="error">{missing.length} missing</Badge>}
          {pending.length > 0 && <Badge variant="warning">{pending.length} pending</Badge>}
          {onLeave.length > 0 && <Badge variant="ghost">{onLeave.length} on leave</Badge>}
        </div>
      </div>

      {!hasOpened && win && date === win.standup_date && (
        <div className="flex items-center gap-2 bg-surface-1 border border-border-default rounded-lg px-3.5 py-2.5">
          <Clock size={14} className="text-text-3 shrink-0" />
          <span className="font-ui text-[12.5px] text-text-3">
            The standup window opens at {officeTime(win.opens_at, win.timezone)} — updates appear after that.
          </span>
        </div>
      )}

      {missing.length > 0 && (
        <div className="bg-surface-1 border border-border-default rounded-xl p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-text-4 mb-2.5">Not submitted</p>
          <div className="flex flex-wrap gap-2">
            {missing.map((m) => (
              <span key={m.profile_id} className="inline-flex items-center gap-1.5 bg-surface-2 border border-border-default rounded-full pl-0.5 pr-2.5 py-0.5">
                <Avatar name={m.name} src={m.avatar_url ?? undefined} size="xs" />
                <span className="font-ui text-[12px] text-text-2">{m.name}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : standups.length === 0 ? (
        <div className="py-14 text-center font-ui text-[13px] text-text-4">No standups submitted for this day.</div>
      ) : (
        <div className="space-y-3">{standups.map((s) => <StandupCard key={s.id} standup={s} />)}</div>
      )}
    </div>
  )
}

function StandupCard({ standup }: { standup: StandupDetail }) {
  const total = standup.entries.reduce((sum, e) => sum + e.minutes_spent, 0)
  return (
    <div className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle">
        <Avatar name={standup.profile?.name ?? '?'} src={standup.profile?.avatar_url ?? undefined} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="font-ui font-semibold text-[13px] text-text-1 truncate">{standup.profile?.name ?? 'Unknown'}</p>
          <p className="font-mono text-[10px] text-text-4">{formatRelativeTime(standup.submitted_at)} · {fmtMinutes(total)} logged</p>
        </div>
        {standup.is_late && <Badge variant="warning">Late</Badge>}
      </div>

      <div className="divide-y divide-border-subtle">
        {standup.entries.map((e) => (
          <div key={e.id} className="px-4 py-3 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              {e.project && <ServiceChip service={e.project.service_type} />}
              <span className="font-ui font-semibold text-[12.5px] text-text-1">{e.project?.name ?? 'Project'}</span>
              {e.task && <span className="font-ui text-[11.5px] text-text-3 truncate">· {e.task.title}</span>}
              <span className="ml-auto font-mono text-[11px] text-text-3 shrink-0">{fmtMinutes(e.minutes_spent)}</span>
            </div>
            <p className="font-ui text-[13px] text-text-2 whitespace-pre-wrap">{e.work_done}</p>
            {e.blocker && (
              <p className="flex items-start gap-1.5 font-ui text-[12.5px] text-warning bg-warning/8 border border-warning/20 rounded-md px-2.5 py-1.5">
                <AlertTriangle size={12} className="shrink-0 mt-0.5" /> <span>{e.blocker}</span>
              </p>
            )}
          </div>
        ))}
      </div>

      {standup.notes && (
        <div className="px-4 py-2.5 border-t border-border-subtle bg-surface-2/40">
          <p className="font-mono text-[10px] uppercase tracking-wider text-text-4 mb-1">Notes</p>
          <p className="font-ui text-[12.5px] text-text-2 whitespace-pre-wrap">{standup.notes}</p>
        </div>
      )}
    </div>
  )
}
