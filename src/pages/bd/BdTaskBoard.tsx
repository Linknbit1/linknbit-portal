import { useState, type ReactNode } from 'react'
import {
  Trash2, Repeat, Building2, ListChecks, Plus, CalendarDays, Flag, ChevronsLeft,
  AlignLeft, type LucideIcon,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import { Avatar } from '../../components/ui/Avatar'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../components/ui/toast-context'
import { CHANNEL_CONFIG, BD_BOARD_COLUMNS, type BdBoardColumn } from '../../constants/bd'
import { useBd } from '../../context/BdPrototypeContext'
import { useDragScroll } from '../../hooks/useDragScroll'
import { formatDate, isOverdue, PRIORITY_LABELS } from '../../lib/utils'
import type { BdTask, TaskStatus, Priority } from '../../types'

const RECURRENCE_LABEL: Record<BdTask['recurrence'], string> = {
  once: 'One-off',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
}

/** Flag colours match PriorityChip's hues so the two readings agree. */
const PRIORITY_FLAG: Record<Priority, string> = {
  critical: 'text-[#F4364C]',
  high: 'text-[#F59E0B]',
  medium: 'text-[#60A5FA]',
  low: 'text-text-4',
}

/**
 * A card field, rendered as its own small pill.
 *
 * The board reads as a grid of discrete facts rather than a paragraph of muted
 * text — each value gets an icon and a chip, so due date, priority and status
 * are distinguishable at a glance without reading them.
 */
function FieldPill({
  icon: Icon, children, className, iconClassName,
}: { icon?: LucideIcon; children: ReactNode; className?: string; iconClassName?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-sm border border-border-subtle bg-surface-2 px-1.5 py-0.5',
        'font-ui text-label/normal text-text-2 whitespace-nowrap',
        className,
      )}
    >
      {Icon && <Icon size={11} className={cn('shrink-0 text-text-4', iconClassName)} />}
      {children}
    </span>
  )
}

interface BdTaskBoardProps {
  tasks: BdTask[]
  onOpenTask: (id: string) => void
  onAddTask: (status: TaskStatus) => void
  /** Hide the project line when the board is already scoped to one project. */
  showProject?: boolean
}

/**
 * The BD task board.
 *
 * Same statuses and behaviour as the delivery TaskBoard — drag to move, click to
 * open — but laid out ClickUp-style: solid status pill, count outside it, the
 * lane washed in its status colour, and an inline "Add task" per column. Empty
 * lanes collapse to a rail so the columns that hold work get the width.
 */
