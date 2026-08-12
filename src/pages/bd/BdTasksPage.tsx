import { useMemo, useState } from 'react'
import { Search, LayoutList, Columns, SlidersHorizontal, Trash2, Plus, Lock } from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { DatePicker } from '../../components/ui/DatePicker'
import { Avatar } from '../../components/ui/Avatar'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { StatusChip } from '../../components/shared/StatusChip'
import { PriorityChip } from '../../components/shared/PriorityChip'
import { ChannelChip } from '../../components/shared/BdChips'
import { ViewToggle, type ViewToggleOption } from '../../components/ui/ViewToggle'
import { useToast } from '../../components/ui/toast-context'
import { CHANNEL_CONFIG, CHANNEL_ORDER } from '../../constants/bd'
import { useBd } from '../../context/BdPrototypeContext'
import { cn } from '../../lib/cn'
import { formatDate, isOverdue, STATUS_LABELS, PRIORITY_LABELS } from '../../lib/utils'
import { BD_REPS } from '../../data/bdMock'
import { BdTaskBoard } from './BdTaskBoard'
import { TaskDrawer } from './TaskDrawer'
import { randomUUID } from '../../lib/uuid'
import { BD_TASK_STATUSES, type BdTask, type Priority, type TaskStatus } from '../../types'

const PRIORITY_ORDER: Priority[] = ['critical', 'high', 'medium', 'low']
const PRIORITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }

const SORT_OPTIONS = [
  { value: 'recent', label: 'Newest' },
  { value: 'due_asc', label: 'Due date' },
  { value: 'priority', label: 'Priority' },
  { value: 'title', label: 'Title A–Z' },
]

/** Board and List only — the delivery board's third view is the time backlog. */
type TaskView = 'board' | 'table'

const TASK_VIEWS: ViewToggleOption<TaskView>[] = [
  { value: 'board', label: 'Board', icon: Columns },
  { value: 'table', label: 'List', icon: LayoutList },
]

function sortTasks(list: BdTask[], sort: string): BdTask[] {
  const arr = [...list]
  switch (sort) {
    case 'due_asc': arr.sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999')); break
    case 'priority': arr.sort((a, b) => (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9)); break
    case 'title': arr.sort((a, b) => a.title.localeCompare(b.title)); break
    default: break
  }
  return arr
}

