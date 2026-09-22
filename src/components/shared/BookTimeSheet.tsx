import { useMemo, useState } from 'react'
import { Trash2, AlertTriangle } from 'lucide-react'
import { Drawer } from '../ui/Drawer'
import { Button } from '../ui/Button'
import { Select } from '../ui/Select'
import { DurationInput } from '../ui/DurationInput'
import { Input } from '../ui/Input'
import { useToast } from '../ui/toast-context'
import { cn } from '../../lib/cn'
import { formatMinutes } from '../../lib/duration'
import { formatDate } from '../../lib/utils'
import { useTasks } from '../../hooks/useTasks'
import { useUpdateTask } from '../../hooks/useTasks'
import { useScheduleRoster, useBookTime, useDeleteAllocation } from '../../hooks/useSchedule'

interface BookTimeSheetProps {
  profileId: string
  profileName: string
  day: string
  onClose: () => void
}

/**
 * Books somebody's time on a day.
 *
 * This is the primary path, not a fallback for drag-and-drop. It is what works on
 * a phone, what works from a keyboard, and what can ask for the one thing a drag
 * cannot: how long the work is expected to take.
 */
export function BookTimeSheet({ profileId, profileName, day, onClose }: BookTimeSheetProps) {
  const toast = useToast()
  const [taskId, setTaskId] = useState('')
  const [minutes, setMinutes] = useState<number | null>(null)
  const [note, setNote] = useState('')

  const { data: tasks = [] } = useTasks()
  const { data: rows = [] } = useScheduleRoster(day, day, profileId)
  const book = useBookTime()
  const removeAllocation = useDeleteAllocation()
  const updateTask = useUpdateTask()

  const cell = rows[0]
  const available = cell?.availableMinutes ?? 0
  const planned = cell?.plannedMinutes ?? 0
  const selected = tasks.find((t) => t.id === taskId)

  // Open work only: finished tasks are not something to plan somebody's week around.
  const taskOptions = useMemo(() => ([
    { value: '', label: 'Choose a task' },
    ...tasks
      .filter((t) => !['completed', 'approved'].includes(t.status))
      .map((t) => ({
        value: t.id,
        label: t.project?.name ? `${t.title} · ${t.project.name}` : t.title,
      })),
  ]), [tasks])

  const after = planned + (minutes ?? 0)
  const over = available > 0 && after > available

  const save = async () => {
    if (!taskId) { toast('Pick a task first', 'error'); return }
    if (!minutes || minutes <= 0) { toast('How long should this take?', 'error'); return }
    try {
      await book.mutateAsync({
        taskId,
        profileId,
        day,
        plannedMinutes: minutes,
        note: note.trim() || null,
      })
      // An estimate is what makes the next plan better than this one. Filling it
      // from the first booking beats asking for it on a screen nobody revisits.
      if (selected && !selected.estimated_minutes) {
        await updateTask.mutateAsync({ id: taskId, updates: { estimated_minutes: minutes } })
      }
      toast(`Booked ${formatMinutes(minutes)} for ${profileName}`, 'success')
      onClose()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not book that time', 'error')
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      busy={book.isPending}
      title={`Book time · ${profileName}`}
      footer={
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={onClose} disabled={book.isPending}>Cancel</Button>
          <Button onClick={save} loading={book.isPending}>Book it</Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="rounded-md border border-border-default bg-surface-inset px-3 py-2.5">
          <p className="font-ui text-[12.5px] text-text-1">{formatDate(day)}</p>
          <p className="mt-0.5 font-mono text-[11px] text-text-3 tabular-nums">
            {available === 0
              ? 'No capacity this day — leave, a holiday, or not a working day.'
              : <>{formatMinutes(planned)} booked of {formatMinutes(available)}</>}
          </p>
        </div>

        {available === 0 ? (
          <p className="font-ui text-[12.5px] text-text-3">
            There is nothing to book into. Pick another day, or change the leave or
            working days behind it first.
          </p>
        ) : (
          <>
            <div>
              <label className="mb-1.5 block font-ui text-[11px] font-semibold uppercase tracking-wider text-text-3">
                Task
              </label>
              <Select value={taskId} onChange={setTaskId} options={taskOptions} placeholder="Choose a task" />
            </div>

            <div>
              <label className="mb-1.5 block font-ui text-[11px] font-semibold uppercase tracking-wider text-text-3">
                How long
              </label>
              <DurationInput value={minutes} onChange={setMinutes} />
              {selected?.estimated_minutes ? (
                <p className="mt-1 font-mono text-[10px] text-text-4">
                  This task is estimated at {formatMinutes(selected.estimated_minutes)} in total.
                </p>
              ) : (
                <p className="mt-1 font-mono text-[10px] text-text-4">
                  No estimate on this task yet — this will become one.
                </p>
              )}
            </div>

            {over && (
              <p className="flex items-start gap-1.5 rounded-md border border-warning/25 bg-warning/8 px-2.5 py-1.5 font-ui text-[11px] text-warning">
                <AlertTriangle size={11} className="mt-0.5 shrink-0" />
                <span>
                  That takes {profileName} to {formatMinutes(after)} against {formatMinutes(available)}.
                  You can still book it — the day will read as over.
                </span>
              </p>
            )}

            <div>
              <label className="mb-1.5 block font-ui text-[11px] font-semibold uppercase tracking-wider text-text-3">
                Note <span className="font-normal normal-case tracking-normal text-text-4">- optional</span>
              </label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything they should know" />
            </div>
          </>
        )}

        {(cell?.allocations.length ?? 0) > 0 && (
          <div>
            <p className="mb-2 font-ui text-[11px] font-semibold uppercase tracking-wider text-text-3">
              Already booked
            </p>
            <ul className="flex flex-col divide-y divide-border-subtle rounded-md border border-border-default">
              {cell?.allocations.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-ui text-[12px] text-text-1">{a.task_title}</p>
                    {a.project_name && (
                      <p className="truncate font-mono text-[10px] text-text-4">{a.project_name}</p>
                    )}
                  </div>
                  <span className={cn('shrink-0 font-mono text-[11px] tabular-nums text-text-2')}>
                    {formatMinutes(a.planned_minutes)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAllocation.mutate(a.id)}
                    className="shrink-0 text-text-4 transition-colors hover:text-error"
                    title="Remove this booking"
                  >
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Drawer>
  )
}