export function BdTaskBoard({ tasks, onOpenTask, onAddTask, showProject }: BdTaskBoardProps) {
  const toast = useToast()
  const { moveTaskStatus, deleteTask } = useBd()
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null)
  const [pendingDelete, setPendingDelete] = useState<BdTask | null>(null)
  const [expanded, setExpanded] = useState<TaskStatus[]>([])
  const boardRef = useDragScroll<HTMLDivElement>()

  const handleDrop = (status: TaskStatus) => {
    setDragOver(null)
    const id = dragId
    setDragId(null)
    if (!id) return
    const task = tasks.find((t) => t.id === id)
    if (!task || task.status === status) return
    moveTaskStatus(id, status)
    toast(`Moved to ${BD_BOARD_COLUMNS.find((c) => c.status === status)?.label}`, 'success')
  }

  return (
    <div ref={boardRef} className="flex min-h-80 flex-1 snap-x snap-mandatory gap-2.5 overflow-x-auto pb-2 lg:snap-none lg:gap-3">
      {BD_BOARD_COLUMNS.map((col) => {
        const items = tasks.filter((t) => t.status === col.status)
        // An empty lane parks itself as a rail; clicking it forces it open so a
        // card can still be dropped in deliberately.
        const collapsed = items.length === 0 && !expanded.includes(col.status)

        if (collapsed) {
          return (
            <CollapsedLane
              key={col.status}
              col={col}
              active={dragOver === col.status}
              onExpand={() => setExpanded((e) => [...e, col.status])}
              onDragOver={(e) => { e.preventDefault(); setDragOver(col.status) }}
              onDragLeave={() => setDragOver((c) => (c === col.status ? null : c))}
              onDrop={() => handleDrop(col.status)}
            />
          )
        }

        const Icon = col.icon
        return (
          <section
            key={col.status}
            onDragOver={(e) => { e.preventDefault(); setDragOver(col.status) }}
            onDragLeave={() => setDragOver((c) => (c === col.status ? null : c))}
            onDrop={() => handleDrop(col.status)}
            className={cn(
              'flex h-full snap-start flex-col rounded-lg border p-2.5 transition-colors duration-150',
              'w-[86vw] shrink-0 sm:w-[300px] lg:w-auto lg:min-w-[264px] lg:flex-1',
              dragOver === col.status ? cn(col.dropBorder, 'bg-surface-2/40') : col.lane,
            )}
          >
            {/* Solid pill, count outside it — the ClickUp header treatment. */}
            <header className="mb-2.5 flex shrink-0 items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-sm px-2 py-1',
                  'font-ui text-[11px] font-bold uppercase tracking-wider',
                  col.pill,
                )}
              >
                <Icon size={12} className="shrink-0" />
                {col.label}
              </span>
              <span className={cn('font-ui text-[12.5px] font-bold tabular-nums', col.accent)}>{items.length}</span>
              {items.length > 0 && (
                <button
                  onClick={() => setExpanded((e) => e.filter((s) => s !== col.status))}
                  aria-label={`Collapse ${col.label}`}
                  className="ml-auto flex size-5 items-center justify-center rounded-xs text-text-4 opacity-0 transition-opacity hover:text-text-2 focus-visible:opacity-100"
                >
                  <ChevronsLeft size={13} />
                </button>
              )}
            </header>

            <div className="min-h-2 flex-1 space-y-2 overflow-y-auto overscroll-y-contain">
              {items.map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  dragging={dragId === t.id}
                  showProject={showProject}
                  onDragStart={() => setDragId(t.id)}
                  onDragEnd={() => { setDragId(null); setDragOver(null) }}
                  onClick={() => onOpenTask(t.id)}
                  onDelete={() => setPendingDelete(t)}
                />
              ))}

              <button
                onClick={() => onAddTask(col.status)}
                className={cn(
                  'flex w-full items-center gap-1.5 rounded-md p-2 font-ui text-[12.5px] font-medium',
                  'transition-colors hover:bg-surface-2/60',
                  col.accent,
                )}
              >
                <Plus size={14} /> Add Task
              </button>
            </div>
          </section>
        )
      })}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete task?"
        message={
          <span>
            <strong className="text-text-1">{pendingDelete?.title}</strong> will be deleted, along with its checklist.
          </span>
        }
        confirmLabel="Delete task"
        danger
        onConfirm={() => {
          if (!pendingDelete) return
          deleteTask(pendingDelete.id)
          toast('Task deleted', 'success')
          setPendingDelete(null)
        }}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  )
}

/* ── Collapsed lane ─────────────────────────────────────────────────────────── */

interface CollapsedLaneProps {
  col: BdBoardColumn
  active: boolean
  onExpand: () => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: () => void
}

function CollapsedLane({ col, active, onExpand, onDragOver, onDragLeave, onDrop }: CollapsedLaneProps) {
  const Icon = col.icon
  return (
    <button
      onClick={onExpand}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      aria-label={`Expand ${col.label}`}
      className={cn(
        'flex w-11 shrink-0 flex-col items-center gap-2 rounded-lg border py-2.5 transition-colors duration-150',
        active ? cn(col.dropBorder, 'bg-surface-2/40') : col.lane,
      )}
    >
      {/* The pill rotates with the label so a parked lane keeps its identity. */}
      <span
        className={cn('flex items-center gap-1.5 rounded-sm px-2 py-1.5 font-ui text-[10.5px] font-bold uppercase tracking-wider', col.pill)}
        style={{ writingMode: 'vertical-rl' }}
      >
        <Icon size={11} className="shrink-0 rotate-90" />
        {col.label}
      </span>
      <span className={cn('font-ui text-[11.5px] font-bold tabular-nums', col.accent)}>0</span>
    </button>
  )
}

