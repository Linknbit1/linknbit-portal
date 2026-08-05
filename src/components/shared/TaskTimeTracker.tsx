import { useEffect, useMemo, useState } from 'react'
import { Play, Square, Plus, DollarSign, Loader2 } from 'lucide-react'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { DurationInput } from '../ui/DurationInput'
import { ProgressBar } from '../ui/ProgressBar'
import { Toggle } from '../ui/Toggle'
import { useToast } from '../ui/toast-context'
import { useLogTime, useRunningTimeEntry, useStartTimer, useStopTimer, useTaskTimeEntries } from '../../hooks/useTimeEntries'
import { cn } from '../../lib/cn'
import { formatClock, formatMinutes, secondsBetween } from '../../lib/duration'

interface TaskTimeTrackerProps {
  taskId: string
  /** Drives the tracked-vs-estimated bar; omit when the task has no estimate. */
  estimatedMinutes?: number | null
  className?: string
}

/** Ticks once a second, but only while something is actually running. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [active])
  return now
}

export function TaskTimeTracker({ taskId, estimatedMinutes, className }: TaskTimeTrackerProps) {
  const toast = useToast()

  // Entries are still fetched — they are what the tracked total is made of. The
  // per-entry history itself is rendered by the task's Activity feed.
  const { data: entries = [] } = useTaskTimeEntries(taskId)
  const { data: running } = useRunningTimeEntry()
  const startTimer = useStartTimer()
  const stopTimer = useStopTimer()
  const logTime = useLogTime()

  const [confirmSwitch, setConfirmSwitch] = useState(false)
  const [showLog, setShowLog] = useState(false)
  const [logMinutes, setLogMinutes] = useState<number | null>(null)
  const [logNote, setLogNote] = useState('')
  const [logBillable, setLogBillable] = useState(false)

  // A timer running on *this* task drives the live read-out; one running
  // elsewhere only changes what the button offers to do.
  const runningHere = running && running.task_id === taskId ? running : null
  const runningElsewhere = running && running.task_id !== taskId
  const now = useNow(!!running)

  const totalSeconds = useMemo(
    () => entries.reduce((sum, e) => sum + secondsBetween(e.started_at, e.ended_at, now), 0),
    [entries, now],
  )
  const totalMinutes = Math.round(totalSeconds / 60)

  // Only worth quoting once it rounds to a minute — "0m so far" reads as a bug.
  const runningMinutes = running ? Math.round(secondsBetween(running.started_at, null, now) / 60) : 0
  const runningElapsed = runningMinutes >= 1 ? formatMinutes(runningMinutes) : null
  const overEstimate = !!estimatedMinutes && totalMinutes > estimatedMinutes

  const busy = startTimer.isPending || stopTimer.isPending

  const begin = (switched: boolean) => {
    startTimer.mutate(taskId, {
      onSuccess: () => { setConfirmSwitch(false); toast(switched ? 'Switched timer to this task' : 'Timer started', 'success') },
      onError: (e) => toast(e instanceof Error ? e.message : 'Could not start the timer', 'error'),
    })
  }

  const onToggleTimer = () => {
    if (runningHere) {
      stopTimer.mutate(undefined, {
        onSuccess: () => toast('Timer stopped', 'success'),
        onError: (e) => toast(e instanceof Error ? e.message : 'Could not stop the timer', 'error'),
      })
    } else if (runningElsewhere) {
      // Starting here silently stops the other timer, so say so before it happens.
      setConfirmSwitch(true)
    } else {
      begin(false)
    }
  }

  const submitLog = () => {
    if (!logMinutes) { toast('Enter how long you worked', 'error'); return }
    logTime.mutate(
      { taskId, minutes: logMinutes, note: logNote.trim() || null, billable: logBillable },
      {
        onSuccess: () => {
          toast(`Logged ${formatMinutes(logMinutes)}`, 'success')
          setLogMinutes(null); setLogNote(''); setLogBillable(false); setShowLog(false)
        },
        onError: (e) => toast(e instanceof Error ? e.message : 'Could not log time', 'error'),
      },
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Summary and controls share a row once there is width for it. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1 rounded-md border border-border-subtle bg-surface-2/35 px-3 py-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono text-[9.5px] font-semibold uppercase tracking-wider text-text-4">Tracked</span>
            <span className={cn('font-display text-[15px] font-bold', overEstimate ? 'text-warning' : 'text-text-1')}>
              {formatMinutes(totalMinutes)}
              {!!estimatedMinutes && (
                <span className="ml-1 font-ui text-[11.5px] font-medium text-text-4">of {formatMinutes(estimatedMinutes)}</span>
              )}
            </span>
          </div>
          {!!estimatedMinutes && (
            <ProgressBar
              value={Math.min(totalMinutes, estimatedMinutes)}
              max={estimatedMinutes}
              variant={overEstimate ? 'warning' : 'default'}
              className="mt-2"
            />
          )}
          {overEstimate && (
            <p className="mt-1.5 font-ui text-[11px] text-warning">
              {formatMinutes(totalMinutes - estimatedMinutes)} over estimate
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            size="sm"
            variant={runningHere ? 'secondary' : 'primary'}
            onClick={onToggleTimer}
            disabled={busy}
            iconLeft={busy ? <Loader2 size={14} className="animate-spin" /> : runningHere ? <Square size={14} /> : <Play size={14} />}
          >
            {runningHere ? `Stop · ${formatClock(secondsBetween(runningHere.started_at, null, now))}` : 'Start'}
          </Button>
          <Button size="sm" variant="ghost" iconLeft={<Plus size={14} />} onClick={() => setShowLog((v) => !v)}>
            Log time
          </Button>
        </div>
      </div>

      {runningElsewhere && (
        <p className="font-ui text-[11px] text-text-4">A timer is running on another task — starting here moves it.</p>
      )}

      {showLog && (
        <div className="space-y-2.5 rounded-md border border-border-default bg-surface-inset p-3">
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <DurationInput
              value={logMinutes}
              onChange={setLogMinutes}
              placeholder="How long? e.g. 45m"
              className="sm:w-44 sm:shrink-0"
            />
            <input
              value={logNote}
              onChange={(e) => setLogNote(e.target.value)}
              placeholder="What did you work on? (optional)"
              className="min-w-0 flex-1 rounded-md border border-border-default bg-surface-1 px-3 py-2 font-ui text-[12.5px] text-text-1 placeholder:text-text-4 outline-none transition-colors hover:border-border-strong focus:border-border-focus"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <label className="flex cursor-pointer items-center gap-2">
              <Toggle checked={logBillable} onChange={setLogBillable} />
              <span className="flex items-center gap-1.5 font-ui text-[12.5px] text-text-2"><DollarSign size={13} className="text-text-4" /> Billable</span>
            </label>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => setShowLog(false)}>Cancel</Button>
              <Button size="sm" onClick={submitLog} loading={logTime.isPending}>Add entry</Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmSwitch}
        danger={false}
        title="A timer is already running"
        confirmLabel="Switch timer"
        cancelLabel="Keep it running"
        pendingLabel="Switching…"
        isPending={startTimer.isPending}
        message={
          <span>
            Your timer is running on{' '}
            <strong className="text-text-1">{running?.task?.title ?? 'another task'}</strong>
            {running?.task?.project?.name && <> in <strong className="text-text-1">{running.task.project.name}</strong></>}
            {runningElapsed && <> ({runningElapsed} so far)</>}.
            {' '}Starting one here stops it and logs the time. Continue?
          </span>
        }
        onConfirm={() => begin(true)}
        onClose={() => setConfirmSwitch(false)}
      />
    </div>
  )
}
