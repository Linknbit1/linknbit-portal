import { useMemo, useState } from 'react'
import type { JSONContent } from '@tiptap/react'
import { Plus, Trash2, Send, AlertTriangle, Save, Check, FolderPlus, Sparkles, Timer } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Select'
import { cn } from '../lib/cn'
import { useToast } from '../components/ui/toast-context'
import { useProjects } from '../hooks/useProjects'
import { useTasks } from '../hooks/useTasks'
import {
  useSubmitStandup, useUpdateStandup, useStandupWindow, useStandupSuggestions,
} from '../hooks/useStandups'
import { StandupEntryEditor } from '../components/editor/StandupEntryEditor'
import { formatMinutes } from '../lib/duration'
import { fromDbDoc } from '../lib/richText'
import type { StandupDetail, StandupEntryInput } from '../api/standups'
import type { Json } from '../types/database'
import { randomUUID } from '../lib/uuid'

const MIN_BLOCKER = 10
/** Fallback until the window loads; the server value always wins. */
const DEFAULT_MIN_CHARS = 100

/** One task worked on, inside a project group — or one ad-hoc item. */
interface TaskRow {
  key: string
  taskId: string
  /** Ad-hoc rows only: the subject, since there is no task to name it. */
  title: string
  hours: string
  minutes: string
  workDone: string
  workDoneDoc: JSONContent | null
  blocker: string
}

/**
 * One card in the form. Either a project and the tasks done on it, or the
 * "Other work" card holding things with no project behind them at all —
 * fetching the cake, an interview panel, a fire drill. Real hours that the
 * eight-hour rule would otherwise have nowhere to put.
 */
interface ProjectGroup {
  key: string
  kind: 'project' | 'adhoc'
  projectId: string
  tasks: TaskRow[]
}

const emptyTask = (): TaskRow => ({
  key: randomUUID(), taskId: '', title: '', hours: '', minutes: '', workDone: '', workDoneDoc: null, blocker: '',
})

const emptyGroup = (): ProjectGroup =>
  ({ key: randomUUID(), kind: 'project', projectId: '', tasks: [emptyTask()] })

const emptyAdhocGroup = (): ProjectGroup =>
  ({ key: randomUUID(), kind: 'adhoc', projectId: '', tasks: [emptyTask()] })

/**
 * Reopens a submitted standup as editable groups.
 *
 * Entries are stored flat, one per task, so consecutive entries sharing a
 * project are folded back into the group they were written in.
 */
function groupsFrom(standup: StandupDetail): ProjectGroup[] {
  const groups: ProjectGroup[] = []
  for (const e of standup.entries) {
    // Null when the linked project was hard-deleted — reopen empty so the editor
    // must re-pick a current project (the original stays in the saved snapshot).
    const projectId = e.project_id ?? ''
    const kind: ProjectGroup['kind'] = e.project_id ? 'project' : 'adhoc'
    const last = groups[groups.length - 1]
    const row: TaskRow = {
      key: e.id,
      taskId: e.task_id ?? '',
      title: e.title ?? '',
      hours: String(Math.floor(e.minutes_spent / 60) || ''),
      minutes: String(e.minutes_spent % 60 || ''),
      workDone: e.work_done,
      workDoneDoc: fromDbDoc(e.work_done_doc),
      blocker: e.blocker ?? '',
    }
    if (last && last.kind === kind && last.projectId === projectId) last.tasks.push(row)
    else groups.push({ key: randomUUID(), kind, projectId, tasks: [row] })
  }
  return groups.length > 0 ? groups : [emptyGroup()]
}

const rowMinutes = (t: TaskRow): number =>
  (parseInt(t.hours || '0', 10) || 0) * 60 + (parseInt(t.minutes || '0', 10) || 0)