/* ── Card ───────────────────────────────────────────────────────────────────── */

interface TaskCardProps {
  task: BdTask
  dragging: boolean
  showProject?: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onClick: () => void
  onDelete: () => void
}

function TaskCard({ task, dragging, showProject, onDragStart, onDragEnd, onClick, onDelete }: TaskCardProps) {
  const overdue = !!task.dueDate && isOverdue(task.dueDate) && task.status !== 'completed' && task.status !== 'approved'
  const doneCount = task.checklist.filter((c) => c.done).length
  const progress = task.checklist.length === 0
    ? (task.status === 'completed' || task.status === 'approved' ? 100 : 0)
    : Math.round((doneCount / task.checklist.length) * 100)
  const channel = task.channel ? CHANNEL_CONFIG[task.channel] : undefined
  const ChannelIcon = channel?.icon

  return (
    <article
      draggable
      data-no-pan
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        'group/card cursor-grab rounded-lg border border-border-default bg-surface-1 p-3',
        'transition-[transform,opacity,border-color] duration-150 hover:border-border-strong active:cursor-grabbing',
        dragging ? 'scale-[0.98] opacity-40' : 'opacity-100',
      )}
    >
      {/* Parent line — the project this sits under, set quiet above the title. */}
      {showProject && (
        <div className="mb-1 flex items-center gap-1.5">
          <span className="min-w-0 flex-1 truncate font-ui text-[11px] text-text-4">{task.projectName}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            aria-label={`Delete ${task.title}`}
            className="flex size-5 shrink-0 items-center justify-center rounded-xs text-text-4 opacity-0 transition-opacity hover:bg-error/10 hover:text-error focus-visible:opacity-100 group-hover/card:opacity-100"
          >
            <Trash2 size={11} />
          </button>
        </div>
      )}

      <p className="font-ui text-[13.5px] font-medium leading-snug text-text-1">{task.title}</p>

      {/* Meta row: avatar first, then one pill per field. */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Avatar name={task.assigneeName} size="xs" />

        {task.dueDate && (
          <FieldPill icon={CalendarDays} className={overdue ? 'border-error/30 bg-error/10 text-error' : undefined} iconClassName={overdue ? 'text-error' : undefined}>
            {formatDate(task.dueDate).replace(/ \d{4}$/, '')}
          </FieldPill>
        )}

        <FieldPill icon={Flag} iconClassName={PRIORITY_FLAG[task.priority]}>
          {PRIORITY_LABELS[task.priority]}
        </FieldPill>

        {channel && ChannelIcon && (
          <FieldPill icon={ChannelIcon} iconClassName={channel.tint}>{channel.label}</FieldPill>
        )}

        {task.recurrence !== 'once' && <FieldPill icon={Repeat}>{RECURRENCE_LABEL[task.recurrence]}</FieldPill>}
        {task.description && <FieldPill icon={AlignLeft}>&nbsp;</FieldPill>}
      </div>

      {task.leadCompany && (
        <div className="mt-1.5">
          <FieldPill icon={Building2}>{task.leadCompany}</FieldPill>
        </div>
      )}

      {/* Progress — a bar and a percentage on every card, as on the reference board. */}
      <div className="mt-2.5 flex items-center gap-2">
        <span className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
          <span
            className={cn('block h-full rounded-full transition-[width] duration-200', progress === 100 ? 'bg-success' : 'bg-text-3')}
            style={{ width: `${progress}%` }}
          />
        </span>
        <span className="font-mono text-[10px] tabular-nums text-text-4">{progress}%</span>
      </div>

      {task.checklist.length > 0 && (
        <p className="mt-1.5 flex items-center gap-1.5 font-ui text-[11px] text-text-4">
          <ListChecks size={11} /> {doneCount}/{task.checklist.length} done
        </p>
      )}
    </article>
  )
}
