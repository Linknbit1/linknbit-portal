import { useEffect, useMemo, useState } from 'react'
import { Play, Square, Plus, DollarSign, Loader2, Pencil, Trash2 } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { DateTimeRangePicker } from '../ui/DateTimeRangePicker'
import { ProgressBar } from '../ui/ProgressBar'
import { StartTimerDialog } from './StartTimerDialog'
import { Toggle } from '../ui/Toggle'
import { useToast } from '../ui/toast-context'
import {
  useDeleteTimeEntry, useLogTime, useRunningTimeEntry, useStartTimer, useStopTimer,
  useTaskTimeEntries, useUpdateTimeEntry,
} from '../../hooks/useTimeEntries'
import { useAuthContext } from '../../context/AuthContext'
import { useCanAccess } from '../../hooks/useRoleFlags'
import { cn } from '../../lib/cn'
import { formatClock, formatMinutes, secondsBetween } from '../../lib/duration'
import { formatStamp, formatStampTime } from '../../lib/utils'
import type { DateTimeRange } from '../ui/DateTimeRangePicker'
import type { TimeEntry } from '../../api/timeEntries'

interface TaskTimeTrackerProps {
  taskId: string
  /** Named in the start dialog, so it is clear which task the clock is going on. */
  taskTitle: string
  /** Drives the tracked-vs-estimated bar; omit when the task has no estimate. */
  estimatedMinutes?: number | null
  className?: string
}

/** Entries shown before the list asks to be expanded. */
const ENTRY_PREVIEW_COUNT = 5

/** Whole minutes in a picked window; null when either end is missing. */
function rangeMinutes(start: string | null, end: string | null): number | null {
  if (!start || !end) return null
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60_000)
}

/** "04 Aug, 09:00 AM → 10:30 AM", dropping the repeated date within one day. */
function rangeLabel(start: string, end: string | null): string {
  if (!end) return `${formatStamp(start)} → running`
  const sameDay = new Date(start).toDateString() === new Date(end).toDateString()
  return `${formatStamp(start)} → ${sameDay ? formatStampTime(end) : formatStamp(end)}`
}

interface TimeEntryFormProps {
  /** Window to open with — a sensible default when adding, the entry's own when editing. */
  start: string | null
  end: string | null
  note: string
  billable: boolean
  saving: boolean
  submitLabel: string
  onSubmit: (values: { start: string; end: string; note: string; billable: boolean }) => void
  onCancel: () => void
}

/**
 * The one form behind both "Log time" and editing an existing entry — the fields
 * and the validation are identical, and a wrong entry is only fixable if editing
 * offers exactly what adding did.
 *
 * Callers remount it with a `key` to reload the draft, so it owns its own state.
 */
function TimeEntryForm({
  start: initialStart, end: initialEnd, note: initialNote, billable: initialBillable,
  saving, submitLabel, onSubmit, onCancel,
}: TimeEntryFormProps) {
  const [range, setRange] = useState<DateTimeRange>({ start: initialStart, end: initialEnd })
  const [note, setNote] = useState(initialNote)
  const [billable, setBillable] = useState(initialBillable)

  const minutes = rangeMinutes(range.start, range.end)
  const error = minutes === null
    ? 'Pick when you worked'
    : minutes <= 0
      ? 'The end has to come after the start'
      : !note.trim()
        ? 'Add a description'
        : null

  const submit = () => {
    if (error || !range.start || !range.end) return
    onSubmit({ start: range.start, end: range.end, note: note.trim(), billable })
  }

  return (
    <div className="space-y-2.5 rounded-md border border-border-default bg-surface-inset p-3">
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <DateTimeRangePicker
          start={range.start}
          end={range.end}
          onChange={setRange}
          placeholder="When did you work?"
          className="sm:w-72 sm:shrink-0"
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What did you work on? (required)"
          aria-required
          className="min-w-0 flex-1 rounded-md border border-border-default bg-surface-1 px-3 py-2 font-ui text-[12.5px] text-text-1 placeholder:text-text-4 outline-none transition-colors hover:border-border-strong focus:border-border-focus"
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <label className="flex cursor-pointer items-center gap-2">
          <Toggle checked={billable} onChange={setBillable} />
          <span className="flex items-center gap-1.5 font-ui text-[12.5px] text-text-2"><DollarSign size={13} className="text-text-4" /> Billable</span>
        </label>
        <div className="flex items-center gap-2.5">
          {error
            ? <span className="font-ui text-[11.5px] text-error">{error}</span>
            : <span className="font-mono text-[12px] font-semibold text-text-2">{formatMinutes(minutes ?? 0)}</span>}
          <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={!!error} loading={saving}>{submitLabel}</Button>
        </div>
      </div>
    </div>
  )
}

