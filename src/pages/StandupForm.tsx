import { useMemo, useState } from 'react'
import { Plus, Trash2, Send, AlertTriangle, Clock, Save } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Select'
import { cn } from '../lib/cn'
import { useToast } from '../components/ui/toast-context'
import { useProjects } from '../hooks/useProjects'
import { useTasks } from '../hooks/useTasks'
import { useSubmitStandup, useUpdateStandup } from '../hooks/useStandups'
import type { StandupDetail, StandupEntryInput } from '../api/standups'
import { randomUUID } from '../lib/uuid'

/** Minimums mirrored from the DB CHECK constraints so errors surface inline. */
const MIN_WORK_DONE = 15
const MIN_BLOCKER = 10

interface Draft {
  key: string
  projectId: string
  taskId: string
  hours: string
  minutes: string
  workDone: string
  blocker: string
}

const emptyDraft = (): Draft => ({
  key: randomUUID(), projectId: '', taskId: '', hours: '', minutes: '', workDone: '', blocker: '',
})

/** Reopens a submitted standup as editable drafts. */
const draftsFrom = (standup: StandupDetail): Draft[] =>
  standup.entries.map((e) => ({
    key: e.id,
    projectId: e.project_id,
    taskId: e.task_id ?? '',
    hours: String(Math.floor(e.minutes_spent / 60) || ''),
    minutes: String(e.minutes_spent % 60 || ''),
    workDone: e.work_done,
    blocker: e.blocker ?? '',
  }))

function totalMinutes(d: Draft): number {
  return (parseInt(d.hours || '0', 10) || 0) * 60 + (parseInt(d.minutes || '0', 10) || 0)
}

function draftError(d: Draft): string | null {
  if (!d.projectId) return 'Choose a project'
  const mins = totalMinutes(d)
  if (mins < 5) return 'Log at least 5 minutes'
  if (mins > 960) return 'That is more than 16 hours'
  if (d.workDone.trim().length < MIN_WORK_DONE) return `Describe what you did (${MIN_WORK_DONE}+ characters)`
  if (d.blocker.trim() && d.blocker.trim().length < MIN_BLOCKER) return `Explain the blocker (${MIN_BLOCKER}+ characters)`
  return null
}

interface StandupFormProps {
  onDone?: () => void
  /** Present = correcting an existing standup rather than submitting a new one. */
  editing?: StandupDetail
  onCancel?: () => void
}