export default function BdTasksPage() {
  const toast = useToast()
  const { tasks, projects, saveTask, deleteTask, viewerRepId, viewerName, canSeeAll } = useBd()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [channelFilter, setChannelFilter] = useState('')
  /**
   * Ownership scope. A rep without `can_manage_bd` is pinned to their own work:
   * the control is never rendered, and the filter below still forces
   * `viewerRepId`, so it is enforced rather than merely hidden.
   */
  const [assigneeFilter, setAssigneeFilter] = useState('me')
  const [dueFrom, setDueFrom] = useState('')
  const [dueTo, setDueTo] = useState('')
  const [sortBy, setSortBy] = useState('recent')
  const [showAdv, setShowAdv] = useState(false)
  const [view, setView] = useState<TaskView>('board')

  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<BdTask | null>(null)

  /**
   * Creating a task writes a blank record and opens the drawer on it — there is
   * no create form. Every field is editable in the panel, so a modal would only
   * be a second, divergent copy of the same controls.
   */
  const createTask = (status: TaskStatus = 'todo') => {
    const id = randomUUID()
    saveTask({
      id,
      title: 'New task',
      assigneeId: viewerRepId,
      assigneeName: viewerName,
      status,
      priority: 'medium',
      dueDate: null,
      projectId: projects[0]?.id ?? '',
      projectName: projects[0]?.name ?? '',
      recurrence: 'once',
      createdBy: viewerName,
      checklist: [],
    })
    setOpenTaskId(id)
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = tasks.filter((t) => {
      if (!canSeeAll) {
        if (t.assigneeId !== viewerRepId) return false
      } else if (assigneeFilter === 'me') {
        if (t.assigneeId !== viewerRepId) return false
      } else if (assigneeFilter && assigneeFilter !== 'all' && t.assigneeId !== assigneeFilter) {
        return false
      }
      return (
        (!q || t.title.toLowerCase().includes(q) || t.projectName.toLowerCase().includes(q) || (t.leadCompany ?? '').toLowerCase().includes(q)) &&
        (!statusFilter || t.status === statusFilter) &&
        (!priorityFilter || t.priority === priorityFilter) &&
        (!projectFilter || t.projectId === projectFilter) &&
        (!channelFilter || t.channel === channelFilter) &&
        (!dueFrom || (!!t.dueDate && t.dueDate >= dueFrom)) &&
        (!dueTo || (!!t.dueDate && t.dueDate <= dueTo))
      )
    })
    return sortTasks(list, sortBy)
  }, [
    tasks, search, statusFilter, priorityFilter, projectFilter, channelFilter,
    assigneeFilter, dueFrom, dueTo, sortBy, canSeeAll, viewerRepId,
  ])

  const statusOptions = [{ value: '', label: 'All statuses' }, ...BD_TASK_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))]
  const priorityOptions = [{ value: '', label: 'All priorities' }, ...PRIORITY_ORDER.map((p) => ({ value: p, label: PRIORITY_LABELS[p] }))]
  const projectOptions = [{ value: '', label: 'All projects' }, ...projects.map((p) => ({ value: p.id, label: p.name }))]
  const channelOptions = [{ value: '', label: 'All channels' }, ...CHANNEL_ORDER.map((c) => ({ value: c, label: CHANNEL_CONFIG[c].label }))]

  const openTask = openTaskId ? tasks.find((t) => t.id === openTaskId) ?? null : null

  return (
    <div className={cn('flex flex-1 flex-col', view === 'board' && 'min-h-0')}>
      <Topbar title="Tasks" />
      <div className={cn('flex flex-col gap-5 p-4 lg:px-8 lg:py-7', view === 'board' && 'min-h-0 flex-1')}>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-display text-[22px] font-bold text-text-1">Tasks</h2>
          <Button
            size="sm"
            className="ml-auto"
            iconLeft={<Plus size={15} />}
            onClick={() => createTask()}
          >
            New Task
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks…" iconLeft={<Search size={14} />} className="w-full sm:w-56" />
          <Select value={statusFilter} onChange={setStatusFilter} options={statusOptions} size="sm" />
          <Select value={priorityFilter} onChange={setPriorityFilter} options={priorityOptions} size="sm" />
          <Select value={projectFilter} onChange={setProjectFilter} options={projectOptions} size="sm" />
          <Select value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} size="sm" label="Sort" />
          <button
            onClick={() => setShowAdv((v) => !v)}
            className={cn('flex h-8 items-center gap-1.5 rounded-sm border px-2.5 font-ui text-[11.5px] transition-colors', showAdv || dueFrom || dueTo || channelFilter ? 'border-border-focus bg-surface-2 text-text-1' : 'border-border-default text-text-3 hover:text-text-1')}
          >
            <SlidersHorizontal size={13} /> Filters
          </button>
          <ViewToggle value={view} onChange={setView} options={TASK_VIEWS} className="ml-auto" />
        </div>

        {showAdv && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border-default bg-surface-1 p-2.5">
            <span className="self-center font-mono text-[10px] uppercase tracking-wider text-text-4">Due between</span>
            <DatePicker value={dueFrom} onChange={setDueFrom} placeholder="From" className="w-full sm:w-40" />
            <DatePicker value={dueTo} onChange={setDueTo} placeholder="To" minDate={dueFrom || undefined} className="w-full sm:w-40" />
            <Select value={channelFilter} onChange={setChannelFilter} options={channelOptions} size="sm" />
            {canSeeAll ? (
              <Select
                value={assigneeFilter}
                onChange={setAssigneeFilter}
                size="sm"
                options={[
                  { value: 'me', label: 'My tasks' },
                  { value: 'all', label: 'Whole team' },
                  ...BD_REPS.filter((r) => r.id !== viewerRepId).map((r) => ({ value: r.id, label: r.name })),
                ]}
              />
            ) : (
              // Not a disabled control — a rep has no team view to be denied.
              <span className="flex items-center gap-1.5 rounded-sm border border-border-subtle bg-surface-2 px-2.5 py-1.5 font-ui text-[12px] text-text-3">
                <Lock size={12} className="text-text-4" /> {viewerName}
              </span>
            )}
            {(dueFrom || dueTo || channelFilter) && (
              <button onClick={() => { setDueFrom(''); setDueTo(''); setChannelFilter('') }} className="h-8 rounded-sm px-2.5 text-[11.5px] text-text-3 transition-colors hover:text-error">Clear</button>
            )}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="py-16 text-center font-ui text-[13px] text-text-4">No tasks match your filters.</div>
        ) : view === 'board' ? (
          <BdTaskBoard tasks={filtered} onOpenTask={setOpenTaskId} onAddTask={createTask} showProject />
        ) : (
          <div className="overflow-x-auto rounded-md border border-border-default bg-surface-1">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-border-default font-mono text-[10.5px] uppercase tracking-wider text-text-4">
                  <th className="px-4 py-2.5 font-medium">Task</th>
                  <th className="px-4 py-2.5 font-medium">Project</th>
                  <th className="px-4 py-2.5 font-medium">Priority</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Due</th>
                  <th className="px-4 py-2.5 font-medium">Assignee</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} onClick={() => setOpenTaskId(t.id)} className="cursor-pointer border-b border-border-subtle last:border-0 hover:bg-surface-2/50">
                    <td className="px-4 py-3 font-ui text-[13px] text-text-1">{t.title}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {t.channel && <ChannelChip channel={t.channel} compact />}
                        <span className="max-w-[160px] truncate font-ui text-[12px] text-text-3">{t.projectName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><PriorityChip priority={t.priority} /></td>
                    <td className="px-4 py-3"><StatusChip status={t.status} /></td>
                    <td className="px-4 py-3">
                      {t.dueDate
                        ? <span className={cn('font-mono text-[12px]', isOverdue(t.dueDate) && t.status !== 'completed' && t.status !== 'approved' ? 'text-error' : 'text-text-3')}>{formatDate(t.dueDate)}</span>
                        : <span className="text-[12px] text-text-4">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2">
                        <Avatar name={t.assigneeName} size="xs" />
                        <span className="font-ui text-[12px] text-text-2">{t.assigneeName}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); setPendingDelete(t) }}
                        className="inline-flex size-7 items-center justify-center rounded-sm text-text-3 hover:bg-error/10 hover:text-error"
                        aria-label={`Delete ${t.title}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <TaskDrawer task={openTask} onClose={() => setOpenTaskId(null)} />

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