interface TimeEntryRowProps {
  entry: TimeEntry
  now: number
  /** Own entries always; other people's only for the roles RLS lets through. */
  canEdit: boolean
  /** Someone else's time — worth a face; your own list doesn't need one. */
  showWho: boolean
  onEdit: () => void
  onDelete: () => void
}

function TimeEntryRow({ entry, now, canEdit, showWho, onEdit, onDelete }: TimeEntryRowProps) {
  const running = !entry.ended_at
  const minutes = Math.round(secondsBetween(entry.started_at, entry.ended_at, now) / 60)

  return (
    <div className="group/entry flex items-center gap-2.5 rounded-md border border-border-subtle bg-surface-2/30 px-3 py-2">
      {showWho && entry.profile && (
        <Avatar name={entry.profile.name} src={entry.profile.avatar_url ?? undefined} size="xs" personId={entry.profile.id} />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-[11.5px] text-text-2">{rangeLabel(entry.started_at, entry.ended_at)}</p>
        {entry.note
          ? <p className="line-clamp-2 font-ui text-[12px] text-text-3" title={entry.note}>{entry.note}</p>
          : <p className="font-ui text-[11.5px] italic text-text-4">No description</p>}
      </div>
      {entry.billable && (
        <span className="shrink-0 rounded-sm border border-success-border bg-success-soft px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-success">
          Billable
        </span>
      )}
      <span className={cn('shrink-0 font-mono text-[12px] font-semibold', running ? 'text-warning' : 'text-text-1')}>
        {running ? 'running' : formatMinutes(minutes)}
      </span>
      {/* A running timer has no end to edit — it is stopped, not corrected. */}
      {canEdit && !running && (
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover/entry:opacity-100">
          <button
            onClick={onEdit}
            aria-label={`Edit time entry from ${rangeLabel(entry.started_at, entry.ended_at)}`}
            className="flex size-7 items-center justify-center rounded-sm text-text-4 transition-colors hover:bg-surface-3 hover:text-text-1"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={onDelete}
            aria-label={`Delete time entry from ${rangeLabel(entry.started_at, entry.ended_at)}`}
            className="flex size-7 items-center justify-center rounded-sm text-text-4 transition-colors hover:bg-error/10 hover:text-error"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  )
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

export function TaskTimeTracker({ taskId, taskTitle, estimatedMinutes, className }: TaskTimeTrackerProps) {
  const toast = useToast()

  const { profile } = useAuthContext()
  const { data: entries = [] } = useTaskTimeEntries(taskId)
  const { data: running } = useRunningTimeEntry()
  const startTimer = useStartTimer()
  const stopTimer = useStopTimer()
  const logTime = useLogTime()
  const updateEntry = useUpdateTimeEntry()
  const deleteEntry = useDeleteTimeEntry()

  const [askingNote, setAskingNote] = useState(false)
  const [showLog, setShowLog] = useState(false)
  const [logRange, setLogRange] = useState<DateTimeRange>({ start: null, end: null })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAllEntries, setShowAllEntries] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<TimeEntry | null>(null)

  // Mirrors p_tte_write_managed.
  const managesTimesheets = useCanAccess('can_manage_timesheets')
  const canEditEntry = (entry: TimeEntry) => entry.profile_id === profile?.id || managesTimesheets
  const visibleEntries = showAllEntries ? entries : entries.slice(0, ENTRY_PREVIEW_COUNT)

  /** Opens the log form on the hour just gone — the common case, still editable. */
  const openLog = () => {
    const end = new Date()
    setLogRange({ start: new Date(end.getTime() - 60 * 60_000).toISOString(), end: end.toISOString() })
    setEditingId(null)
    setShowLog(true)
  }

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

  const overEstimate = !!estimatedMinutes && totalMinutes > estimatedMinutes

  const busy = startTimer.isPending || stopTimer.isPending

  const begin = (note: string) => {
    const switched = !!runningElsewhere
    startTimer.mutate({ taskId, note }, {
      onSuccess: () => { setAskingNote(false); toast(switched ? 'Switched timer to this task' : 'Timer started', 'success') },
      onError: (e) => toast(e instanceof Error ? e.message : 'Could not start the timer', 'error'),
    })
  }

  const onToggleTimer = () => {
    if (runningHere) {
      stopTimer.mutate(undefined, {
        onSuccess: () => toast('Timer stopped', 'success'),
        onError: (e) => toast(e instanceof Error ? e.message : 'Could not stop the timer', 'error'),
      })
    } else {
      // Every start asks for its own description; the dialog also warns when
      // starting here will stop a timer running on another task.
      setAskingNote(true)
    }
  }

  const submitLog = (v: { start: string; end: string; note: string; billable: boolean }) => {
    const minutes = rangeMinutes(v.start, v.end) ?? 0
    logTime.mutate(
      {
        taskId,
        minutes,
        startedAt: new Date(v.start),
        endedAt: new Date(v.end),
        note: v.note,
        billable: v.billable,
      },
      {
        onSuccess: () => { toast(`Logged ${formatMinutes(minutes)}`, 'success'); setShowLog(false) },
        onError: (e) => toast(e instanceof Error ? e.message : 'Could not log time', 'error'),
      },
    )
  }

  const submitEdit = (id: string, v: { start: string; end: string; note: string; billable: boolean }) => {
    updateEntry.mutate(
      {
        id,
        taskId,
        updates: { started_at: v.start, ended_at: v.end, note: v.note || null, billable: v.billable },
      },
      {
        onSuccess: () => { toast('Time entry updated', 'success'); setEditingId(null) },
        onError: (e) => toast(e instanceof Error ? e.message : 'Could not update the entry', 'error'),
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
          <Button size="sm" variant="ghost" iconLeft={<Plus size={14} />} onClick={() => (showLog ? setShowLog(false) : openLog())}>
            Log time
          </Button>
        </div>
      </div>

      {runningElsewhere && (
        <p className="font-ui text-[11px] text-text-4">A timer is running on another task, starting here moves it.</p>
      )}

      {showLog && (
        <TimeEntryForm
          start={logRange.start}
          end={logRange.end}
          note=""
          billable={false}
          saving={logTime.isPending}
          submitLabel="Add entry"
          onSubmit={submitLog}
          onCancel={() => setShowLog(false)}
        />
      )}

      {/* The entries themselves, so a wrong one can be corrected rather than
          only read about in the Activity feed. */}
      {entries.length > 0 && (
        <div className="space-y-1.5">
          <p className="font-mono text-[9.5px] font-semibold uppercase tracking-wider text-text-4">Entries</p>
          {visibleEntries.map((e) => (
            editingId === e.id ? (
              <TimeEntryForm
                key={e.id}
                start={e.started_at}
                end={e.ended_at}
                note={e.note ?? ''}
                billable={e.billable}
                saving={updateEntry.isPending}
                submitLabel="Save changes"
                onSubmit={(v) => submitEdit(e.id, v)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <TimeEntryRow
                key={e.id}
                entry={e}
                now={now}
                canEdit={canEditEntry(e)}
                showWho={e.profile_id !== profile?.id}
                onEdit={() => { setShowLog(false); setEditingId(e.id) }}
                onDelete={() => setPendingDelete(e)}
              />
            )
          ))}
          {entries.length > ENTRY_PREVIEW_COUNT && (
            <button
              onClick={() => setShowAllEntries((v) => !v)}
              className="font-ui text-[11.5px] text-text-3 transition-colors hover:text-text-1"
            >
              {showAllEntries ? 'Show fewer' : `Show all ${entries.length} entries`}
            </button>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        danger
        title="Delete this time entry?"
        confirmLabel="Delete entry"
        isPending={deleteEntry.isPending}
        message={
          <span>
            {pendingDelete && formatMinutes(Math.round(secondsBetween(pendingDelete.started_at, pendingDelete.ended_at, now) / 60))}
            {' '}logged on {pendingDelete && rangeLabel(pendingDelete.started_at, pendingDelete.ended_at)} will be removed
            from this task's tracked total.
          </span>
        }
        onConfirm={() => {
          if (!pendingDelete) return
          deleteEntry.mutate({ id: pendingDelete.id, taskId }, {
            onSuccess: () => { toast('Time entry deleted', 'success'); setPendingDelete(null) },
            onError: (e) => toast(e instanceof Error ? e.message : 'Could not delete the entry', 'error'),
          })
        }}
        onClose={() => setPendingDelete(null)}
      />

      <StartTimerDialog
        open={askingNote}
        taskTitle={taskTitle}
        runningElsewhere={runningElsewhere ? running ?? null : null}
        isPending={startTimer.isPending}
        onConfirm={begin}
        onClose={() => setAskingNote(false)}
      />
    </div>
  )
}
