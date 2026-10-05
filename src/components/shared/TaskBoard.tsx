import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertCircle, Archive, Ban, BadgeCheck, Circle, CircleCheck, CircleDashed, CircleDot, Eye,
  CornerUpRight, GitBranch, Layers, MessageSquare, MoreHorizontal, Paperclip, Timer, Trash2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Avatar, AvatarGroup } from '../ui/Avatar'
import { PriorityChip } from './PriorityChip'
import { ServiceChip } from './ServiceChip'
import { useDeleteTask, useReorderBoardTasks } from '../../hooks/useTasks'
import { useDragScroll } from '../../hooks/useDragScroll'
import { useToast } from '../ui/toast-context'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { Popover } from '../ui/Popover'
import { MoveTaskModal } from './MoveTaskModal'
import { useCanAccess } from '../../hooks/useRoleFlags'
import { ProgressBar } from '../ui/ProgressBar'
import { isOverdue, formatStamp } from '../../lib/utils'
import { formatEstimate } from '../../lib/duration'
import { BLOCKED_STATUS, type BlockDetails, type TaskListItem } from '../../api/tasks'
import { BlockTaskDialog } from './BlockTaskDialog'
import { useTaskStatuses } from '../../hooks/useTaskStatuses'
import type { TaskStatusRow } from '../../api/taskStatuses'

interface Column {
  status: string
  label: string
  /** Arbitrary hex from the statuses screen, so the tints are built at runtime. */
  color: string
  /** Moving a card here needs can_approve_tasks. */
  isSignoff: boolean
  /** Moving a card here notifies the task's reviewers. */
  isReview: boolean
  /** Header glyph — read off the column's meaning, never stored. */
  icon: LucideIcon
}

/**
 * The glyph that sits in front of a column's name, ClickUp style.
 *
 * Read from the column rather than stored on it: the key is matched first
 * because it is what an admin actually named the thing, and the flags catch
 * anything renamed or invented on the Statuses screen. A column nobody's
 * pattern matches still gets a shape, so a new one never renders headerless.
 */
function iconFor(s: TaskStatusRow): LucideIcon {
  const key = s.key.toLowerCase()
  if (/block|stuck|hold/.test(key)) return Ban
  if (/backlog|icebox|parked|idea/.test(key)) return Archive
  if (/approv|sign_?off/.test(key)) return BadgeCheck
  if (/complete|done|shipped|closed/.test(key)) return CircleCheck
  if (/review|qa|check|test/.test(key)) return Eye
  if (/progress|doing|active|wip|started/.test(key)) return CircleDashed
  if (/todo|to_?do|open|new|queued|ready/.test(key)) return Circle
  if (s.is_review) return Eye
  if (s.is_signoff) return BadgeCheck
  if (s.is_done) return CircleCheck
  if (s.is_default) return Circle
  return CircleDot
}

/**
 * The columns, built from the statuses table.
 *
 * They used to be a hard-coded array here, which meant a status could not be
 * added, renamed or reordered without a deploy, and the review column was
 * whichever one happened to be called "review". Everything visual now derives
 * from the row's own colour, so a new column looks like it belongs without
 * anyone picking Tailwind classes for it.
 *
 * The tints are built inline because the colour is arbitrary hex chosen by an
 * admin at runtime, which is the one case the styling rules allow for.
 */
function columnsFrom(statuses: TaskStatusRow[]): Column[] {
  return statuses.map((s) => ({
    status: s.key,
    label: s.label,
    color: s.color,
    isSignoff: s.is_signoff,
    isReview: s.is_review,
    icon: iconFor(s),
  }))
}

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
    <span className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-error/30 bg-error/10 px-2 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-wider text-error">
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

/** A drop worked out but not yet written: the card, its column, and the lane it lands in. */
interface PlannedDrop {
  task: TaskListItem
  status: string
  next: TaskListItem[]
  changingColumn: boolean
}

