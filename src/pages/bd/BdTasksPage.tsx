import { useMemo, useState } from 'react'
import {
  Plus, Search, Columns3, List, CheckCircle2, AlertTriangle, Repeat, Building2, Lock,
} from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Avatar } from '../../components/ui/Avatar'
import { ViewToggle, type ViewToggleOption } from '../../components/ui/ViewToggle'
import { useToast } from '../../components/ui/toast-context'
import { BdKpiTile } from '../../components/shared/BdKpiTile'
import { ChannelChip } from '../../components/shared/BdChips'
import { TASK_STATUS_CONFIG, TASK_STATUS_ORDER, TASK_PRIORITY_CONFIG } from '../../constants/bd'
import { useBd } from '../../context/BdPrototypeContext'
import { useDragScroll } from '../../hooks/useDragScroll'
import { cn } from '../../lib/cn'
import { formatDate, getDaysUntil } from '../../lib/utils'
import { BD_REPS } from '../../data/bdMock'
import { TaskFormModal } from './TaskFormModal'
import { TaskDrawer } from './TaskDrawer'
import type { BdTask, BdTaskStatus } from '../../types'

type TaskView = 'board' | 'list'

const VIEWS: ViewToggleOption<TaskView>[] = [
  { value: 'board', label: 'Board', icon: Columns3 },
  { value: 'list', label: 'List', icon: List },
]

