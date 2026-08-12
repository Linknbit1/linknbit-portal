import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle, Ban, BadgeCheck, CheckCircle2, Circle, CircleDashed, CircleDotDashed, Eye,
  CornerUpRight, GitBranch, Layers, MessageSquare, MoreHorizontal, Paperclip, Timer, Trash2, type LucideIcon,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import { Avatar, AvatarGroup } from '../ui/Avatar'
import { PriorityChip } from './PriorityChip'
import { ServiceChip } from './ServiceChip'
import { useDeleteTask, useUpdateTaskStatus } from '../../hooks/useTasks'
import { useDragScroll } from '../../hooks/useDragScroll'
import { useToast } from '../ui/toast-context'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { Popover } from '../ui/Popover'
import { MoveTaskModal } from './MoveTaskModal'
import { useCanAccess } from '../../hooks/useRoleFlags'
import { ProgressBar } from '../ui/ProgressBar'
import { isOverdue, formatStamp } from '../../lib/utils'
import { formatEstimate } from '../../lib/duration'
import type { TaskListItem } from '../../api/tasks'
import type { TaskStatus } from '../../types'

interface Column {
  status: TaskStatus
  label: string
  icon: LucideIcon
  /** Header tint, text and border — one hue per column so the board reads at a glance. */
  header: string
  /** Border used while a card is dragged over this column. */
  dropBorder: string
}

/**
 * One column per status, in workflow order. Previously Backlog was folded into
 * To Do and Approved into Done, which meant two statuses could not be reached by
 * dragging at all.
 *
 * The palette runs cool → active → done rather than reusing StatusChip's colours:
 * the chips give in_progress and approved the same green, which would leave two
 * adjacent headers indistinguishable.
 */
const COLUMNS: Column[] = [
  {
    status: 'backlog', label: 'Backlog', icon: CircleDashed,
    header: 'bg-[rgba(138,147,163,0.14)] text-[#8A93A3] border-[rgba(138,147,163,0.28)]',
    dropBorder: 'border-[#8A93A3]',
  },
  {
    status: 'todo', label: 'To Do', icon: Circle,
    header: 'bg-[rgba(96,165,250,0.13)] text-[#60A5FA] border-[rgba(96,165,250,0.3)]',
    dropBorder: 'border-[#60A5FA]',
  },
  {
    status: 'in_progress', label: 'In Progress', icon: CircleDotDashed,
    header: 'bg-[rgba(245,158,11,0.14)] text-[#F59E0B] border-[rgba(245,158,11,0.3)]',
    dropBorder: 'border-[#F59E0B]',
  },
  {
    status: 'review', label: 'Review', icon: Eye,
    header: 'bg-[rgba(167,139,250,0.14)] text-[#A78BFA] border-[rgba(167,139,250,0.3)]',
    dropBorder: 'border-[#A78BFA]',
  },
  {
    status: 'approved', label: 'Approved', icon: BadgeCheck,
    header: 'bg-[rgba(34,197,94,0.13)] text-[#22C55E] border-[rgba(34,197,94,0.3)]',
    dropBorder: 'border-[#22C55E]',
  },
  {
    status: 'completed', label: 'Completed', icon: CheckCircle2,
    header: 'bg-[rgba(45,212,191,0.13)] text-[#2DD4BF] border-[rgba(45,212,191,0.3)]',
    dropBorder: 'border-[#2DD4BF]',
  },
  {
    status: 'blocked', label: 'Blocked', icon: Ban,
    header: 'bg-[rgba(244,54,76,0.12)] text-[#F4364C] border-[rgba(244,54,76,0.3)]',
    dropBorder: 'border-[#F4364C]',
  },
]

/**
 * The scheduled window. Falls back to a single stamp when only one end is set,
 * so a task with just a due date still reads correctly.
 */
function ScheduleLine({ task, overdue }: { task: TaskListItem; overdue: boolean }) {
  if (!task.start_date && !task.due_date) return null

  return (
    <span className={cn('flex min-w-0 items-center gap-1 font-mono text-[10px]', overdue ? 'text-error' : 'text-text-4')}>
      <span className="truncate">
        {task.start_date && formatStamp(task.start_date)}
        {task.start_date && task.due_date && ' → '}
        {task.due_date && formatStamp(task.due_date)}
      </span>
    </span>
  )
}

/** Labelled overdue flag — same treatment as the project cards. */
function OverduePill() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-error/30 bg-error/10 px-2 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-wider text-error">
      <AlertCircle size={10} className="shrink-0" /> Overdue
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

interface CardMenuProps {
  onMove: () => void
  onDelete: () => void
  canMove: boolean
}

