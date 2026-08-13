import { useState, type ReactNode } from 'react'
import {
  Trash2, Check, Pencil, Plus, X, CircleDot, UserRound, CalendarDays, Flag,
  Repeat, Building2, Radio, FolderKanban, ListChecks, type LucideIcon,
} from 'lucide-react'
import { Drawer } from '../../components/ui/Drawer'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { DatePicker } from '../../components/ui/DatePicker'
import { Avatar } from '../../components/ui/Avatar'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../components/ui/toast-context'
import { CHANNEL_CONFIG, CHANNEL_ORDER } from '../../constants/bd'
import { useBd } from '../../context/BdPrototypeContext'
import { randomUUID } from '../../lib/uuid'
import { cn } from '../../lib/cn'
import { PRIORITY_LABELS, STATUS_LABELS } from '../../lib/utils'
import { BD_REPS } from '../../data/bdMock'
import {
  BD_TASK_STATUSES,
  type BdTask, type TaskStatus, type Priority, type BdTaskRecurrence, type BdChannel,
} from '../../types'

const PRIORITY_ORDER: Priority[] = ['critical', 'high', 'medium', 'low']

const RECURRENCES: { value: BdTaskRecurrence; label: string }[] = [
  { value: 'once', label: 'One-off' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

const NO_LEAD = '__none__'
const NO_CHANNEL = '__none__'

/**
 * Click-to-rename heading. Saves on Enter or blur, reverts on Escape, and never
 * writes an empty title. Copied from TaskDetailContent so the two task drawers
 * behave identically.
 */
function EditableTitle({ value, onSave }: { value: string; onSave: (next: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const commit = () => {
    setEditing(false)
    const next = draft.trim()
    if (!next || next === value) return
    onSave(next)
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit() }
          if (e.key === 'Escape') setEditing(false)
        }}
        aria-label="Task name"
        className="w-full rounded-sm border border-border-focus bg-surface-inset px-2 py-1 font-display text-[18px] font-bold text-text-1 outline-none"
      />
    )
  }

  return (
    <button
      onClick={() => { setDraft(value); setEditing(true) }}
      title="Rename task"
      className="group -mx-2 flex w-full items-start gap-2 rounded-sm px-2 py-1 text-left transition-colors hover:bg-surface-2"
    >
      <h2 className="font-display text-[18px] font-bold text-text-1">{value}</h2>
      {/* Visible on touch, where there is no hover to reveal it. */}
      <Pencil size={13} className="mt-1.5 shrink-0 text-text-4 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100" />
    </button>
  )
}