const PRIORITY_FILTER = [
  { value: 'all', label: 'Any priority' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

export default function BdTasksPage() {
  const toast = useToast()
  const { tasks, moveTaskStatus, viewerRepId, viewerName, canSeeAll } = useBd()

  const [view, setView] = useState<TaskView>('board')
  const [search, setSearch] = useState('')
  const [priority, setPriority] = useState('all')
  /**
   * Who the board is showing. A rep without `can_manage_bd` is pinned to their
   * own work — the control is not rendered at all, and the filter below still
   * forces `viewerRepId`, so it is not merely hidden.
   */
  const [assignee, setAssignee] = useState('me')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<BdTask | null>(null)
  const [formStatus, setFormStatus] = useState<BdTaskStatus>('todo')
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)

  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<BdTaskStatus | null>(null)
  const boardRef = useDragScroll<HTMLDivElement>()

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tasks.filter((t) => {
      // Ownership scope first — a rep can never widen it.
      if (!canSeeAll) {
        if (t.assigneeId !== viewerRepId) return false
      } else if (assignee === 'me') {
        if (t.assigneeId !== viewerRepId) return false
      } else if (assignee !== 'all' && t.assigneeId !== assignee) {
        return false
      }
      if (priority !== 'all' && t.priority !== priority) return false
      if (!q) return true
      return (
        t.title.toLowerCase().includes(q) ||
        (t.leadCompany ?? '').toLowerCase().includes(q)
      )
    })
  }, [tasks, search, priority, assignee, canSeeAll, viewerRepId])

  const stats = useMemo(() => {
    const open = visible.filter((t) => t.status !== 'done')
    return {
      open: open.length,
      overdue: open.filter((t) => t.dueDate && getDaysUntil(t.dueDate) < 0).length,
      dueToday: open.filter((t) => t.dueDate && getDaysUntil(t.dueDate) === 0).length,
      done: visible.filter((t) => t.status === 'done').length,
    }
  }, [visible])

  const openTask = openTaskId ? tasks.find((t) => t.id === openTaskId) ?? null : null

  const handleDrop = (status: BdTaskStatus) => {
    setDragOver(null)
    const id = dragId
    setDragId(null)
    if (!id) return
    const task = tasks.find((t) => t.id === id)
    if (!task || task.status === status) return
    moveTaskStatus(id, status)
    toast(`Moved to ${TASK_STATUS_CONFIG[status].label}`, 'success')
  }

  const newTask = (status: BdTaskStatus = 'todo') => {
    setEditing(null)
    setFormStatus(status)
    setFormOpen(true)
  }

  return (
    <div className="flex flex-1 flex-col">
      <Topbar title="Tasks" />
      <div className="flex flex-col gap-6 p-4 lg:px-8 lg:py-7">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h2 className="font-display text-[22px] font-bold text-text-1">Tasks</h2>
            <p className="font-ui text-[13px] text-text-3">
              {canSeeAll
                ? 'Outreach quotas, follow-ups and proposal prep across the department'
                : 'Your outreach quotas, follow-ups and proposal prep'}
            </p>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks…"
              iconLeft={<Search size={14} />}
              className="w-full sm:w-48"
            />
            <Select value={priority} onChange={setPriority} options={PRIORITY_FILTER} size="sm" className="w-36" />
            {canSeeAll ? (
              <Select
                value={assignee}
                onChange={setAssignee}
                size="sm"
                className="w-40"
                options={[
                  { value: 'me', label: 'My tasks' },
                  { value: 'all', label: 'Whole team' },
                  ...BD_REPS.filter((r) => r.id !== viewerRepId).map((r) => ({ value: r.id, label: r.name })),
                ]}
              />
            ) : (
              // Not a disabled control — a rep has no team view to be denied.
              <span className="flex items-center gap-1.5 rounded-sm border border-border-subtle bg-surface-2 px-2.5 py-1.5 font-ui text-[12px] text-text-3">
                <Lock size={12} className="text-text-4" />
                {viewerName}
              </span>
            )}
            <ViewToggle value={view} onChange={setView} options={VIEWS} className="hidden lg:flex" />
            <Button size="sm" iconLeft={<Plus size={15} />} onClick={() => newTask()}>New Task</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <BdKpiTile icon={List} label="Open" value={`${stats.open}`} unit="tasks" />
          <BdKpiTile
            icon={AlertTriangle}
            label="Overdue"
            value={`${stats.overdue}`}
            tone={stats.overdue > 0 ? 'error' : 'default'}
          />
          <BdKpiTile
            icon={Repeat}
            label="Due today"
            value={`${stats.dueToday}`}
            tone={stats.dueToday > 0 ? 'warning' : 'default'}
          />
          <BdKpiTile icon={CheckCircle2} label="Completed" value={`${stats.done}`} tone="success" />
        </div>

        {view === 'board' ? (
          <div ref={boardRef} className="flex gap-3 overflow-x-auto pb-3 no-scrollbar">
            {TASK_STATUS_ORDER.map((status) => {
              const config = TASK_STATUS_CONFIG[status]
              const items = visible.filter((t) => t.status === status)
              const Icon = config.icon
              return (
                <section
                  key={status}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(status) }}
                  onDragLeave={() => setDragOver((c) => (c === status ? null : c))}
                  onDrop={() => handleDrop(status)}
                  className={cn(
                    'flex w-[86vw] shrink-0 flex-col gap-2.5 rounded-lg border p-2.5 transition-colors duration-150',
                    'sm:w-80 lg:w-auto lg:min-w-72 lg:flex-1',
                    dragOver === status ? cn(config.dropBorder, 'bg-surface-2/40') : 'border-border-default bg-surface-1/50',
                  )}
                >
                  <header className={cn('flex items-center gap-2 rounded-md border px-2.5 py-2', config.accent)}>
                    <Icon size={14} className="shrink-0" />
                    <span className="min-w-0 flex-1 truncate font-ui text-[11.5px] font-bold uppercase tracking-wider">
                      {config.label}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] font-bold tabular-nums">{items.length}</span>
                  </header>

                  <div className="flex flex-col gap-2">
                    {items.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        dragging={dragId === task.id}
                        onDragStart={() => setDragId(task.id)}
                        onDragEnd={() => { setDragId(null); setDragOver(null) }}
                        onClick={() => setOpenTaskId(task.id)}
                      />
                    ))}

                    <button
                      onClick={() => newTask(status)}
                      className={cn(
                        'flex items-center justify-center gap-1.5 rounded-md border border-dashed border-border-subtle py-2.5',
                        'font-ui text-[12px] text-text-4 transition-colors hover:border-border-strong hover:text-text-2',
                      )}
                    >
                      <Plus size={13} /> Add task
                    </button>
                  </div>
                </section>
              )
            })}
          </div>
        ) : (
          <TaskList tasks={visible} onOpen={setOpenTaskId} />
        )}

        {visible.length === 0 && view === 'list' && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-text-3">
              <CheckCircle2 size={22} />
            </span>
            <p className="font-ui text-[14px] text-text-2">Nothing on your board</p>
            <p className="max-w-[42ch] font-ui text-[12.5px]/relaxed text-text-4">
              Tasks track the work behind the pipeline — outreach quotas, follow-ups, proposal prep. Link one to a lead
              and it shows on that lead's record too.
            </p>
            <Button size="sm" variant="secondary" iconLeft={<Plus size={15} />} onClick={() => newTask()}>
              Create the first task
            </Button>
          </div>
        )}
      </div>

      {formOpen && (
        <TaskFormModal
          key={editing?.id ?? 'new'}
          open
          task={editing}
          defaultStatus={formStatus}
          onClose={() => { setFormOpen(false); setEditing(null) }}
        />
      )}

      <TaskDrawer
        task={openTask}
        onClose={() => setOpenTaskId(null)}
        onEdit={(t) => { setOpenTaskId(null); setEditing(t); setFormOpen(true) }}
      />
    </div>
  )
}

interface TaskCardProps {
  task: BdTask
  dragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onClick: () => void
}