/** Per-card actions, where ClickUp keeps them: the ellipsis on hover. */
function CardMenu({ onMove, onDelete, canMove }: CardMenuProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const item = 'flex w-full items-center gap-2 px-3 py-1.5 text-left font-ui text-[12.5px] text-text-1 transition-colors hover:bg-surface-3'

  return (
    <>
      <button
        ref={ref}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
        aria-label="Task actions"
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-sm text-text-4 transition-opacity hover:bg-surface-3 hover:text-text-1',
          open ? 'opacity-100' : 'opacity-0 focus-visible:opacity-100 group-hover/card:opacity-100',
        )}
      >
        <MoreHorizontal size={13} />
      </button>
      <Popover
        anchorRef={ref}
        open={open}
        onClose={() => setOpen(false)}
        className="w-44 overflow-hidden rounded-md border border-border-strong bg-surface-2 py-1 shadow-lg"
      >
        {canMove && (
          <button className={item} onClick={(e) => { e.stopPropagation(); setOpen(false); onMove() }}>
            <CornerUpRight size={13} className="text-text-4" /> Move to…
          </button>
        )}
        <button
          className={cn(item, 'text-error hover:bg-error/10')}
          onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete() }}
        >
          <Trash2 size={13} /> Delete
        </button>
      </Popover>
    </>
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
  const [pendingMove, setPendingMove] = useState<TaskListItem | null>(null)
  const canMoveTask = useCanAccess('can_manage_projects')
  const boardRef = useDragScroll<HTMLDivElement>()
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
    if (!task || statusOf(task) === col.status) return
    setOptimistic((o) => ({ ...o, [id]: col.status }))
    updateStatus.mutate(
      { id, status: col.status, projectId: task.project_id },
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
    // boardRef adds click-and-hold panning: grab any empty part of the board —
    // gutters, column background, below the last card — and drag sideways.
    <div ref={boardRef} className="flex min-h-80 flex-1 snap-x snap-mandatory gap-2.5 overflow-x-auto pb-2 lg:snap-none lg:gap-3">
      {COLUMNS.map((col) => {
        const items = tasks.filter((t) => statusOf(t) === col.status)
        const Icon = col.icon
        return (
          <div
            key={col.status}
            onDragOver={(e) => { e.preventDefault(); setDragOver(col.status) }}
            onDragLeave={() => setDragOver((c) => (c === col.status ? null : c))}
            onDrop={() => handleDrop(col)}
            className={cn(
              'flex h-full snap-start flex-col rounded-lg border p-2.5 transition-colors',
              // Near-full width on a phone so cards stay readable, then a roomy
              // fixed lane. Seven columns will not fit a laptop, so the board
              // scrolls sideways rather than squeezing every card thin.
              'w-[86vw] shrink-0 sm:w-87.5 lg:w-auto lg:min-w-87.5 lg:flex-1',
              dragOver === col.status ? cn(col.dropBorder, 'bg-surface-2/40') : 'border-border-default bg-surface-1/60',
            )}
          >
            {/* Coloured, iconed header — the column's identity, ClickUp style. */}
            <div className={cn('mb-2 flex shrink-0 items-center gap-2 rounded-md border px-2.5 py-2', col.header)}>
              <Icon size={14} className="shrink-0" />
              <span className="min-w-0 flex-1 truncate font-ui text-[11.5px] font-bold uppercase tracking-wider">
                {col.label}
              </span>
              <span className="shrink-0 font-mono text-[11px] font-bold tabular-nums">{items.length}</span>
            </div>
            {/* overscroll-y-contain, not overscroll-contain: the vertical axis
                must not chain to the page when a column bottoms out, but the
                horizontal axis has to reach the board — otherwise a sideways
                gesture over a column scrolls nothing at all. */}
            <div className="flex-1 space-y-2 min-h-2 overflow-y-auto overscroll-y-contain">
              {items.map((t) => (
                <div
                  key={t.id}
                  draggable
                  data-no-pan
                  onDragStart={() => setDragId(t.id)}
                  onDragEnd={() => { setDragId(null); setDragOver(null) }}
                  onClick={() => onOpenTask(t.id)}
                  className={cn(
                    'group/card bg-surface-1 border border-border-default rounded-md p-3 cursor-grab active:cursor-grabbing hover:border-border-strong transition-[transform,opacity,border-color] duration-150',
                    dragId === t.id ? 'opacity-40 scale-[0.98]' : 'opacity-100',
                  )}
                >
                  {/* Floated together so the pill and the delete button share a
                      line and the title text wraps around them. */}
                  <div className="float-right -mr-1 -mt-0.5 ml-1.5 flex items-center gap-1.5">
                    {!!t.due_date && isOverdue(t.due_date) && statusOf(t) !== 'completed' && statusOf(t) !== 'approved' && <OverduePill />}
                    <CardMenu
                      canMove={canMoveTask}
                      onMove={() => setPendingMove(t)}
                      onDelete={() => setPendingDelete(t)}
                    />
                  </div>
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
                      <ScheduleLine task={t} overdue={!!t.due_date && isOverdue(t.due_date) && statusOf(t) !== 'completed' && statusOf(t) !== 'approved'} />
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

      {pendingMove && (
        <MoveTaskModal
          taskId={pendingMove.id}
          taskTitle={pendingMove.title}
          currentProjectId={pendingMove.project_id}
          currentProjectName={pendingMove.project?.name ?? 'this project'}
          currentServiceId={pendingMove.project_service_id}
          currentServiceName={pendingMove.project_service?.service?.name}
          onClose={() => setPendingMove(null)}
        />
      )}
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