interface TaskBoardProps {
  tasks: TaskListItem[]
  onOpenTask: (id: string) => void
  showProject?: boolean
}

export function TaskBoard({ tasks, onOpenTask, showProject }: TaskBoardProps) {
  const toast = useToast()
  const reorderBoard = useReorderBoardTasks()
  const deleteTask = useDeleteTask()
  const [dragId, setDragId] = useState<string | null>(null)
  /**
   * Where the card would land: which column, and which slot within it.
   *
   * A column alone was enough while a drop could only change status. Dragging
   * within a lane needs the slot too, and it is measured against the lane with
   * the dragged card already taken out — so the index maps straight onto the
   * position it will be written with.
   */
  const [dropAt, setDropAt] = useState<{ status: string; index: number } | null>(null)
  /** New positions held locally until the write lands, so the board never snaps back. */
  const [orderOverride, setOrderOverride] = useState<Record<string, number>>({})
  const { data: statuses = [] } = useTaskStatuses()
  const columns = useMemo(() => columnsFrom(statuses), [statuses])
  const [pendingDelete, setPendingDelete] = useState<TaskListItem | null>(null)
  const [pendingMove, setPendingMove] = useState<TaskListItem | null>(null)
  /** A drop into Blocked, held until the reason is given. */
  const [pendingBlock, setPendingBlock] = useState<PlannedDrop | null>(null)
  const canMoveTask = useCanAccess('can_manage_projects')
  const canSignOff = useCanAccess('can_approve_tasks')
  const boardRef = useDragScroll<HTMLDivElement>()
  // Optimistic status overrides so a dropped card moves instantly (no refetch flicker).
  const [optimistic, setOptimistic] = useState<Record<string, string>>({})

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

  const statusOf = (t: TaskListItem): string => optimistic[t.id] ?? t.status

  /** A card's position, preferring the one a drag has just given it. */
  const positionOf = (t: TaskListItem) => orderOverride[t.id] ?? t.board_order ?? 0

  /**
   * A column's cards in board order. Sorted rather than taken as they come: the
   * query orders by board_order then newest-first, and a local override has to
   * be able to win over both without refetching.
   */
  const laneFor = (status: string) =>
    tasks.filter((t) => statusOf(t) === status).slice().sort((a, b) => positionOf(a) - positionOf(b))

  /**
   * Where each card's midpoint sits, measured once when a drag starts.
   *
   * Hit-testing live rects does not work here: proposing a slot reorders the
   * lane, the reorder animates, and the next pointer event measures cards that
   * are still moving — so the answer feeds back into its own input and the card
   * sticks or flickers instead of travelling. Dragging one up several places was
   * where it showed worst.
   *
   * These positions describe the lane WITHOUT the dragged card, in the order it
   * had before anything moved, which is exactly the basis a drop index is
   * defined against. It cannot go stale mid-drag because it does not depend on
   * what the preview is doing.
   *
   * Offsets are in the lane's own scroll space, so scrolling a column
   * mid-drag stays correct.
   */
  const laneGeometry = useRef<Map<string, { id: string; mid: number }[]>>(new Map())
  const laneRefs = useRef<Map<string, HTMLDivElement | null>>(new Map())

  const measureLanes = (draggedId: string) => {
    const measured = new Map<string, { id: string; mid: number }[]>()

    for (const [status, container] of laneRefs.current) {
      if (!container) continue
      const children = Array.from(container.children) as HTMLElement[]

      /**
       * The container's content origin in viewport terms, so a card's position
       * can be expressed the same way the pointer is read later.
       *
       * Measured, not taken from offsetTop: offsetTop is relative to the nearest
       * POSITIONED ancestor, and this lane is not positioned — so those numbers
       * carried the column's header and padding with them while the pointer was
       * read from the lane's own top. A constant offset between the two biased
       * every hit test upward, which is why dragging up landed and dragging down
       * fell short. Nothing is animating at drag start, so rects are exact here.
       */
      const originTop = container.getBoundingClientRect().top - container.scrollTop
      const topOf = (el: HTMLElement) => el.getBoundingClientRect().top - originTop

      /**
       * The gap the lane puts between cards, read from the lane rather than
       * hard-coded, so restyling the spacing cannot quietly skew the maths.
       */
      const gap = children.length > 1
        ? Math.max(0, topOf(children[1]) - (topOf(children[0]) + children[0].offsetHeight))
        : 0

      /**
       * The hole the dragged card leaves behind.
       *
       * It is measured while still sitting in its slot, so every card BELOW it
       * is currently a card-height lower than it will be once the card lifts
       * out. Cards above it do not move at all — which is exactly why dragging
       * up worked and dragging down was consistently one card short.
       */
      const dragged = children.find((el) => el.dataset.taskId === draggedId)
      const closesUpBelow = dragged ? dragged.offsetHeight + gap : 0

      const draggedTop = dragged ? topOf(dragged) : 0
      const cards: { id: string; mid: number }[] = []
      for (const el of children) {
        const id = el.dataset.taskId
        if (!id || id === draggedId) continue
        const below = dragged ? topOf(el) > draggedTop : false
        const top = topOf(el) - (below ? closesUpBelow : 0)
        cards.push({ id, mid: top + el.offsetHeight / 2 })
      }
      measured.set(status, cards)
    }

    laneGeometry.current = measured
  }

  /** The slot the pointer is currently over, against the measurements above. */
  const slotAt = (status: string, container: HTMLDivElement, clientY: number) => {
    const y = clientY - container.getBoundingClientRect().top + container.scrollTop
    const cards = laneGeometry.current.get(status) ?? []
    const index = cards.findIndex((c) => y < c.mid)
    return index === -1 ? cards.length : index
  }

  const endDrag = () => { setDragId(null); setDropAt(null); laneGeometry.current = new Map() }

  /**
   * A column's cards as they would stand if the drag ended now — the dragged
   * card already sitting in its slot, everything else shuffled around it.
   *
   * This is what gets rendered, so the reorder IS the preview: cards move aside
   * to open the gap rather than a line being drawn to describe one. The dragged
   * card is never taken out of the DOM, which is what made it vanish under its
   * neighbour before — removing the element being dragged breaks the drag the
   * browser is running.
   */
  const laneWithPreview = (status: string): TaskListItem[] => {
    const dragged = dragId ? tasks.find((t) => t.id === dragId) ?? null : null
    // Not over any column yet: nothing has been proposed, so nothing moves.
    if (!dragged || !dropAt) return laneFor(status)

    const rest = laneFor(status).filter((t) => t.id !== dragId)
    if (dropAt.status !== status) return rest

    const at = Math.min(dropAt.index, rest.length)
    return [...rest.slice(0, at), dragged, ...rest.slice(at)]
  }

  const handleDrop = (col: Column) => {
    const id = dragId
    const at = dropAt
    endDrag()
    if (!id) return
    if (col.isSignoff && !canSignOff) {
      toast('Only a project manager or team lead can mark a task approved or completed', 'error')
      return
    }
    const task = tasks.find((t) => t.id === id)
    if (!task) return

    const changingColumn = statusOf(task) !== col.status
    const before = laneFor(col.status)
    // The lane without the dragged card, which is what the drop index counts against.
    const lane = before.filter((t) => t.id !== id)
    const index = at?.status === col.status ? Math.min(at.index, lane.length) : lane.length
    const next = [...lane.slice(0, index), task, ...lane.slice(index)]

    // Dropped back exactly where it came from.
    if (!changingColumn && before.findIndex((t) => t.id === id) === index) return

    const drop = { task, status: col.status, next, changingColumn }
    // Blocked has to say why, so the card stays where it was until it does.
    if (changingColumn && col.status === BLOCKED_STATUS) { setPendingBlock(drop); return }
    commitDrop(drop)
  }

  const commitDrop = ({ task, status, next, changingColumn }: PlannedDrop, block?: BlockDetails) => {
    const id = task.id
    // Only the rows that actually shifted — dropping near the end of a long lane
    // should write two rows, not thirty.
    const positions = next.flatMap((t, i) =>
      t.id !== id && positionOf(t) === i ? [] : [{ id: t.id, boardOrder: i }],
    )

    const previousOrder = orderOverride
    setOrderOverride((o) => ({ ...o, ...Object.fromEntries(next.map((t, i) => [t.id, i])) }))
    if (changingColumn) setOptimistic((o) => ({ ...o, [id]: status }))

    reorderBoard.mutate(
      {
        positions,
        moved: changingColumn ? { id, status, block } : undefined,
        projectId: task.project_id,
      },
      {
        onError: (e) => {
          setOrderOverride(previousOrder)
          if (changingColumn) setOptimistic((o) => { const n = { ...o }; delete n[id]; return n })
          toast(e instanceof Error ? e.message : 'Could not move task', 'error')
        },
      },
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
      {columns.map((col) => {
        const items = laneFor(col.status)
        const lane = laneWithPreview(col.status)
        return (
          <div
            key={col.status}
            // The column's own fallback: anywhere that is not over a card means
            // the end of the lane. Cards stop propagation so their slot wins.
            onDragOver={(e) => {
              e.preventDefault()
              if (col.isSignoff && !canSignOff) return
              setDropAt({ status: col.status, index: lane.filter((t) => t.id !== dragId).length })
            }}
            // Only when the pointer has actually left the column. dragleave also
            // fires as it crosses into the column's own children, and clearing
            // the proposal there makes the preview flicker on every card it
            // passes over.
            onDragLeave={(e) => {
              const to = e.relatedTarget
              if (to instanceof Node && e.currentTarget.contains(to)) return
              setDropAt((c) => (c?.status === col.status ? null : c))
            }}
            onDrop={() => handleDrop(col)}
            className={cn(
              'flex h-full snap-start flex-col overflow-hidden rounded-lg border p-2.5 transition-colors',
              // Near-full width on a phone so cards stay readable, then a roomy
              // fixed lane. Seven columns will not fit a laptop, so the board
              // scrolls sideways rather than squeezing every card thin — which
              // is why the lane is sized for the card rather than the viewport.
              'w-[86vw] shrink-0 sm:w-100 lg:w-auto lg:min-w-100 lg:flex-1',
              dropAt?.status === col.status ? 'bg-surface-2/40' : 'border-border-default bg-surface-1/60',
            )}
            style={dropAt?.status === col.status ? { borderColor: col.color } : undefined}
          >
            {/* Coloured, iconed header — the column's identity, ClickUp style.
                The bar above it repeats the colour at full strength so a lane is
                identifiable from the edge of the screen, where the tinted panel
                alone is too faint to tell two columns apart. */}
            <div className="mb-2 shrink-0 overflow-hidden rounded-md border" style={{ borderColor: `${col.color}4D` }}>
              <div className="h-0.75 w-full" style={{ background: col.color }} aria-hidden />
              <div
                className="flex items-center gap-2 px-2.5 py-2"
                style={{ background: `${col.color}1F`, color: col.color }}
                title={col.isReview ? 'Reviewers are notified when a task lands here' : undefined}
              >
                <col.icon size={14} className="shrink-0" aria-hidden />
                <span className="min-w-0 flex-1 truncate font-ui text-[11.5px] font-bold uppercase tracking-wider">
                  {col.label}
                </span>
                {col.isReview && (
                  <Eye size={12} className="shrink-0 opacity-70" aria-label="Reviewers are notified here" />
                )}
                <span
                  className="shrink-0 rounded-sm px-1.5 py-0.5 font-mono text-[11px] font-bold tabular-nums"
                  style={{ background: `${col.color}26` }}
                >
                  {items.length}
                </span>
              </div>
            </div>
            {/* overscroll-y-contain, not overscroll-contain: the vertical axis
                must not chain to the page when a column bottoms out, but the
                horizontal axis has to reach the board — otherwise a sideways
                gesture over a column scrolls nothing at all. */}
            <div
              ref={(el) => { laneRefs.current.set(col.status, el) }}
              // One handler for the whole lane rather than one per card: the
              // pointer's position against the measurements taken at drag start
              // is the whole answer, and no card has to be asked about itself.
              onDragOver={(e) => {
                if (!dragId) return
                e.preventDefault()
                e.stopPropagation()
                if (col.isSignoff && !canSignOff) return
                setDropAt({ status: col.status, index: slotAt(col.status, e.currentTarget, e.clientY) })
              }}
              className="flex-1 space-y-2 min-h-2 overflow-y-auto overscroll-y-contain">
              {lane.map((t) => (
                <motion.div
                  key={t.id}
                  // layout: when the lane reorders under the cursor, every card
                  // slides to its new place instead of jumping there. This is the
                  // whole of "the cards move out of the way".
                  layout
                  // A tween, not a spring: no overshoot to settle out of, so a
                  // card that has to travel several places arrives cleanly
                  // instead of wobbling into its slot behind the cursor.
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  draggable
                  data-no-pan
                  data-task-id={t.id}
                  onDragStart={() => { measureLanes(t.id); setDragId(t.id) }}
                  onDragEnd={endDrag}
                  onClick={() => onOpenTask(t.id)}
                  className={cn(
                    'group/card bg-surface-1 border border-border-default rounded-md p-3 cursor-grab active:cursor-grabbing hover:border-border-strong transition-[opacity,border-color] duration-150',
                    // Dimmed in its proposed slot, so it reads as the card in
                    // flight rather than one already dropped there.
                    dragId === t.id && 'opacity-50',
                  )}
                >
                  {/* Floated together so the pill and the delete button share a
                      line and the title text wraps around them. */}
                  <div className="float-right -mr-1 -mt-0.5 ml-1.5 flex items-center gap-1.5">
                    {!!t.due_date && isOverdue(t.due_date) && statusOf(t) !== 'completed' && <OverduePill />}
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
                        <span className="inline-flex max-w-full items-center gap-1 rounded-sm border border-border-subtle bg-surface-2 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-text-3">
                          <Layers size={9} className="shrink-0 text-text-4" />
                          <span className="truncate">{t.stage.name}</span>
                        </span>
                      )}
                    </div>
                  )}
                  <p className="font-ui font-medium text-body-sm/snug text-text-1">{t.title}</p>
                  {t.description && (
                    <p className="mt-1 line-clamp-2 font-ui text-[11.5px]/snug text-text-4">{t.description}</p>
                  )}
                  {statusOf(t) === BLOCKED_STATUS && t.blocked_reason && (
                    <p className="mt-1.5 flex items-start gap-1.5 font-ui text-[11.5px]/snug text-error" title={t.blocked_reason}>
                      <Ban size={11} className="mt-0.5 shrink-0" aria-label="Blocked on" />
                      <span className="line-clamp-2">{t.blocked_reason}</span>
                    </p>
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
                </motion.div>
              ))}
              {lane.length === 0 && <p className="text-center text-[11px] text-text-4 py-4">Empty</p>}
            </div>
          </div>
        )
      })}

      <BlockTaskDialog
        open={!!pendingBlock}
        taskTitle={pendingBlock?.task.title ?? ''}
        isPending={false}
        onConfirm={(block) => {
          if (pendingBlock) commitDrop(pendingBlock, block)
          setPendingBlock(null)
        }}
        onClose={() => setPendingBlock(null)}
      />
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
            <strong className="text-text-1">{pendingDelete?.title}</strong> will be permanently deleted,
            along with its comments, attachments, subtasks and logged time. This cannot be undone.
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
