import { useMemo, useState } from 'react'
import { Search, Plus, CheckSquare, ListTodo, AlertOctagon, Clock } from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Avatar } from '../../components/ui/Avatar'
import { Skeleton } from '../../components/ui/Skeleton'
import { ServiceChip } from '../../components/shared/ServiceChip'
import { StatusChip } from '../../components/shared/StatusChip'
import { PriorityChip } from '../../components/shared/PriorityChip'
import { cn } from '../../lib/cn'
import { formatDate, isOverdue, STATUS_LABELS, PRIORITY_LABELS } from '../../lib/utils'
import { useTasks } from '../../hooks/useTasks'
import { useServices } from '../../hooks/useServices'
import { TaskFormModal } from './TaskFormModal'
import { TaskDetailDrawer } from './TaskDetailDrawer'
import type { Priority, TaskStatus } from '../../types'

const STATUS_ORDER: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'review', 'approved', 'completed', 'blocked']
const PRIORITY_ORDER: Priority[] = ['critical', 'high', 'medium', 'low']

export default function TasksPage() {
  const { data: services = [] } = useServices()
  const { data: tasks = [], isLoading } = useTasks()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [serviceFilter, setServiceFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)

  const stats = useMemo(() => ({
    total: tasks.length,
    inProgress: tasks.filter((t) => t.status === 'in_progress').length,
    blocked: tasks.filter((t) => t.status === 'blocked').length,
    overdue: tasks.filter((t) => t.due_date && isOverdue(t.due_date) && t.status !== 'completed').length,
  }), [tasks])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tasks.filter((t) =>
      (!q || t.title.toLowerCase().includes(q) || (t.project?.name ?? '').toLowerCase().includes(q)) &&
      (!statusFilter || t.status === statusFilter) &&
      (!priorityFilter || t.priority === priorityFilter) &&
      (!serviceFilter || t.service_type === serviceFilter || t.project?.service_type === serviceFilter))
  }, [tasks, search, statusFilter, priorityFilter, serviceFilter])

  const statusOptions = [{ value: '', label: 'All statuses' }, ...STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABELS[s] }))]
  const priorityOptions = [{ value: '', label: 'All priorities' }, ...PRIORITY_ORDER.map((p) => ({ value: p, label: PRIORITY_LABELS[p] }))]
  const serviceOptions = [{ value: '', label: 'All services' }, ...services.map((s) => ({ value: s.slug, label: s.name, dot: s.color }))]

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Tasks" />
      <div className="p-4 lg:p-6 flex flex-col gap-4 max-w-content mx-auto w-full">
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
        </div>

        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center font-ui text-[13px] text-text-4">No tasks match your filters.</div>
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
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} onClick={() => setOpenTaskId(t.id)} className="border-b border-border-subtle last:border-0 hover:bg-surface-2/50 cursor-pointer">
                    <td className="px-4 py-3 font-ui text-[13px] text-text-1">{t.title}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ServiceChip service={t.project?.service_type ?? t.service_type ?? ''} showDot={false} />
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
                      {t.assignee
                        ? <span className="flex items-center gap-2"><Avatar name={t.assignee.name} src={t.assignee.avatar_url ?? undefined} size="xs" /><span className="font-ui text-[12px] text-text-2">{t.assignee.name}</span></span>
                        : <span className="text-text-4 text-[12px]">Unassigned</span>}
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
