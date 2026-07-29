import { useMemo, useState } from 'react'
import { Search, Plus, CheckSquare, ListTodo, AlertOctagon, Clock, LayoutList, Columns, SlidersHorizontal, Trash2 } from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { DatePicker } from '../../components/ui/DatePicker'
import { usePeople } from '../../hooks/usePeople'
import { Avatar, AvatarGroup } from '../../components/ui/Avatar'
import { PersonLink } from '../../components/shared/PersonLink'
import { Skeleton } from '../../components/ui/Skeleton'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { ServiceChip } from '../../components/shared/ServiceChip'
import { StatusChip } from '../../components/shared/StatusChip'
import { PriorityChip } from '../../components/shared/PriorityChip'
import { cn } from '../../lib/cn'
import { formatDate, isOverdue, STATUS_LABELS, PRIORITY_LABELS } from '../../lib/utils'
import { useDeleteTask, useTaskDeleteImpact, useTasks } from '../../hooks/useTasks'
import { useServices } from '../../hooks/useServices'
import { useToast } from '../../components/ui/toast-context'
import { TaskBoard } from '../../components/shared/TaskBoard'
import { TaskFormModal } from './TaskFormModal'
import { TaskDetailDrawer } from './TaskDetailDrawer'
import type { Priority, TaskStatus } from '../../types'
import type { TaskListItem } from '../../api/tasks'

const STATUS_ORDER: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'review', 'approved', 'completed', 'blocked']
const PRIORITY_ORDER: Priority[] = ['critical', 'high', 'medium', 'low']
const PRIORITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
const SORT_OPTIONS = [
  { value: 'recent', label: 'Newest' },
  { value: 'due_asc', label: 'Due date' },
  { value: 'priority', label: 'Priority' },
  { value: 'title', label: 'Title A–Z' },
]

function sortTasks(list: TaskListItem[], sort: string): TaskListItem[] {
  const arr = [...list]
  switch (sort) {
    case 'due_asc': arr.sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999')); break
    case 'priority': arr.sort((a, b) => (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9)); break
    case 'title': arr.sort((a, b) => a.title.localeCompare(b.title)); break
    default: break
  }
  return arr
}