/** Icon + label on the left, control on the right. Every field carries a label. */
function PropertyRow({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-9 items-center gap-3 py-0.5">
      <span className="flex w-28 shrink-0 items-center gap-1.5 font-ui text-[12.5px] text-text-3">
        <Icon size={13} className="shrink-0 text-text-4" /> {label}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

interface TaskDrawerProps {
  task: BdTask | null
  onClose: () => void
  /** Opens the linked lead in the pipeline drawer. */
  onOpenLead?: (leadId: string) => void
}

/**
 * The BD task record.
 *
 * Every field edits in place — no Edit button, no form modal — matching the
 * delivery task drawer. Writes land on the prototype store immediately, so the
 * board behind the panel updates as you type.
 */
export function TaskDrawer({ task, onClose, onOpenLead }: TaskDrawerProps) {
  const toast = useToast()
  const {
    leads, projects, patchTask, toggleChecklistItem, deleteTask,
    canSeeAll, viewerRepId, viewerName,
  } = useBd()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [newItem, setNewItem] = useState('')

  if (!task) return null

  const patch = (next: Partial<BdTask>) => patchTask(task.id, next)
  const done = task.checklist.filter((c) => c.done).length
  const isDone = task.status === 'completed' || task.status === 'approved'

  const addChecklistItem = () => {
    const label = newItem.trim()
    if (!label) return
    patch({ checklist: [...task.checklist, { id: randomUUID(), label, done: false }] })
    setNewItem('')
  }

  // A rep who cannot see the department cannot hand their work to someone else.
  const assigneeOptions = canSeeAll
    ? BD_REPS.map((r) => ({ value: r.id, label: r.name }))
    : [{ value: viewerRepId, label: `${viewerName} (you)` }]

  return (
    <>
      <Drawer
        open={!!task}
        onClose={onClose}
        width={560}
        footer={
          <div className="flex items-center gap-2">
            {!isDone && (
              <Button
                size="sm"
                iconLeft={<Check size={15} />}
                onClick={() => { patch({ status: 'completed' }); toast('Task completed', 'success'); onClose() }}
              >
                Mark done
              </Button>
            )}
            <button
              onClick={() => setConfirmDelete(true)}
              aria-label="Delete task"
              className="ml-auto flex size-8 items-center justify-center rounded-sm text-text-4 transition-colors hover:bg-error/10 hover:text-error"
            >
              <Trash2 size={15} />
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-5 p-5">
          <EditableTitle value={task.title} onSave={(title) => patch({ title })} />

          {/* ── Properties ── */}
          <div className="flex flex-col divide-y divide-border-subtle/60">
            <PropertyRow icon={CircleDot} label="Status">
              <Select
                value={task.status}
                onChange={(v) => { patch({ status: v as TaskStatus }); toast(`Moved to ${STATUS_LABELS[v as TaskStatus]}`, 'success') }}
                options={BD_TASK_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
                size="sm"
              />
            </PropertyRow>

            <PropertyRow icon={UserRound} label="Assignee">
              <Select
                value={task.assigneeId}
                onChange={(v) => {
                const rep = BD_REPS.find((r) => r.id === v)
                patch({ assigneeId: v, assigneeName: rep?.name ?? task.assigneeName })
                }}
                options={assigneeOptions}
                size="sm"
              />
            </PropertyRow>

            <PropertyRow icon={CalendarDays} label="Due date">
              <DatePicker
                value={task.dueDate ?? ''}
                onChange={(v) => patch({ dueDate: v || null })}
                placeholder="No due date"
              />
            </PropertyRow>

            <PropertyRow icon={Flag} label="Priority">
              <Select
                value={task.priority}
                onChange={(v) => patch({ priority: v as Priority })}
                options={PRIORITY_ORDER.map((p) => ({ value: p, label: PRIORITY_LABELS[p] }))}
                size="sm"
              />
            </PropertyRow>

            <PropertyRow icon={FolderKanban} label="Project">
              <Select
                value={task.projectId}
                onChange={(v) => {
                const project = projects.find((p) => p.id === v)
                patch({ projectId: v, projectName: project?.name ?? task.projectName })
                }}
                options={projects.map((p) => ({ value: p.id, label: p.name }))}
                size="sm"
              />
            </PropertyRow>

            <PropertyRow icon={Building2} label="Linked lead">
              <Select
                value={task.leadId ?? NO_LEAD}
                onChange={(v) => {
                const lead = leads.find((l) => l.id === v)
                patch({ leadId: lead?.id, leadCompany: lead?.company })
                }}
                options={[{ value: NO_LEAD, label: 'Not linked' }, ...leads.map((l) => ({ value: l.id, label: l.company }))]}
                size="sm"
              />
            </PropertyRow>

            <PropertyRow icon={Radio} label="Channel">
              <Select
                value={task.channel ?? NO_CHANNEL}
                onChange={(v) => patch({ channel: v === NO_CHANNEL ? undefined : (v as BdChannel) })}
                options={[
                { value: NO_CHANNEL, label: 'General' },
                ...CHANNEL_ORDER.map((c) => ({ value: c, label: CHANNEL_CONFIG[c].label })),
                ]}
                size="sm"
              />
            </PropertyRow>

            <PropertyRow icon={Repeat} label="Repeats">
              <Select
                value={task.recurrence}
                onChange={(v) => patch({ recurrence: v as BdTaskRecurrence })}
                options={RECURRENCES}
                size="sm"
              />
            </PropertyRow>
          </div>

          {task.leadCompany && task.leadId && onOpenLead && (
            <button
              type="button"
              onClick={() => onOpenLead(task.leadId as string)}
              className="flex items-center gap-2.5 rounded-md border border-border-default bg-surface-2 px-3 py-2.5 text-left transition-colors hover:border-border-strong"
            >
              <Building2 size={14} className="shrink-0 text-text-4" />
              <span className="min-w-0 flex-1">
                <span className="block font-ui text-[10.5px] uppercase tracking-wider text-text-4">Open lead</span>
                <span className="block truncate font-ui text-[13px] text-text-1">{task.leadCompany}</span>
              </span>
            </button>
          )}

          {/* ── Description ── */}
          <div>
            <label htmlFor="bd-task-description" className="mb-1.5 block font-ui text-[12.5px] font-medium text-text-2">
              Description
            </label>
            <textarea
              id="bd-task-description"
              value={task.description ?? ''}
              onChange={(e) => patch({ description: e.target.value || undefined })}
              rows={3}
              placeholder="Any detail the assignee needs to start without asking…"
              className={cn(
                'w-full resize-y rounded-md border border-border-default bg-surface-inset px-3 py-2.5',
                'font-ui text-[13px] text-text-1 placeholder:text-text-4 focus:outline-none focus:shadow-ring-focus',
              )}
            />
          </div>

          {/* ── Checklist ── */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <label htmlFor="bd-task-checklist-add" className="flex items-center gap-1.5 font-ui text-[12.5px] font-medium text-text-2">
                <ListChecks size={13} className="text-text-4" /> Checklist
              </label>
              {task.checklist.length > 0 && (
                <span className="font-mono text-[11.5px] tabular-nums text-text-4">{done}/{task.checklist.length}</span>
              )}
            </div>

            {task.checklist.length > 0 && (
              <>
                <ProgressBar value={done} max={task.checklist.length} size="xs" variant={done === task.checklist.length ? 'success' : 'default'} />
                <ul className="flex flex-col gap-1">
                  {task.checklist.map((item) => (
                    <li key={item.id} className="group/item flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleChecklistItem(task.id, item.id)}
                        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-sm p-2 text-left transition-colors hover:bg-surface-2"
                      >
                        <span
                          className={cn(
                            'flex size-4 shrink-0 items-center justify-center rounded-xs border transition-colors',
                            item.done ? 'border-success bg-success text-bg-base' : 'border-border-strong',
                          )}
                        >
                          {item.done && <Check size={10} strokeWidth={3} />}
                        </span>
                        <span className={cn('min-w-0 flex-1 font-ui text-[12.5px]', item.done ? 'text-text-4 line-through' : 'text-text-2')}>
                          {item.label}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => patch({ checklist: task.checklist.filter((c) => c.id !== item.id) })}
                        aria-label={`Remove ${item.label}`}
                        className="flex size-6 shrink-0 items-center justify-center rounded-xs text-text-4 opacity-0 transition-opacity hover:bg-error/10 hover:text-error focus-visible:opacity-100 group-hover/item:opacity-100"
                      >
                        <X size={12} />
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <div className="flex items-center gap-2">
              <Input
                id="bd-task-checklist-add"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addChecklistItem() } }}
                placeholder="Add a step…"
                className="flex-1"
              />
              <Button size="sm" variant="secondary" iconLeft={<Plus size={14} />} onClick={addChecklistItem}>Add</Button>
            </div>
          </div>

          <p className="flex items-center gap-2 border-t border-border-subtle pt-4 font-mono text-[10.5px] text-text-4">
            <Avatar name={task.createdBy} size="xs" /> Created by {task.createdBy}
          </p>
        </div>
      </Drawer>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => { deleteTask(task.id); setConfirmDelete(false); onClose(); toast('Task deleted', 'info') }}
        title="Delete this task?"
        message={task.title}
        confirmLabel="Delete task"
        danger
      />
    </>
  )
}
