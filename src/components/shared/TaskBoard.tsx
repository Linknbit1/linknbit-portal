import { useEffect, useState } from 'react'
import { AlertCircle, GitBranch, MessageSquare, Paperclip, Layers, Timer, Trash2 } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Avatar, AvatarGroup } from '../ui/Avatar'
import { PriorityChip } from './PriorityChip'
import { ServiceChip } from './ServiceChip'
import { useDeleteTask, useUpdateTaskStatus } from '../../hooks/useTasks'
import { useToast } from '../ui/toast-context'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { ProgressBar } from '../ui/ProgressBar'
import { isOverdue } from '../../lib/utils'
import { formatEstimate } from '../../lib/duration'
import type { TaskListItem } from '../../api/tasks'
import type { TaskStatus } from '../../types'

interface Column {
  key: string
  label: string
  statuses: TaskStatus[]
  set: TaskStatus
}

const COLUMNS: Column[] = [
  { key: 'todo', label: 'To Do', statuses: ['backlog', 'todo'], set: 'todo' },
  { key: 'in_progress', label: 'In Progress', statuses: ['in_progress'], set: 'in_progress' },
  { key: 'review', label: 'Review', statuses: ['review'], set: 'review' },
  { key: 'done', label: 'Done', statuses: ['approved', 'completed'], set: 'completed' },
  { key: 'blocked', label: 'Blocked', statuses: ['blocked'], set: 'blocked' },
]

/** "04 Aug, 09:00 AM" — matches how DateTimeRangePicker labels the same values. */
function stamp(iso: string): string {
  const d = new Date(iso)
  const day = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
  return `${day}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}`
}

/**
 * The scheduled window. Falls back to a single stamp when only one end is set,
 * so a task with just a due date still reads correctly.
 */
function ScheduleLine({ task, overdue }: { task: TaskListItem; overdue: boolean }) {
  if (!task.start_date && !task.due_date) return null

  return (
    <span className={cn('flex min-w-0 items-center gap-1 font-mono text-[10px]', overdue ? 'text-error' : 'text-text-4')}>
      {overdue && <AlertCircle size={10} className="shrink-0" />}
      <span className="truncate">
        {task.start_date && stamp(task.start_date)}
        {task.start_date && task.due_date && ' → '}
        {task.due_date && stamp(task.due_date)}
      </span>
    </span>
  )
}

/**
 * How far along a card is: ticked subtasks when it has any, otherwise the task's
 * own done state — so a task without a checklist still reads as 0% or 100%
 * rather than showing nothing.
 */
function taskProgress(task: TaskListItem, done: boolean): { pct: number; label: string } {
  if (task.subtask_count > 0) {
    return {
      pct: Math.round((task.subtask_done / task.subtask_count) * 100),
      label: `${task.subtask_done}/${task.subtask_count}`,
    }
  }
  return { pct: done ? 100 : 0, label: done ? '100%' : '0%' }
}

function TaskCardProgress({ task, done }: { task: TaskListItem; done: boolean }) {
  const { pct, label } = taskProgress(task, done)
  return (
    <div className="mt-2 flex items-center gap-2">
      <ProgressBar value={pct} size="xs" variant={pct === 100 ? 'success' : 'default'} className="flex-1" />
      <span className="shrink-0 font-mono text-[9.5px] text-text-4">{label}</span>
    </div>
  )
}

/**
 * Subtask / comment / attachment counts. All three already ride along on
 * TaskListItem, so this costs no extra query. Renders nothing when a task has
 * none of them, which keeps sparse boards clean.
 */
