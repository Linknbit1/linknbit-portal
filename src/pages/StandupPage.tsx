import { useState } from 'react'
import {
  Lock, CheckCircle2, Clock, AlertTriangle, CalendarOff, Coffee, PencilLine,
} from 'lucide-react'
import { Topbar } from '../components/layout/Topbar'
import { Button } from '../components/ui/Button'
import { Skeleton } from '../components/ui/Skeleton'
import { StandupTabs } from '../components/shared/StandupTabs'
import { StandupCard } from '../components/shared/StandupCard'
import { cn } from '../lib/cn'
import { hhmm, officeTime } from '../lib/standup'
import { useAuthContext } from '../context/AuthContext'
import { isAuthoritative } from '../lib/roles'
import { useStandupWindow, useWindowCountdown, useMyStandup } from '../hooks/useStandups'
import { StandupForm } from './StandupForm'
import type { StandupWindow } from '../api/standups'

export default function StandupPage() {
  const { data: win, isLoading } = useStandupWindow()

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

        <StandupTabs />

        {isLoading ? <Skeleton className="h-40" /> : win ? <MyStandup win={win} /> : null}
      </div>
    </div>
  )
}

function MyStandup({ win }: { win: StandupWindow }) {
  const { profile: viewer } = useAuthContext()
  // Only reviewers actually have a team view to be pointed at.
  const canReviewTeam = isAuthoritative(viewer?.role)
  const [editing, setEditing] = useState(false)
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
    return <SubmittedStandup win={win} editing={editing} onEdit={() => setEditing(true)} onDone={() => setEditing(false)} />
  }

  if (!win.is_required) {
    return (
      <Panel icon={Coffee} tone="muted" title="No standup required">
        {canReviewTeam
          ? "You are not on the standup list — the team's updates are on the Team tab."
          : 'You are not on the standup list, so there is nothing for you to submit here.'}
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

/**
 * Today's submitted standup: read-only by default, with an edit affordance while
 * the window is still open. Editing replaces the whole update, so the form is
 * reopened prefilled rather than patched in place.
 */
function SubmittedStandup({
  win, editing, onEdit, onDone,
}: {
  win: StandupWindow; editing: boolean; onEdit: () => void; onDone: () => void
}) {
  const { profile } = useAuthContext()
  const { data: standup, isLoading } = useMyStandup(profile?.id, win.standup_date)
  const closesLabel = new Date(win.closes_at).toLocaleString(undefined, {
    weekday: 'short', hour: 'numeric', minute: '2-digit',
  })

  if (isLoading) return <Skeleton className="h-40" />
  if (!standup) {
    return (
      <Panel icon={CheckCircle2} tone="success" title="Standup submitted">
        You've logged today's update. Thanks — it's visible to your leads.
      </Panel>
    )
  }

  if (editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 bg-surface-1 border border-border-default rounded-lg px-3.5 py-2.5">
          <PencilLine size={14} className="text-text-3 shrink-0" />
          <span className="font-ui text-[12.5px] text-text-2">
            Correcting today's standup. Saving replaces the update your leads see — it does not change your
            on-time status or the XP you already earned.
          </span>
        </div>
        <StandupForm editing={standup} onDone={onDone} onCancel={onDone} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 bg-success/8 border border-success/25 rounded-lg px-3.5 py-2.5">
        <CheckCircle2 size={14} className="text-success shrink-0" />
        <span className="font-ui text-[12.5px] text-text-2 flex-1 min-w-0">
          Standup submitted — visible to your leads.
          {win.can_edit
            ? <> Spotted a mistake? You can correct it until {closesLabel}.</>
            : <> This standup is now locked.</>}
        </span>
        {win.can_edit && (
          <Button size="sm" variant="secondary" iconLeft={<PencilLine size={13} />} onClick={onEdit}>
            Edit standup
          </Button>
        )}
      </div>
      <StandupCard standup={standup} showPerson={false} />
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