function rowError(t: TaskRow, minChars: number, kind: ProjectGroup['kind']): string | null {
  if (kind === 'adhoc' && t.title.trim().length < 3) return 'Give this a title'
  const mins = rowMinutes(t)
  if (mins < 5) return 'Log at least 5 minutes'
  if (mins > 960) return 'That is more than 16 hours'
  if (t.workDone.trim().length < minChars) {
    return `Describe what you did, ${minChars} characters minimum`
  }
  if (t.blocker.trim() && t.blocker.trim().length < MIN_BLOCKER) {
    return `Explain the blocker (${MIN_BLOCKER}+ characters)`
  }
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
  const { data: window } = useStandupWindow()
  const submit = useSubmitStandup()
  const update = useUpdateStandup()
  const isEditing = !!editing
  const pending = submit.isPending || update.isPending

  // Only for a fresh standup — reopening one to correct it must show what was
  // submitted, not what the timer thinks happened.
  const { data: suggestions = [] } = useStandupSuggestions(!editing)

  const [groups, setGroups] = useState<ProjectGroup[]>(() => (editing ? groupsFrom(editing) : [emptyGroup()]))
  const [notes, setNotes] = useState(editing?.notes ?? '')
  const [showErrors, setShowErrors] = useState(false)
  const [seeded, setSeeded] = useState(false)

  /**
   * Fill the form with today's tasks, grouped by project.
   *
   * Times are left empty on purpose. Measured across the last month the timer
   * accounts for under four hours of an eight-hour day, so a prefilled duration
   * would be wrong more often than right — and correcting a wrong number is
   * slower than typing into an empty one.
   */
  const applySuggestions = () => {
    if (suggestions.length === 0) return
    const byProject = new Map<string, ProjectGroup>()
    for (const sug of suggestions) {
      const pid = sug.project_id ?? ''
      let group = byProject.get(pid)
      if (!group) {
        group = { key: randomUUID(), kind: 'project', projectId: pid, tasks: [] }
        byProject.set(pid, group)
      }
      group.tasks.push({ ...emptyTask(), taskId: sug.task_id })
    }
    setGroups([...byProject.values()])
    setSeeded(true)
  }

  const minChars = window?.min_work_done_chars ?? DEFAULT_MIN_CHARS
  const requiredMinutes = window?.required_minutes ?? 0
  const enforceHours = (window?.enforce_required_hours ?? false) && requiredMinutes > 0
  // Unpaid time from an approved exception earlier this month. Today may run
  // over by up to this much — that is how the debt gets worked off.
  const makeupOwed = window?.makeup_owed_minutes ?? 0

  const projectOptions = projects.map((p) => ({ value: p.id, label: p.name }))
  const loggedMinutes = groups.reduce(
    (sum, g) => sum + g.tasks.reduce((s, t) => s + rowMinutes(t), 0), 0,
  )
  const difference = loggedMinutes - requiredMinutes

  const patchGroup = (key: string, changes: Partial<ProjectGroup>) =>
    setGroups((gs) => gs.map((g) => (g.key === key ? { ...g, ...changes } : g)))

  const patchTask = (groupKey: string, taskKey: string, changes: Partial<TaskRow>) =>
    setGroups((gs) => gs.map((g) => (
      g.key === groupKey
        ? { ...g, tasks: g.tasks.map((t) => (t.key === taskKey ? { ...t, ...changes } : t)) }
        : g
    )))

  const errors = useMemo(
    () => groups.map((g) => ({
      project: g.kind === 'adhoc' || g.projectId ? null : 'Choose a project',
      tasks: g.tasks.map((t) => rowError(t, minChars, g.kind)),
    })),
    [groups, minChars],
  )

  const structureValid = errors.every((e) => e.project === null && e.tasks.every((t) => t === null))
  const hoursValid =
    !enforceHours ||
    (loggedMinutes >= requiredMinutes && loggedMinutes <= requiredMinutes + makeupOwed)
  const isValid = structureValid && hoursValid && groups.length > 0

  const handleSubmit = () => {
    setShowErrors(true)
    if (!structureValid) { toast('Fix the highlighted fields first', 'error'); return }
    if (!hoursValid) {
      toast(
        difference < 0
          ? `${formatMinutes(-difference)} still to account for`
          : `${formatMinutes(loggedMinutes - requiredMinutes - makeupOwed)} more than today allows`,
        'error',
      )
      return
    }

    const entries: StandupEntryInput[] = groups.flatMap((g) =>
      g.tasks.map((t) => ({
        project_id: g.kind === 'adhoc' ? '' : g.projectId,
        task_id: g.kind === 'adhoc' ? null : (t.taskId || null),
        title: g.kind === 'adhoc' ? t.title.trim() : null,
        work_done: t.workDone.trim(),
        work_done_doc: (t.workDoneDoc as Json | null) ?? null,
        minutes_spent: rowMinutes(t),
        blocker: t.blocker.trim() || null,
      })),
    )
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
      {/* ── The day's budget, pinned above everything ── */}
      <HoursMeter
        required={requiredMinutes}
        logged={loggedMinutes}
        enforced={enforceHours}
        makeupOwed={makeupOwed}
      />

      {/* What today looked like, offered rather than imposed — the form is still
          the person's account of their day, not the timer's. */}
      {!editing && !seeded && suggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-service-dev/30 bg-service-dev/5 px-4 py-3">
          <Timer size={15} className="shrink-0 text-service-dev" />
          <div className="min-w-0 flex-1">
            <p className="font-ui text-[12.5px] font-medium text-text-1">
              {suggestions.length} task{suggestions.length === 1 ? '' : 's'} you worked on today
            </p>
            <p className="mt-0.5 truncate font-ui text-[11.5px] text-text-4">
              {suggestions.slice(0, 3).map((s) => s.task_title).join(' · ')}
              {suggestions.length > 3 && ` · +${suggestions.length - 3} more`}
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={applySuggestions}>
            Fill them in
          </Button>
        </div>
      )}

      {groups.map((g, gi) => {
        const groupErr = showErrors ? errors[gi].project : null
        const tasksForProject = allTasks.filter((t) => t.project_id === g.projectId)
        // A task already logged in this group is not offered again — logging the
        // same task twice in one day is a mistake, not a use case.
        const takenIds = new Set(g.tasks.map((t) => t.taskId).filter(Boolean))
        const groupMinutes = g.tasks.reduce((s, t) => s + rowMinutes(t), 0)

        return (
          <section
            key={g.key}
            className={cn(
              'overflow-hidden rounded-xl border bg-surface-1',
              groupErr ? 'border-error/50' : 'border-border-default',
            )}
          >
            {/* Card header — a project picker, or the ad-hoc heading */}
            <header className="flex flex-wrap items-center gap-3 border-b border-border-subtle bg-surface-2/40 px-4 py-3">
              <div className="min-w-0 flex-1">
                {g.kind === 'adhoc' ? (
                  <>
                    <p className="flex items-center gap-1.5 font-ui text-[13px] font-semibold text-text-1">
                      <Sparkles size={13} className="text-text-3" /> Other work
                    </p>
                    <p className="mt-0.5 font-ui text-[11.5px] text-text-4">
                      Anything with no project behind it. An errand, an interview, a fire drill.
                    </p>
                  </>
                ) : (
                  <>
                    <label className="mb-1.5 block font-ui text-[11px] font-semibold uppercase tracking-wider text-text-3">
                      Project
                    </label>
                    <Select
                      value={g.projectId}
                      onChange={(v) => patchGroup(g.key, {
                        projectId: v,
                        // Tasks belong to the old project; their descriptions do not.
                        tasks: g.tasks.map((t) => ({ ...t, taskId: '' })),
                      })}
                      options={projectOptions}
                      placeholder="Select project…"
                      className="max-w-sm"
                    />
                  </>
                )}
              </div>
              <span className="font-mono text-[11.5px] text-text-3">
                {groupMinutes > 0 ? formatMinutes(groupMinutes) : '-'}
              </span>
              {groups.length > 1 && (
                <button
                  onClick={() => setGroups((gs) => gs.filter((x) => x.key !== g.key))}
                  aria-label="Remove this project"
                  className="flex size-7 items-center justify-center rounded-sm text-text-4 hover:bg-error/10 hover:text-error"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </header>

            {groupErr && (
              <p className="flex items-center gap-1.5 px-4 pt-3 font-ui text-[12px] text-error">
                <AlertTriangle size={12} /> {groupErr}
              </p>
            )}

            {/* Tasks under this project */}
            <div className="divide-y divide-border-subtle">
              {g.tasks.map((t, ti) => {
                const err = showErrors ? errors[gi].tasks[ti] : null
                const taskOptions = [
                  { value: '', label: 'No specific task' },
                  ...tasksForProject
                    .filter((task) => task.id === t.taskId || !takenIds.has(task.id))
                    .map((task) => ({ value: task.id, label: task.title })),
                ]
                const charCount = t.workDone.trim().length
                return (
                  <div key={t.key} className="space-y-3 p-4">
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="min-w-0 flex-1">
                        <label className="mb-1.5 block font-ui text-[11px] font-semibold uppercase tracking-wider text-text-3">
                          {g.kind === 'adhoc' ? 'Title' : 'Task'}
                        </label>
                        {g.kind === 'adhoc' ? (
                          <input
                            value={t.title}
                            onChange={(e) => patchTask(g.key, t.key, { title: e.target.value })}
                            placeholder="e.g. Collected the cake from the bakery"
                            className="h-9 w-full rounded-md border border-border-default bg-surface-inset px-3 font-ui text-[13px] text-text-1 outline-none placeholder:text-text-4 focus:border-border-focus"
                          />
                        ) : (
                          <Select
                            value={t.taskId}
                            onChange={(v) => patchTask(g.key, t.key, { taskId: v })}
                            options={taskOptions}
                            placeholder={g.projectId ? 'No specific task' : 'Pick a project first'}
                          />
                        )}
                      </div>
                      <div>
                        <label className="mb-1.5 block font-ui text-[11px] font-semibold uppercase tracking-wider text-text-3">
                          Time spent
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number" min={0} max={16} value={t.hours}
                            onChange={(e) => patchTask(g.key, t.key, { hours: e.target.value })}
                            placeholder="0" aria-label="Hours"
                            className="no-spinner h-9 w-16 rounded-md border border-border-default bg-surface-inset px-2.5 text-center font-mono text-[13px] text-text-1 outline-none focus:border-border-focus"
                          />
                          <span className="font-ui text-[11.5px] text-text-4">h</span>
                          <input
                            type="number" min={0} max={59} step={5} value={t.minutes}
                            onChange={(e) => patchTask(g.key, t.key, { minutes: e.target.value })}
                            placeholder="0" aria-label="Minutes"
                            className="no-spinner h-9 w-16 rounded-md border border-border-default bg-surface-inset px-2.5 text-center font-mono text-[13px] text-text-1 outline-none focus:border-border-focus"
                          />
                          <span className="font-ui text-[11.5px] text-text-4">m</span>
                        </div>
                      </div>
                      {g.tasks.length > 1 && (
                        <button
                          onClick={() => patchGroup(g.key, { tasks: g.tasks.filter((x) => x.key !== t.key) })}
                          aria-label="Remove this task"
                          className="mb-0.5 flex size-9 items-center justify-center rounded-sm text-text-4 hover:bg-error/10 hover:text-error"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="mb-1.5 block font-ui text-[11px] font-semibold uppercase tracking-wider text-text-3">
                        What did you do on this task?
                      </label>
                      <StandupEntryEditor
                        value={t.workDoneDoc}
                        onChange={(doc, text) => patchTask(g.key, t.key, { workDoneDoc: doc, workDone: text })}
                        placeholder="Be specific, what changed, and where it got to."
                      />
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p className={cn(
                          'font-mono text-[10.5px]',
                          charCount >= minChars ? 'text-success' : 'text-text-4',
                        )}>
                          {charCount >= minChars
                            ? <><Check size={10} className="inline" /> {charCount} characters</>
                            : `${charCount}/${minChars} characters`}
                        </p>
                        <p className="font-ui text-[10.5px] text-text-4">
                          Bold, italic, lists and links
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block font-ui text-[11px] font-semibold uppercase tracking-wider text-text-3">
                        Blocker <span className="font-normal normal-case tracking-normal text-text-4">- optional</span>
                      </label>
                      <textarea
                        value={t.blocker}
                        onChange={(e) => patchTask(g.key, t.key, { blocker: e.target.value })}
                        rows={2}
                        placeholder="Anything stopping this? e.g. Waiting on final logo files from the client."
                        className="w-full resize-y rounded-md border border-border-default bg-surface-inset px-3 py-2 font-ui text-body-sm text-text-1 outline-none placeholder:text-text-4 focus:border-border-focus"
                      />
                    </div>

                    {err && (
                      <p className="flex items-center gap-1.5 font-ui text-[12px] text-error">
                        <AlertTriangle size={12} /> {err}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="border-t border-border-subtle px-4 py-2.5">
              <Button
                variant="ghost" size="sm"
                onClick={() => patchGroup(g.key, { tasks: [...g.tasks, emptyTask()] })}
              >
                <Plus size={13} /> Add another task on this project
              </Button>
            </div>
          </section>
        )
      })}

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" iconLeft={<FolderPlus size={14} />}
          onClick={() => setGroups((gs) => [...gs, emptyGroup()])}>
          Add another project
        </Button>
        {/* One "Other work" card is enough — everything without a project goes in it. */}
        {!groups.some((g) => g.kind === 'adhoc') && (
          <Button variant="ghost" size="sm" iconLeft={<Sparkles size={14} />}
            onClick={() => setGroups((gs) => [...gs, emptyAdhocGroup()])}>
            Add other work
          </Button>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-label font-ui font-semibold uppercase tracking-wider text-text-2">
          Notes / plan for tomorrow (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Anything else the team should know."
          className="w-full resize-y rounded-md border border-border-default bg-surface-inset px-3 py-2 font-ui text-body-sm text-text-1 outline-none placeholder:text-text-4 focus:border-border-focus"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <Button
          iconLeft={isEditing ? <Save size={14} /> : <Send size={14} />}
          onClick={handleSubmit}
          loading={pending}
          disabled={showErrors && !isValid}
        >
          {isEditing ? 'Save changes' : 'Submit standup'}
        </Button>
        {isEditing && onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={pending}>Cancel</Button>
        )}
        <span className="font-ui text-[11.5px] text-text-4">
          {isEditing
            ? 'Corrections stay open until the window closes. Your on-time status and XP are unchanged.'
            : 'You can only submit once per day. You can still correct it afterwards.'}
        </span>
      </div>
    </div>
  )
}

/**
 * How much of the day is accounted for.
 *
 * Shows the target, what has been logged, and the gap — because "log exactly
 * eight hours" is only a fair rule if the person can see where they are against
 * it while they type.
 */
function HoursMeter({ required, logged, enforced, makeupOwed }: {
  required: number
  logged: number
  enforced: boolean
  /** Unpaid exception time still owed — today may run over by up to this much. */
  makeupOwed: number
}) {
  if (required <= 0) {
    return (
      <div className="rounded-xl border border-border-default bg-surface-1 px-4 py-3">
        <p className="font-ui text-[12.5px] text-text-3">
          Logged so far: <span className="font-semibold text-text-1">{formatMinutes(logged)}</span>
        </p>
      </div>
    )
  }

  const difference = logged - required
  const ceiling = required + makeupOwed
  const pct = Math.min(100, Math.round((logged / required) * 100))
  // "Right" is anywhere from the requirement up to the requirement plus
  // whatever make-up is outstanding.
  const exact = logged >= required && logged <= ceiling
  const over = logged > ceiling

  return (
    <div
      className={cn(
        'rounded-xl border px-4 py-3.5',
        exact ? 'border-success/40 bg-success/5'
          : over ? 'border-warning/40 bg-warning/5'
          : 'border-border-default bg-surface-1',
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-ui text-[12.5px] text-text-2">
          Account for{' '}
          <span className="font-display text-[15px] font-bold text-text-1">{formatMinutes(required)}</span>{' '}
          today
        </p>
        <p className={cn(
          'font-mono text-[12.5px] font-semibold',
          exact ? 'text-success' : over ? 'text-warning' : 'text-text-2',
        )}>
          {formatMinutes(logged)} logged
          {!exact && (
            <span className="ml-1.5 font-normal">
              · {over ? `${formatMinutes(difference)} over` : `${formatMinutes(-difference)} to go`}
            </span>
          )}
          {exact && (
            <span className="ml-1.5 font-normal">
              {difference > 0 ? `· ${formatMinutes(difference)} toward make-up` : '· exactly right'}
            </span>
          )}
        </p>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-200',
            exact ? 'bg-success' : over ? 'bg-warning' : 'bg-brand-red',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="mt-2 font-ui text-[11px] text-text-4">
        Your working day, less the lunch break and any approved leave or exception.
        {enforced && ' The total has to match exactly.'}
      </p>

      {makeupOwed > 0 && (
        <p className="mt-2 flex items-start gap-1.5 rounded-md border border-warning/25 bg-warning/8 px-2.5 py-1.5 font-ui text-[11px] text-warning">
          <AlertTriangle size={11} className="mt-0.5 shrink-0" />
          <span>
            You owe <span className="font-semibold">{formatMinutes(makeupOwed)}</span> of make-up time
            from an approved exception, unpaid hours you agreed to work back. Log up to{' '}
            <span className="font-semibold">{formatMinutes(ceiling)}</span> today and the extra comes
            off that balance.
          </span>
        </p>
      )}
    </div>
  )
}
