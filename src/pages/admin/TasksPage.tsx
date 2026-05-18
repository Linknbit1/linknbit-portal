import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Search, Plus, ExternalLink, Eye, EyeOff, Zap,
} from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Avatar } from '../../components/ui/Avatar'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { StatusChip } from '../../components/shared/StatusChip'
import { PriorityChip } from '../../components/shared/PriorityChip'
import { ServiceChip } from '../../components/shared/ServiceChip'
import { ClickUpStatus } from '../../components/shared/ClickUpStatus'
import { useToast } from '../../components/ui/toast-context'
import { TASKS } from '../../data/mock'
import { formatDate, getDaysUntil } from '../../lib/utils'
import type { TaskStatus, Priority, ServiceType } from '../../types'
import { cn } from '../../lib/cn'

export default function TasksPage() {
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all')
  const [serviceFilter, setServiceFilter] = useState<ServiceType | 'all'>('all')

  const filtered = TASKS.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false
    if (serviceFilter !== 'all' && t.serviceType !== serviceFilter) return false
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.assignee.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const overdue = TASKS.filter((t) => getDaysUntil(t.dueDate) < 0).length
  const inProgress = TASKS.filter((t) => t.status === 'in_progress').length
  const blocked = TASKS.filter((t) => t.status === 'blocked').length

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Tasks" />

      <div className="p-6 flex flex-col gap-5 max-w-content mx-auto w-full">

        {/* KPI strip */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Tasks', value: TASKS.length, color: 'text-text-1' },
            { label: 'In Progress', value: inProgress, color: 'text-service-dev' },
            { label: 'Blocked', value: blocked, color: 'text-error' },
            { label: 'Overdue', value: overdue, color: 'text-warning' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-surface-1 border border-border-default rounded-xl px-5 py-4">
              <p className={cn('font-display font-bold text-[28px] leading-none', color)}>{value}</p>
              <p className="font-ui text-[12px] text-text-3 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border-subtle flex-wrap">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-4" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks or assignees..."
                className="pl-7 pr-3 py-1.5 bg-surface-inset border border-border-default rounded-md text-[12.5px] font-ui text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus w-[220px]"
              />
            </div>
            <Select
              size="sm"
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as TaskStatus | 'all')}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'backlog', label: 'Backlog', dot: '#5C6A7F' },
                { value: 'todo', label: 'To Do', dot: '#7A8597' },
                { value: 'in_progress', label: 'In Progress', dot: '#22D3EE' },
                { value: 'review', label: 'Review', dot: '#A78BFA' },
                { value: 'approved', label: 'Approved', dot: '#22C55E' },
                { value: 'completed', label: 'Completed', dot: '#34D399' },
                { value: 'blocked', label: 'Blocked', dot: '#F4364C' },
              ]}
            />
            <Select
              size="sm"
              value={priorityFilter}
              onChange={(v) => setPriorityFilter(v as Priority | 'all')}
              options={[
                { value: 'all', label: 'All Priority' },
                { value: 'critical', label: 'Critical', dot: '#F4364C' },
                { value: 'high', label: 'High', dot: '#F59E0B' },
                { value: 'medium', label: 'Medium', dot: '#3B82F6' },
                { value: 'low', label: 'Low', dot: '#7A8597' },
              ]}
            />
            <Select
              size="sm"
              value={serviceFilter}
              onChange={(v) => setServiceFilter(v as ServiceType | 'all')}
              options={[
                { value: 'all', label: 'All Services' },
                { value: 'design', label: 'Design', dot: '#A78BFA' },
                { value: 'development', label: 'Development', dot: '#22D3EE' },
                { value: 'marketing', label: 'Marketing', dot: '#FBBF24' },
              ]}
            />
            <span className="font-mono text-[11px] text-text-4 ml-auto">{filtered.length} tasks</span>
            <Button size="sm" onClick={() => toast('Add task modal coming soon', 'info')}>
              <Plus size={13} /> Add Task
            </Button>
          </div>

          {/* Table */}
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-2">
                {['Task', 'Project', 'Assignee', 'Status', 'Priority', 'Due', 'XP', ''].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left font-ui font-semibold text-[10.5px] text-text-3 uppercase tracking-wider first:pl-5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center font-mono text-[12px] text-text-4">
                    No tasks match your filters
                  </td>
                </tr>
              ) : (
                filtered.map((task) => {
                  const days = getDaysUntil(task.dueDate)
                  const isBlocked = task.status === 'blocked'
                  return (
                    <tr
                      key={task.id}
                      className={cn(
                        'border-b border-border-subtle hover:bg-white/[0.018] transition-colors',
                        isBlocked && 'bg-error/[0.03]',
                      )}
                    >
                      <td className="pl-5 pr-4 py-3">
                        <div>
                          <Link
                            to={`/admin/tasks/${task.id}`}
                            className="font-ui font-medium text-[13px] text-text-1 hover:text-brand-red transition-colors line-clamp-1"
                          >
                            {isBlocked && <span className="inline-block w-1.5 h-1.5 rounded-full bg-error mr-1.5 mb-0.5" />}
                            {task.title}
                          </Link>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <ServiceChip service={task.serviceType} />
                            {task.clickUpId && <span className="font-mono text-[10px] text-text-4">{task.clickUpId}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/admin/projects/${task.projectId}`}
                          className="font-ui text-[12.5px] text-text-2 hover:text-text-1 transition-colors truncate max-w-[140px] block"
                        >
                          {task.projectName}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar name={task.assignee.name} size="xs" />
                          <span className="font-ui text-[12.5px] text-text-1 truncate max-w-[100px]">{task.assignee.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3"><StatusChip status={task.status} /></td>
                      <td className="px-4 py-3"><PriorityChip priority={task.priority} /></td>
                      <td className="px-4 py-3">
                        <div>
                          <p className={cn('font-mono text-[12px] font-medium', days < 0 ? 'text-error' : days <= 2 ? 'text-warning' : 'text-text-1')}>
                            {formatDate(task.dueDate)}
                          </p>
                          <p className="font-mono text-[10px] text-text-4 uppercase tracking-wider">
                            {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `${days}d`}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 bg-coin-gold/12 border border-coin-gold/30 text-coin-gold font-mono font-bold text-[11px] rounded-full px-2 py-[2px]">
                          <Zap size={9} />{task.xpReward}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 justify-end">
                          <span className={cn('w-6 h-6 rounded-md bg-surface-2 border border-border-default flex items-center justify-center text-text-3', task.clientVisible ? 'text-success bg-success/10 border-success/30' : '')}>
                            {task.clientVisible ? <Eye size={11} /> : <EyeOff size={11} />}
                          </span>
                          <ClickUpStatus status={task.clickUpSync} />
                          <Link
                            to={`/admin/tasks/${task.id}`}
                            className="w-6 h-6 rounded-md bg-surface-2 border border-border-default text-text-3 flex items-center justify-center hover:text-text-1 hover:bg-surface-3 transition-colors"
                          >
                            <ExternalLink size={11} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