function TaskCardMeta({ task }: { task: TaskListItem }) {
  const items = [
    { icon: GitBranch, count: task.subtask_count, label: 'subtasks' },
    { icon: MessageSquare, count: task.comment_count, label: 'comments' },
    { icon: Paperclip, count: task.attachment_count, label: 'attachments' },
  ].filter((m) => m.count > 0)

  const estimate = formatEstimate(task.estimated_minutes)
  if (items.length === 0 && !estimate) return null

  return (
    <div className="mt-2 flex items-center gap-3 border-t border-border-subtle pt-2 text-text-4">
      {items.map((m) => (
        <span key={m.label} className="flex items-center gap-1 font-mono text-[10px]" title={`${m.count} ${m.label}`}>
          <m.icon size={11} /> {m.count}
        </span>
      ))}
      {estimate && (
        <span className="ml-auto flex items-center gap-1 font-mono text-[10px]" title="Time estimate">
          <Timer size={11} /> {estimate}
        </span>
      )}
    </div>
  )
}

interface TaskBoardProps {
  tasks: TaskListItem[]
  onOpenTask: (id: string) => void
  showProject?: boolean
}

export function TaskBoard({ tasks, onOpenTask, showProject }: TaskBoardProps) {
  const toast = useToast()
  const updateStatus = useUpdateTaskStatus()
  const deleteTask = useDeleteTask()
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<TaskListItem | null>(null)
  // Optimistic status overrides so a dropped card moves instantly (no refetch flicker).
  const [optimistic, setOptimistic] = useState<Record<string, TaskStatus>>({})

  // Drop each override once the server data catches up to it (reconciling optimistic
  // drag state with refetched tasks — a legitimate prop-derived sync).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOptimistic((prev) => {
      let changed = false
      const next = { ...prev }
      for (const t of tasks) {
        if (next[t.id] && next[t.id] === t.status) { delete next[t.id]; changed = true }
      }
      return changed ? next : prev
    })
  }, [tasks])

  const statusOf = (t: TaskListItem): TaskStatus => optimistic[t.id] ?? (t.status as TaskStatus)

  const handleDrop = (col: Column) => {
    setDragOver(null)
    const id = dragId
    setDragId(null)
    if (!id) return
    const task = tasks.find((t) => t.id === id)
    if (!task || statusOf(task) === col.set) return
    setOptimistic((o) => ({ ...o, [id]: col.set }))
    updateStatus.mutate(
      { id, status: col.set, projectId: task.project_id },
      { onError: (e) => { setOptimistic((o) => { const n = { ...o }; delete n[id]; return n }); toast(e instanceof Error ? e.message : 'Could not move task', 'error') } },
    )
  }

  return (
    // flex-1 takes whatever height the parent leaves so each column scrolls its own
    // cards; the min-height floor keeps the board usable on short viewports (the
    // page scrolls again below it). Falls back to content height when the parent
    // chain isn't height-constrained.
    // Snap points make the mobile board swipe column-by-column instead of
    // drifting between two half-visible ones.
    <div className="flex min-h-80 flex-1 snap-x snap-mandatory gap-2.5 overflow-x-auto pb-2 lg:snap-none lg:gap-3">
      {COLUMNS.map((col) => {
        const items = tasks.filter((t) => (col.statuses as string[]).includes(statusOf(t)))
        return (
          <div
            key={col.key}
            onDragOver={(e) => { e.preventDefault(); setDragOver(col.key) }}
            onDragLeave={() => setDragOver((c) => (c === col.key ? null : c))}
            onDrop={() => handleDrop(col)}
            className={cn(
              'flex h-full snap-start flex-col rounded-lg border p-2.5 transition-colors',
              // Near-full width on a phone so cards stay readable, a fixed lane on
              // tablets, and only elastic once all five can share the row.
              'w-[86vw] shrink-0 sm:w-72 lg:w-auto lg:min-w-[220px] lg:flex-1',
              dragOver === col.key ? 'border-brand-red bg-brand-red/5' : 'border-border-default bg-surface-1/60',
            )}
          >
            <div className="flex shrink-0 items-center justify-between px-1 pb-2">
              <span className="font-ui font-semibold text-[12px] text-text-2">{col.label}</span>
              <span className="font-mono text-[10.5px] text-text-4">{items.length}</span>
            </div>
            {/* overscroll-contain keeps a column's scroll from chaining to the page. */}
            <div className="flex-1 space-y-2 min-h-2 overflow-y-auto overscroll-contain">
              {items.map((t) => (
                <div
                  key={t.id}
                  draggable
                  onDragStart={() => setDragId(t.id)}
                  onDragEnd={() => { setDragId(null); setDragOver(null) }}
                  onClick={() => onOpenTask(t.id)}
                  className={cn(
                    'group/card bg-surface-1 border border-border-default rounded-md p-3 cursor-grab active:cursor-grabbing hover:border-border-strong transition-[transform,opacity,border-color] duration-150',
                    dragId === t.id ? 'opacity-40 scale-[0.98]' : 'opacity-100',
                  )}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); setPendingDelete(t) }}
                    aria-label={`Delete ${t.title}`}
                    className="float-right -mr-1 -mt-1 ml-1 flex size-6 items-center justify-center rounded-sm text-text-4 opacity-0 transition-opacity hover:bg-error/10 hover:text-error focus-visible:opacity-100 group-hover/card:opacity-100"
                  >
                    <Trash2 size={12} />
                  </button>
                  {/* Inside a project the project/service row is hidden, so the
                      stage is what gives this row something to say. */}
                  {((showProject && t.project) || t.stage) && (
                    <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                      {showProject && t.project_service?.service && <ServiceChip service={t.project_service.service.slug} showDot={false} />}
                      {showProject && t.project && (
                        <span className="min-w-0 truncate font-ui text-[10.5px] text-text-4">{t.project.name}</span>
                      )}
                      {t.stage && (
                        <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-border-subtle bg-surface-2 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-text-3">
                          <Layers size={9} className="shrink-0 text-text-4" />
                          <span className="truncate">{t.stage.name}</span>
                        </span>
                      )}
                    </div>
                  )}
                  <p className="font-ui font-medium text-body-sm/snug text-text-1">{t.title}</p>
                  {t.description && (
                    <p className="mt-1 line-clamp-2 font-ui text-[11.5px] leading-snug text-text-4">{t.description}</p>
                  )}
                  {(t.start_date || t.due_date) && (
                    <div className="mt-2 min-w-0">
                      <ScheduleLine task={t} overdue={!!t.due_date && isOverdue(t.due_date) && statusOf(t) !== 'completed'} />
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-2.5 gap-2">
                    <PriorityChip priority={t.priority} />
                    <div className="flex items-center gap-1.5">
                      {t.assignees.length > 0
                        ? <AvatarGroup users={t.assignees.map((a) => ({ id: a.id, name: a.name, avatarUrl: a.avatar_url ?? undefined }))} max={3} size="xs" linkToProfile />
                        : t.assignee
                          ? <Avatar name={t.assignee.name} src={t.assignee.avatar_url ?? undefined} size="xs" personId={t.assignee.id} />
                          : <span className="size-6 rounded-full border border-dashed border-border-strong shrink-0" />}
                    </div>
                  </div>
                  <TaskCardProgress task={t} done={statusOf(t) === 'completed' || statusOf(t) === 'approved'} />
                  <TaskCardMeta task={t} />
                </div>
              ))}
              {items.length === 0 && <p className="text-center text-[11px] text-text-4 py-4">Empty</p>}
            </div>
          </div>
        )
      })}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete task?"
        message={
          <span>
            <strong className="text-text-1">{pendingDelete?.title}</strong> will be deleted, along with its
            comments, attachments, subtasks and logged time.
          </span>
        }
        confirmLabel="Delete task"
        danger
        isPending={deleteTask.isPending}
        onConfirm={() => {
          if (!pendingDelete) return
          deleteTask.mutate({ id: pendingDelete.id, projectId: pendingDelete.project_id }, {
            onSuccess: () => { toast('Task deleted', 'success'); setPendingDelete(null) },
            onError: (e) => toast(e instanceof Error ? e.message : 'Delete failed', 'error'),
          })
        }}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  )
}