function TaskCard({ task, dragging, onDragStart, onDragEnd, onClick }: TaskCardProps) {
  const overdue = task.dueDate && task.status !== 'done' && getDaysUntil(task.dueDate) < 0
  const dueToday = task.dueDate && getDaysUntil(task.dueDate) === 0
  const priority = TASK_PRIORITY_CONFIG[task.priority]
  const doneCount = task.checklist.filter((c) => c.done).length

  return (
    <article
      draggable
      data-no-pan
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        'cursor-grab rounded-md border border-border-default bg-surface-1 p-3 active:cursor-grabbing',
        'transition-[transform,opacity,border-color] duration-150 hover:border-border-strong',
        dragging ? 'scale-[0.98] opacity-40' : 'opacity-100',
      )}
    >
      <div className="mb-2 flex items-start gap-2">
        <span className={cn('mt-1.5 size-1.5 shrink-0 rounded-full', priority.dot)} title={`${priority.label} priority`} />
        <p
          className={cn(
            'min-w-0 flex-1 font-ui text-body-sm/snug font-medium',
            task.status === 'done' ? 'text-text-3 line-through' : 'text-text-1',
          )}
        >
          {task.title}
        </p>
      </div>

      {task.leadCompany && (
        <p className="mb-2 flex items-center gap-1.5 font-ui text-[11px] text-text-4">
          <Building2 size={10} className="shrink-0" />
          <span className="truncate">{task.leadCompany}</span>
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 border-t border-border-subtle pt-2.5">
        {task.dueDate && (
          <span
            className={cn(
              'font-mono text-[10.5px]',
              overdue ? 'text-error' : dueToday ? 'text-warning' : 'text-text-4',
            )}
          >
            {overdue ? 'Overdue · ' : dueToday ? 'Today' : formatDate(task.dueDate)}
            {overdue && formatDate(task.dueDate)}
          </span>
        )}
        {task.checklist.length > 0 && (
          <span className="font-mono text-[10.5px] text-text-4">
            {doneCount}/{task.checklist.length}
          </span>
        )}
        {task.recurrence !== 'once' && <Repeat size={10} className="text-text-4" />}
        {task.channel && <ChannelChip channel={task.channel} compact />}
        <Avatar name={task.assigneeName} size="xs" className="ml-auto" />
      </div>
    </article>
  )
}

const COLS = 'grid grid-cols-[minmax(0,2.2fr)_130px_110px_100px_minmax(0,1fr)] items-center gap-3'

function TaskList({ tasks, onOpen }: { tasks: BdTask[]; onOpen: (id: string) => void }) {
  if (tasks.length === 0) return null

  return (
    <div className="overflow-hidden rounded-lg border border-border-default bg-surface-1">
      <div
        className={cn(
          COLS,
          'border-b border-border-subtle bg-surface-2 px-4 py-2.5 font-ui text-[11px] font-semibold uppercase tracking-widest text-text-3',
        )}
      >
        <span>Task</span>
        <span>Status</span>
        <span>Priority</span>
        <span>Due</span>
        <span>Assignee</span>
      </div>
      {tasks.map((task) => {
        const status = TASK_STATUS_CONFIG[task.status]
        const priority = TASK_PRIORITY_CONFIG[task.priority]
        const overdue = task.dueDate && task.status !== 'done' && getDaysUntil(task.dueDate) < 0
        return (
          <button
            key={task.id}
            onClick={() => onOpen(task.id)}
            className={cn(COLS, 'w-full border-b border-border-subtle px-4 py-3 text-left transition-colors last:border-0 hover:bg-surface-2/50')}
          >
            <span className="min-w-0">
              <span className={cn('block truncate font-ui text-[13px]', task.status === 'done' ? 'text-text-3 line-through' : 'text-text-1')}>
                {task.title}
              </span>
              {task.leadCompany && (
                <span className="block truncate font-ui text-[11.5px] text-text-4">{task.leadCompany}</span>
              )}
            </span>
            <span
              className={cn(
                'inline-flex w-fit items-center gap-1.5 rounded-full border px-2 py-0.5 font-ui text-[10px] font-semibold uppercase tracking-[0.04em]',
                status.accent,
              )}
            >
              {status.label}
            </span>
            <span
              className={cn(
                'inline-flex w-fit items-center rounded-full border px-2 py-0.5 font-ui text-[10px] font-semibold uppercase tracking-[0.04em]',
                priority.classes,
              )}
            >
              {priority.label}
            </span>
            <span className={cn('font-mono text-[11.5px]', overdue ? 'text-error' : 'text-text-3')}>
              {task.dueDate ? formatDate(task.dueDate) : '—'}
            </span>
            <span className="flex min-w-0 items-center gap-2">
              <Avatar name={task.assigneeName} size="xs" />
              <span className="truncate font-ui text-[12.5px] text-text-2">{task.assigneeName}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