export default function TasksPage() {
  const toast = useToast()
  const { data: services = [] } = useServices()
  const { data: people = [] } = usePeople()
  const { data: tasks = [], isLoading } = useTasks()
  const deleteTask = useDeleteTask()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [serviceFilter, setServiceFilter] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [dueFrom, setDueFrom] = useState('')
  const [dueTo, setDueTo] = useState('')
  const [sortBy, setSortBy] = useState('recent')
  const [showAdv, setShowAdv] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<TaskListItem | null>(null)
  const [view, setView] = useState<'table' | 'board'>('table')
  const { data: deleteImpact, isLoading: deleteImpactLoading } = useTaskDeleteImpact(pendingDelete?.id)

  const stats = useMemo(() => ({
    total: tasks.length,
    inProgress: tasks.filter((t) => t.status === 'in_progress').length,
    blocked: tasks.filter((t) => t.status === 'blocked').length,
    overdue: tasks.filter((t) => t.due_date && isOverdue(t.due_date) && t.status !== 'completed').length,
  }), [tasks])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = tasks.filter((t) =>
      (!q || t.title.toLowerCase().includes(q) || (t.project?.name ?? '').toLowerCase().includes(q)) &&
      (!statusFilter || t.status === statusFilter) &&
      (!priorityFilter || t.priority === priorityFilter) &&
      (!serviceFilter || t.project_service?.service?.slug === serviceFilter) &&
      (!assigneeFilter || t.assignees.some((a) => a.id === assigneeFilter)) &&
      (!dueFrom || (!!t.due_date && t.due_date.slice(0, 10) >= dueFrom)) &&
      (!dueTo || (!!t.due_date && t.due_date.slice(0, 10) <= dueTo)))
    return sortTasks(list, sortBy)
  }, [tasks, search, statusFilter, priorityFilter, serviceFilter, assigneeFilter, dueFrom, dueTo, sortBy])

  const statusOptions = [{ value: '', label: 'All statuses' }, ...STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABELS[s] }))]
  const priorityOptions = [{ value: '', label: 'All priorities' }, ...PRIORITY_ORDER.map((p) => ({ value: p, label: PRIORITY_LABELS[p] }))]
  const serviceOptions = [{ value: '', label: 'All services' }, ...services.map((s) => ({ value: s.slug, label: s.name, dot: s.color }))]
  const assigneeOptions = [{ value: '', label: 'All assignees' }, ...people.filter((p) => p.is_active).map((p) => ({ value: p.id, label: p.name, avatar: { name: p.name, url: p.avatar_url } }))]

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Tasks" />
      <div className="p-4 lg:px-8 lg:py-7 flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-display font-bold text-[22px] text-text-1">Tasks</h2>
          <Button size="sm" className="ml-auto" iconLeft={<Plus size={15} />} onClick={() => setShowForm(true)}>New Task</Button>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi icon={CheckSquare} label="Total" value={stats.total} />
          <Kpi icon={ListTodo} label="In Progress" value={stats.inProgress} />
          <Kpi icon={AlertOctagon} label="Blocked" value={stats.blocked} tone={stats.blocked ? 'error' : undefined} />
          <Kpi icon={Clock} label="Overdue" value={stats.overdue} tone={stats.overdue ? 'warning' : undefined} />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks…" iconLeft={<Search size={14} />} className="w-56" />
          <Select value={statusFilter} onChange={setStatusFilter} options={statusOptions} size="sm" />
          <Select value={priorityFilter} onChange={setPriorityFilter} options={priorityOptions} size="sm" />
          <Select value={serviceFilter} onChange={setServiceFilter} options={serviceOptions} size="sm" />
          <Select value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} size="sm" label="Sort" />
          <button
            onClick={() => setShowAdv((v) => !v)}
            className={cn('h-8 px-2.5 rounded-sm border flex items-center gap-1.5 font-ui text-[11.5px] transition-colors', showAdv || dueFrom || dueTo || assigneeFilter ? 'border-border-focus text-text-1 bg-surface-2' : 'border-border-default text-text-3 hover:text-text-1')}
          >
            <SlidersHorizontal size={13} /> Filters
          </button>
          <div className="ml-auto flex items-center gap-1 bg-surface-1 border border-border-default rounded-lg p-1">
            {(['table', 'board'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'flex items-center gap-1.5 px-3 h-8 rounded-md font-ui font-medium text-[12.5px] capitalize transition-colors',
                  view === v ? 'bg-surface-3 text-text-1 shadow-sm' : 'text-text-3 hover:text-text-1',
                )}
              >
                {v === 'table' ? <LayoutList size={13} /> : <Columns size={13} />} {v}
              </button>
            ))}
          </div>
        </div>

        {showAdv && (
          <div className="flex flex-wrap items-center gap-2 bg-surface-1 border border-border-default rounded-lg p-2.5">
            <span className="font-mono text-[10px] uppercase tracking-wider text-text-4 self-center">Due between</span>
            <DatePicker value={dueFrom} onChange={setDueFrom} placeholder="From" className="w-40" />
            <DatePicker value={dueTo} onChange={setDueTo} placeholder="To" minDate={dueFrom || undefined} className="w-40" />
            <Select value={assigneeFilter} onChange={setAssigneeFilter} options={assigneeOptions} size="sm" />
            {(dueFrom || dueTo || assigneeFilter) && (
              <button onClick={() => { setDueFrom(''); setDueTo(''); setAssigneeFilter('') }} className="h-8 px-2.5 rounded-sm text-[11.5px] text-text-3 hover:text-error transition-colors">Clear</button>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center font-ui text-[13px] text-text-4">No tasks match your filters.</div>
        ) : view === 'board' ? (
          <TaskBoard tasks={filtered} onOpenTask={setOpenTaskId} showProject />
        ) : (
          <div className="bg-surface-1 border border-border-default rounded-md overflow-x-auto">
            <table className="w-full text-left min-w-[760px]">
              <thead>
                <tr className="border-b border-border-default text-[10.5px] font-mono uppercase tracking-wider text-text-4">
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
                  <tr key={t.id} onClick={() => setOpenTaskId(t.id)} className="border-b border-border-subtle last:border-0 hover:bg-surface-2/50 cursor-pointer">
                    <td className="px-4 py-3 font-ui text-[13px] text-text-1">{t.title}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {t.project_service?.service && <ServiceChip service={t.project_service.service.slug} showDot={false} />}
                        <span className="font-ui text-[12px] text-text-3 truncate max-w-[140px]">{t.project?.name ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><PriorityChip priority={t.priority} /></td>
                    <td className="px-4 py-3"><StatusChip status={t.status} /></td>
                    <td className="px-4 py-3">
                      {t.due_date
                        ? <span className={cn('font-mono text-[12px]', isOverdue(t.due_date) && t.status !== 'completed' ? 'text-error' : 'text-text-3')}>{formatDate(t.due_date)}</span>
                        : <span className="text-text-4 text-[12px]">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {t.assignees.length === 1
                        ? <span className="flex items-center gap-2"><Avatar name={t.assignees[0].name} src={t.assignees[0].avatar_url ?? undefined} size="xs" personId={t.assignees[0].id} /><PersonLink personId={t.assignees[0].id} className="font-ui text-[12px] text-text-2">{t.assignees[0].name}</PersonLink></span>
                        : t.assignees.length > 1
                          ? <AvatarGroup users={t.assignees.map((a) => ({ id: a.id, name: a.name, avatarUrl: a.avatar_url ?? undefined }))} max={4} size="xs" linkToProfile />
                          : <span className="text-text-4 text-[12px]">Unassigned</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); setPendingDelete(t) }}
                        className="size-7 rounded-sm inline-flex items-center justify-center text-text-3 hover:text-error hover:bg-error/10"
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

      {showForm && <TaskFormModal onClose={() => setShowForm(false)} />}
      <TaskDetailDrawer taskId={openTaskId} open={!!openTaskId} onClose={() => setOpenTaskId(null)} />
      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete task?"
        message={
          <DeleteImpactMessage
            subject={pendingDelete?.title ?? ''}
            loading={deleteImpactLoading}
            lines={[
              ['Comments', deleteImpact?.comments],
              ['Attachments', deleteImpact?.attachments],
              ['Subtasks', deleteImpact?.subtasks],
              ['Assignees', deleteImpact?.assignees],
            ]}
          />
        }
        confirmLabel="Delete task"
        danger
        isPending={deleteTask.isPending || deleteImpactLoading}
        onConfirm={() => {
          if (!pendingDelete) return
          deleteTask.mutate({ id: pendingDelete.id, projectId: pendingDelete.project_id }, {
            onSuccess: () => { toast('Task deleted', 'success'); setPendingDelete(null) },
            onError: (e) => toast(e instanceof Error ? e.message : 'Failed', 'error'),
          })
        }}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  )
}

function DeleteImpactMessage({
  subject, loading, lines,
}: {
  subject: string
  loading: boolean
  lines: [string, number | undefined][]
}) {
  return (
    <div className="space-y-3">
      <p><strong className="text-text-1">{subject}</strong> will be deleted after confirmation.</p>
      {loading ? (
        <p className="text-text-3">Checking linked records...</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {lines.map(([label, value]) => (
            <div key={label} className="rounded-md border border-border-default bg-surface-2 px-3 py-2">
              <p className="font-mono text-[10px] uppercase tracking-wider text-text-4">{label}</p>
              <p className="font-display text-[18px] font-bold text-text-1">{value ?? 0}</p>
            </div>
          ))}
        </div>
      )}
      <p className="text-text-3">Comments, attachments, subtasks, and assignee links will be removed before the task leaves active lists.</p>
    </div>
  )
}

function Kpi({ icon: Icon, label, value, tone }: { icon: typeof CheckSquare; label: string; value: number; tone?: 'error' | 'warning' }) {
  return (
    <div className="bg-surface-1 border border-border-default rounded-xl px-5 py-4">
      <div className="flex items-center gap-2 text-text-3 mb-1.5">
        <Icon size={14} className={cn(tone === 'error' && 'text-error', tone === 'warning' && 'text-warning')} />
        <span className="font-mono text-[10.5px] uppercase tracking-wider">{label}</span>
      </div>
      <p className={cn('font-display font-bold text-[24px]', tone === 'error' ? 'text-error' : tone === 'warning' ? 'text-warning' : 'text-text-1')}>{value}</p>
    </div>
  )
}