export function StandupForm({ onDone, editing, onCancel }: StandupFormProps) {
  const toast = useToast()
  const { data: projects = [] } = useProjects()
  const { data: allTasks = [] } = useTasks()
  const submit = useSubmitStandup()
  const update = useUpdateStandup()
  const isEditing = !!editing
  const pending = submit.isPending || update.isPending

  const [drafts, setDrafts] = useState<Draft[]>(() => (editing ? draftsFrom(editing) : [emptyDraft()]))
  const [notes, setNotes] = useState(editing?.notes ?? '')
  const [showErrors, setShowErrors] = useState(false)

  const projectOptions = projects.map((p) => ({ value: p.id, label: p.name }))
  const dayTotal = drafts.reduce((sum, d) => sum + totalMinutes(d), 0)

  const patch = (key: string, changes: Partial<Draft>) =>
    setDrafts((ds) => ds.map((d) => (d.key === key ? { ...d, ...changes } : d)))

  const errors = useMemo(() => drafts.map(draftError), [drafts])
  const isValid = errors.every((e) => e === null) && drafts.length > 0

  const handleSubmit = () => {
    setShowErrors(true)
    if (!isValid) { toast('Fix the highlighted fields first', 'error'); return }
    const entries: StandupEntryInput[] = drafts.map((d) => ({
      project_id: d.projectId,
      task_id: d.taskId || null,
      work_done: d.workDone.trim(),
      minutes_spent: totalMinutes(d),
      blocker: d.blocker.trim() || null,
    }))
    const trimmedNotes = notes.trim() || undefined

    if (editing) {
      update.mutate({ standupId: editing.id, entries, notes: trimmedNotes }, {
        onSuccess: () => { toast('Standup updated', 'success'); onDone?.() },
        onError: (e) => toast(e instanceof Error ? e.message : 'Could not save changes', 'error'),
      })
      return
    }

    submit.mutate({ entries, notes: trimmedNotes }, {
      onSuccess: () => { toast('Standup submitted', 'success'); onDone?.() },
      onError: (e) => toast(e instanceof Error ? e.message : 'Could not submit', 'error'),
    })
  }

  return (
    <div className="space-y-4">
      {drafts.map((d, i) => {
        const err = showErrors ? errors[i] : null
        const tasksForProject = allTasks.filter((t) => t.project_id === d.projectId)
        const taskOptions = [
          { value: '', label: 'No specific task' },
          ...tasksForProject.map((t) => ({ value: t.id, label: t.title })),
        ]
        return (
          <div key={d.key} className={cn('bg-surface-1 border rounded-xl p-4 space-y-3', err ? 'border-error/50' : 'border-border-default')}>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-text-4">Update {i + 1}</span>
              {drafts.length > 1 && (
                <button onClick={() => setDrafts((ds) => ds.filter((x) => x.key !== d.key))} className="size-7 rounded-sm flex items-center justify-center text-text-4 hover:text-error hover:bg-error/10" aria-label="Remove"><Trash2 size={13} /></button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">Project *</label>
                <Select value={d.projectId} onChange={(v) => patch(d.key, { projectId: v, taskId: '' })} options={projectOptions} placeholder="Select project…" />
              </div>
              <div className="space-y-1.5">
                <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">Task (optional)</label>
                <Select value={d.taskId} onChange={(v) => patch(d.key, { taskId: v })} options={taskOptions} placeholder={d.projectId ? 'No specific task' : 'Pick a project first'} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">Time spent *</label>
              <div className="flex items-center gap-2">
                <input type="number" min={0} max={16} value={d.hours} onChange={(e) => patch(d.key, { hours: e.target.value })} placeholder="0"
                  className="w-20 h-9 bg-surface-inset border border-border-default rounded-md px-3 font-mono text-[13px] text-text-1 focus:outline-none focus:border-border-focus" />
                <span className="font-ui text-[12px] text-text-3">hours</span>
                <input type="number" min={0} max={59} step={5} value={d.minutes} onChange={(e) => patch(d.key, { minutes: e.target.value })} placeholder="0"
                  className="w-20 h-9 bg-surface-inset border border-border-default rounded-md px-3 font-mono text-[13px] text-text-1 focus:outline-none focus:border-border-focus" />
                <span className="font-ui text-[12px] text-text-3">minutes</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">What did you complete? *</label>
              <textarea
                value={d.workDone}
                onChange={(e) => patch(d.key, { workDone: e.target.value })}
                rows={3}
                placeholder="e.g. Built the product listing page — filters, pagination and the empty state. Hooked it to the catalog API."
                className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 font-ui text-body-sm text-text-1 placeholder:text-text-4 focus:outline-none focus:border-border-focus resize-y"
              />
              <p className={cn('font-mono text-[10px]', d.workDone.trim().length < MIN_WORK_DONE ? 'text-text-4' : 'text-success')}>
                {d.workDone.trim().length}/{MIN_WORK_DONE} min characters — be specific, not "worked on it"
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">Blocker (optional)</label>
              <textarea
                value={d.blocker}
                onChange={(e) => patch(d.key, { blocker: e.target.value })}
                rows={2}
                placeholder="Anything stopping you? e.g. Waiting on final logo files from the client."
                className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 font-ui text-body-sm text-text-1 placeholder:text-text-4 focus:outline-none focus:border-border-focus resize-y"
              />
            </div>

            {err && <p className="flex items-center gap-1.5 font-ui text-[12px] text-error"><AlertTriangle size={12} /> {err}</p>}
          </div>
        )
      })}

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" size="sm" iconLeft={<Plus size={14} />} onClick={() => setDrafts((ds) => [...ds, emptyDraft()])}>
          Add another project
        </Button>
        <span className="flex items-center gap-1.5 font-mono text-[11px] text-text-3">
          <Clock size={12} /> Total logged: {Math.floor(dayTotal / 60)}h {dayTotal % 60}m
        </span>
      </div>

      <div className="space-y-1.5">
        <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">Notes / plan for tomorrow (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Anything else the team should know."
          className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 font-ui text-body-sm text-text-1 placeholder:text-text-4 focus:outline-none focus:border-border-focus resize-y"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <Button
          iconLeft={isEditing ? <Save size={14} /> : <Send size={14} />}
          onClick={handleSubmit}
          loading={pending}
        >
          {isEditing ? 'Save changes' : 'Submit standup'}
        </Button>
        {isEditing && onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={pending}>Cancel</Button>
        )}
        <span className="font-ui text-[11.5px] text-text-4">
          {isEditing
            ? 'Corrections stay open until the window closes. Your on-time status and XP are unchanged.'
            : 'You can only submit once per day — you can still correct it afterwards.'}
        </span>
      </div>
    </div>
  )
}
