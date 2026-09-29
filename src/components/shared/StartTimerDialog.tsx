import { useState } from 'react'
import { Play } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { formatMinutes, secondsBetween } from '../../lib/duration'
import type { RunningTimeEntry } from '../../api/timeEntries'

interface StartTimerDialogProps {
  open: boolean
  /** The task the timer is about to start on. */
  taskTitle: string
  /** A timer already running on a different task — starting here stops it. */
  runningElsewhere: RunningTimeEntry | null
  isPending: boolean
  onConfirm: (note: string) => void
  onClose: () => void
}

/**
 * Asks what the next stretch of work is before the clock starts.
 *
 * Every start→stop is its own entry, so the question is asked on every start,
 * not once per task: the entries list then reads as "09:00 → 10:15, wired the
 * login form" rather than a column of bare times nobody can account for later.
 */
export function StartTimerDialog(props: StartTimerDialogProps) {
  if (!props.open) return null
  // Mounted fresh on each open, so the box never carries the last description over.
  return <StartTimerDialogBody {...props} />
}

function StartTimerDialogBody({
  taskTitle, runningElsewhere, isPending, onConfirm, onClose,
}: StartTimerDialogProps) {
  const [note, setNote] = useState('')
  const [touched, setTouched] = useState(false)
  const empty = note.trim().length === 0

  const submit = () => {
    setTouched(true)
    if (empty || isPending) return
    onConfirm(note.trim())
  }

  const elapsedMinutes = runningElsewhere
    ? Math.round(secondsBetween(runningElsewhere.started_at, null) / 60)
    : 0

  return (
    <Modal
      open
      size="sm"
      busy={isPending}
      onClose={onClose}
      title="What are you working on?"
      footer={
        <div className="flex gap-2.5">
          <Button variant="ghost" size="sm" className="flex-1" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button
            size="sm"
            className="flex-1"
            onClick={submit}
            disabled={empty}
            loading={isPending}
            iconLeft={<Play size={14} />}
          >
            {runningElsewhere ? 'Switch timer' : 'Start timer'}
          </Button>
        </div>
      }
    >
      <div className="space-y-3 px-5 py-4">
        <p className="truncate font-ui text-[12.5px] text-text-3">
          Timer on <strong className="font-semibold text-text-1">{taskTitle}</strong>
        </p>

        <div className="space-y-1.5">
          <label htmlFor="start-timer-note" className="font-ui text-label font-semibold uppercase tracking-wider text-text-2">
            Description <span className="text-brand-red">*</span>
          </label>
          <textarea
            id="start-timer-note"
            autoFocus
            rows={3}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => setTouched(true)}
            onKeyDown={(e) => {
              // Enter starts, Shift+Enter breaks the line — the box is usually one sentence.
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
            }}
            placeholder="e.g. Building the checkout form validation"
            aria-required
            aria-invalid={touched && empty}
            className="w-full resize-y rounded-md border border-border-default bg-surface-inset px-3 py-2 font-ui text-body-sm text-text-1 outline-none placeholder:text-text-4 focus:border-border-focus"
          />
          {touched && empty
            ? <p className="font-ui text-caption text-error">A description is required to start the timer.</p>
            : <p className="font-ui text-caption text-text-4">Saved with this stretch of time. You will be asked again next time you start.</p>}
        </div>

        {runningElsewhere && (
          <p className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 font-ui text-[12px] text-text-2">
            Your timer on <strong className="text-text-1">{runningElsewhere.task?.title ?? 'another task'}</strong>
            {elapsedMinutes >= 1 && <> ({formatMinutes(elapsedMinutes)} so far)</>} will be stopped and logged.
          </p>
        )}
      </div>
    </Modal>
  )
}
