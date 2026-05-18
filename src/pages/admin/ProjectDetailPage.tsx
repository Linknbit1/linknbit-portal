import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  CheckCircle2, AlertTriangle, Clock, Plus, RefreshCw,
  CheckCheck, RotateCcw, Eye, EyeOff, ChevronDown,
  File, MoreHorizontal, ArrowLeft, Zap,
  ExternalLink, Lock,
} from 'lucide-react'
import { Avatar } from '../../components/ui/Avatar'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { ServiceChip } from '../../components/shared/ServiceChip'
import { StatusChip } from '../../components/shared/StatusChip'
import { PriorityChip } from '../../components/shared/PriorityChip'
import { ClickUpStatus } from '../../components/shared/ClickUpStatus'
import { TaskDetailDrawer } from './TaskDetailDrawer'
import { useToast } from '../../components/ui/toast-context'
import { PROJECTS, TASKS, USERS } from '../../data/mock'
import { formatDate, getDaysUntil } from '../../lib/utils'
import { cn } from '../../lib/cn'
import type { Task, TaskStatus, Priority } from '../../types'

const SERVICE_ACCENT: Record<string, string> = {
  development: '#22D3EE',
  design: '#A78BFA',
  marketing: '#FBBF24',
}

const PROGRESS_COLOR = (pct: number): string => {
  if (pct < 25) return 'linear-gradient(90deg,#4A5468,#5C6A7F)'
  if (pct < 60) return 'linear-gradient(90deg,#F59E0B,#FBBF24)'
  if (pct < 85) return 'linear-gradient(90deg,#EE2737,#F94454)'
  return 'linear-gradient(90deg,#22C55E,#34D399)'
}

function TaskRow({ task, onOpen }: { task: Task; onOpen: (t: Task) => void }) {
  const days = getDaysUntil(task.dueDate)
  const isBlocked = task.status === 'blocked'
  return (
    <div className={cn('contents group', isBlocked && 'text-error')}>
      <div className={cn(
        'pl-5 pr-3 py-3 border-b border-border-subtle flex items-center min-w-0 group-hover:bg-white/[0.018] transition-colors',
        isBlocked && 'shadow-[inset_2px_0_0_#F4364C] bg-error/[0.03]',
      )}>
        <div className="min-w-0">
          <button onClick={() => onOpen(task)} className="font-ui font-medium text-[13px] text-text-1 hover:text-brand-red transition-colors text-left truncate max-w-[260px] block">
            {task.title}
          </button>
          {days < 0 && (
            <span className="font-mono text-[10px] text-error font-semibold uppercase tracking-wide">{Math.abs(days)}d overdue</span>
          )}
        </div>
      </div>
      <div className={cn('px-3 py-3 border-b border-border-subtle flex items-center gap-2 group-hover:bg-white/[0.018] transition-colors', isBlocked && 'bg-error/[0.03]')}>
        <Avatar name={task.assignee.name} size="xs" />
        <span className="text-[12px] font-ui text-text-1 truncate">{task.assignee.name}</span>
      </div>
      <div className={cn('px-3 py-3 border-b border-border-subtle flex items-center group-hover:bg-white/[0.018] transition-colors', isBlocked && 'bg-error/[0.03]')}>
        <StatusChip status={task.status} />
      </div>
      <div className={cn('px-3 py-3 border-b border-border-subtle flex items-center group-hover:bg-white/[0.018] transition-colors', isBlocked && 'bg-error/[0.03]')}>
        <PriorityChip priority={task.priority} />
      </div>
      <div className={cn('px-3 py-3 border-b border-border-subtle group-hover:bg-white/[0.018] transition-colors', isBlocked && 'bg-error/[0.03]')}>
        <span className={cn('font-mono text-[11.5px] font-medium block', days < 0 ? 'text-error' : days <= 2 ? 'text-warning' : 'text-text-1')}>
          {formatDate(task.dueDate)}
        </span>
      </div>
      <div className={cn('px-3 py-3 border-b border-border-subtle flex items-center group-hover:bg-white/[0.018] transition-colors', isBlocked && 'bg-error/[0.03]')}>
        <span className="inline-flex items-center gap-1 bg-coin-gold/12 border border-coin-gold/30 text-coin-gold font-bold text-[11px] rounded-full px-2 py-0.5">
          <Zap size={9} />{task.xpReward}
        </span>
      </div>
      <div className={cn('px-3 py-3 border-b border-border-subtle flex items-center gap-1.5 justify-end group-hover:bg-white/[0.018] transition-colors', isBlocked && 'bg-error/[0.03]')}>
        <span className={cn('w-6 h-6 rounded flex items-center justify-center transition-colors', task.clientVisible ? 'text-success' : 'text-text-4 hover:text-text-2')}>
          {task.clientVisible ? <Eye size={11} /> : <EyeOff size={11} />}
        </span>
        <ClickUpStatus status={task.clickUpSync} />
        <Link to={`/admin/tasks/${task.id}`} className="w-6 h-6 rounded text-text-3 flex items-center justify-center hover:text-text-1 transition-colors">
          <ExternalLink size={11} />
        </Link>
      </div>
    </div>
  )
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const toast = useToast()
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all')
  const [drawerTask, setDrawerTask] = useState<Task | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [expandedStages, setExpandedStages] = useState<Set<string>>(() => new Set())

  const project = PROJECTS.find((p) => p.id === id) ?? PROJECTS[0]
  const allTasks = TASKS.filter((t) => t.projectId === project.id)
  const teamMembers = USERS.filter((u) => project.teamIds.includes(u.id))
  const accentColor = SERVICE_ACCENT[project.serviceType]
  const days = getDaysUntil(project.deadline)
  const overdueCount = allTasks.filter((t) => getDaysUntil(t.dueDate) < 0).length

  const openDrawer = (task: Task) => { setDrawerTask(task); setDrawerOpen(true) }

  const toggleStage = (stageId: string) =>
    setExpandedStages((prev) => {
      const next = new Set(prev)
      if (next.has(stageId)) {
        next.delete(stageId)
      } else {
        next.add(stageId)
      }
      return next
    })

  const filteredTasks = allTasks.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false
    return true
  })

  const currentStage = project.stages.find((s) => s.status === 'current' || s.status === 'blocked')
  const currentStageIndex = project.stages.findIndex((s) => s.status === 'current' || s.status === 'blocked')
  const stageNeedsApproval = currentStage?.requiresApproval && currentStage?.approvalStatus === 'pending'

  return (
    <div className="flex flex-col flex-1">
      {/* Topbar */}
      <header className="h-16 topbar-glass border-b border-border-default sticky top-0 z-40 flex items-center px-6 gap-3">
        <Link to="/admin/projects" className="w-8 h-8 flex items-center justify-center rounded-lg border border-border-default text-text-3 hover:text-text-1 hover:bg-surface-2 transition-colors flex-shrink-0">
          <ArrowLeft size={14} />
        </Link>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <ServiceChip service={project.serviceType} />
          <h1 className="font-display font-bold text-[17px] text-text-1 tracking-tight truncate">{project.name}</h1>
          <span className="font-mono text-[11px] text-text-4 flex-shrink-0">{project.clientName}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusChip status={project.status} type="project" />
          <ClickUpStatus status={project.clickUpSync} showLabel />
          <Button size="sm" variant="secondary" onClick={() => toast('Edit project', 'info')}>Edit</Button>
        </div>
      </header>

      {/* Content */}
      <div className="p-6 grid gap-5 max-w-content mx-auto w-full" style={{ gridTemplateColumns: 'minmax(0,1fr) 320px' }}>

        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-5 min-w-0">

          {/* Project summary strip */}
          <div
            className="bg-surface-1 border border-border-default rounded-xl p-5 relative overflow-hidden"
            style={{ borderLeft: `3px solid ${accentColor}` }}
          >
            <div className="absolute top-0 right-0 pointer-events-none" style={{ width: 260, height: 260, background: `radial-gradient(circle at top right, ${accentColor}08, transparent 65%)` }} />
            <div className="grid grid-cols-5 divide-x divide-border-subtle relative">
              {[
                {
                  label: 'Progress',
                  value: (
                    <div className="flex items-center gap-2">
                      <div className="w-14 h-1.5 bg-surface-inset rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${project.progress}%`, background: PROGRESS_COLOR(project.progress) }} />
                      </div>
                      <span className="font-mono text-[13px] font-semibold">{project.progress}%</span>
                    </div>
                  ),
                },
                { label: 'Start Date', value: <span className="font-mono text-[13px]">{project.startDate ? formatDate(project.startDate) : '—'}</span> },
                {
                  label: 'Deadline',
                  value: (
                    <span className={cn('font-mono text-[13px]', days <= 3 ? 'text-error' : days <= 7 ? 'text-warning' : 'text-text-1')}>
                      {formatDate(project.deadline)} <span className="text-[10px] text-text-3">({days}d)</span>
                    </span>
                  ),
                },
                {
                  label: 'Team',
                  value: (
                    <div className="flex -space-x-1.5">
                      {teamMembers.slice(0, 5).map((u) => <Avatar key={u.id} name={u.name} size="xs" className="ring-2 ring-surface-1" />)}
                      {teamMembers.length > 5 && <span className="w-6 h-6 rounded-full bg-surface-3 border-2 border-surface-1 flex items-center justify-center font-mono text-[9px] text-text-3">+{teamMembers.length - 5}</span>}
                    </div>
                  ),
                },
                {
                  label: 'Tasks',
                  value: (
                    <span className="font-mono text-[13px]">
                      {allTasks.filter((t) => t.status === 'completed').length}/{allTasks.length}
                      {overdueCount > 0 && <span className="text-error ml-1 text-[10px]">({overdueCount} overdue)</span>}
                    </span>
                  ),
                },
              ].map((cell, i) => (
                <div key={cell.label} className={cn('flex flex-col gap-1.5', i === 0 ? 'pr-5' : i === 4 ? 'pl-5' : 'px-5')}>
                  <span className="font-ui font-semibold text-[9.5px] text-text-4 uppercase tracking-widest">{cell.label}</span>
                  <div className="font-display font-semibold text-text-1">{cell.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Stage Pipeline */}
          {project.stages.length > 0 && (
            <div className="bg-surface-1 border border-border-default rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="font-display font-semibold text-[14px] text-text-1">Pipeline</span>
                <span className="font-mono text-[11px] text-text-3">
                  {project.stages.filter((s) => s.status === 'completed').length}/{project.stages.length} stages
                </span>
              </div>
              <div className="relative flex items-start gap-0" style={{ gridTemplateColumns: `repeat(${project.stages.length}, 1fr)` }}>
                {/* Connector line */}
                <div className="absolute top-[17px] left-[24px] right-[24px] h-[2px] bg-border-subtle z-0" />
                <div
                  className="absolute top-[17px] left-[24px] h-[2px] bg-success z-0 transition-all"
                  style={{ width: currentStageIndex > 0 ? `${(currentStageIndex / (project.stages.length - 1)) * 100}%` : '0%' }}
                />

                <div className="relative z-[1] flex w-full">
                  {project.stages.map((stage, i) => {
                    const isDone = stage.status === 'completed'
                    const isCurrent = stage.status === 'current'
                    const isBlocked = stage.status === 'blocked'
                    return (
                      <div key={stage.id} className="flex flex-col items-center flex-1 gap-2">
                        <div
                          className={cn(
                            'w-9 h-9 rounded-full flex items-center justify-center border-2 font-mono text-[11px] font-semibold transition-all',
                            isDone && 'bg-success border-success text-[#062013]',
                            isCurrent && 'border-service-dev bg-service-dev text-[#04212a] shadow-[0_0_0_4px_rgba(34,211,238,0.18)]',
                            isBlocked && 'bg-error border-error text-white shadow-[0_0_0_4px_rgba(244,54,76,0.22)]',
                            !isDone && !isCurrent && !isBlocked && 'bg-surface-1 border-border-default text-text-3',
                          )}
                        >
                          {isDone ? <CheckCircle2 size={16} /> : i + 1}
                        </div>
                        <span className={cn(
                          'font-ui font-semibold text-[11px] text-center max-w-[80px] leading-snug',
                          isDone ? 'text-text-2' : isCurrent || isBlocked ? 'text-text-1' : 'text-text-3',
                        )}>
                          {stage.name}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {project.stages.find((s) => s.status === 'blocked') && (
                <div className="mt-4 flex items-center gap-3 p-3 bg-error/5 border border-error/25 rounded-lg">
                  <AlertTriangle size={15} className="text-error flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-ui font-semibold text-[13px] text-text-1">{project.stages.find((s) => s.status === 'blocked')?.name} is blocked</p>
                    <p className="font-mono text-[10.5px] text-text-3 mt-0.5">Client delayed UAT sign-off. Following up Friday.</p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => toast('Escalation noted', 'info')}>Escalate</Button>
                </div>
              )}
            </div>
          )}

          {/* Stage Approval */}
          {stageNeedsApproval && (
            <div className="bg-surface-1 border border-border-default rounded-xl px-5 py-4 flex items-center gap-4" style={{ borderLeft: '3px solid #F59E0B' }}>
              <Clock size={18} className="text-warning flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-display font-semibold text-[14px] text-text-1">Awaiting Approval: {currentStage?.name}</p>
                <p className="font-mono text-[11px] text-text-3 mt-0.5">Submitted 3 days ago · Waiting on Imran Shah</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => toast('Stage approved', 'success')}>
                  <CheckCheck size={13} /> Approve
                </Button>
                <Button size="sm" variant="secondary" onClick={() => toast('Revision requested', 'warning')}>
                  <RotateCcw size={13} /> Revise
                </Button>
              </div>
            </div>
          )}

          {/* Tasks */}
          <div className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border-subtle">
              <span className="font-display font-semibold text-[14px] text-text-1">Tasks</span>
              <span className="font-mono text-[10px] text-text-3 bg-surface-2 rounded-full px-2 py-0.5 uppercase tracking-wide">{allTasks.length}</span>
              <div className="ml-auto flex items-center gap-2">
                <Select size="sm" value={statusFilter} onChange={(v) => setStatusFilter(v as TaskStatus | 'all')}
                  options={[
                    { value: 'all', label: 'All Status' },
                    { value: 'in_progress', label: 'In Progress', dot: '#22D3EE' },
                    { value: 'review', label: 'Review', dot: '#A78BFA' },
                    { value: 'blocked', label: 'Blocked', dot: '#F4364C' },
                    { value: 'completed', label: 'Completed', dot: '#22C55E' },
                    { value: 'todo', label: 'To Do', dot: '#7A8597' },
                    { value: 'backlog', label: 'Backlog', dot: '#5C6A7F' },
                  ]}
                />
                <Select size="sm" value={priorityFilter} onChange={(v) => setPriorityFilter(v as Priority | 'all')}
                  options={[
                    { value: 'all', label: 'All Priority' },
                    { value: 'critical', label: 'Critical', dot: '#F4364C' },
                    { value: 'high', label: 'High', dot: '#F59E0B' },
                    { value: 'medium', label: 'Medium', dot: '#3B82F6' },
                    { value: 'low', label: 'Low', dot: '#7A8597' },
                  ]}
                />
                <button
                  onClick={() => toast('Add task dialog would open', 'info')}
                  className="h-[30px] px-2.5 bg-brand-red text-white rounded-lg font-ui font-semibold text-[11.5px] flex items-center gap-1 hover:bg-brand-red-hover transition-colors"
                >
                  <Plus size={12} /> Add Task
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="grid" style={{ gridTemplateColumns: 'minmax(260px,2.2fr) 140px 120px 110px 100px 80px 88px' }}>
              {['Task', 'Assignee', 'Status', 'Priority', 'Due', 'XP', ''].map((h, i) => (
                <div key={h + i} className={cn('px-3 py-2.5 bg-surface-2 border-b border-border-subtle font-ui font-semibold text-[10px] text-text-3 uppercase tracking-wider flex items-center', i === 0 && 'pl-5', i === 6 && 'justify-end pr-3')}>
                  {h}
                </div>
              ))}

              {project.stages.length > 0 ? (
                project.stages.map((stage) => {
                  const stageTasks = filteredTasks.filter((t) => t.stageId === stage.id)
                  if (stageTasks.length === 0) return null
                  const isExpanded = expandedStages.has(stage.id)
                  return (
                    <React.Fragment key={stage.id}>
                      <div
                        style={{ gridColumn: '1 / -1' }}
                        onClick={() => toggleStage(stage.id)}
                        className="flex items-center gap-2.5 px-5 py-2 bg-surface-2/60 border-b border-border-subtle cursor-pointer hover:bg-surface-3/50 transition-colors select-none"
                      >
                        <span className={cn('w-[16px] h-[16px] rounded flex items-center justify-center font-mono text-[9px] border font-semibold flex-shrink-0',
                          stage.status === 'completed' ? 'bg-success/15 border-success/30 text-success' :
                          stage.status === 'blocked' ? 'bg-error/15 border-error/30 text-error' :
                          stage.status === 'current' ? 'bg-service-dev/15 border-service-dev/30 text-service-dev' :
                          'bg-surface-3 border-border-default text-text-4',
                        )}>
                          {stage.order}
                        </span>
                        <span className="font-ui font-semibold text-[12.5px] text-text-1">{stage.name}</span>
                        <span className="font-mono text-[10px] text-text-4 ml-auto">{stageTasks.length}</span>
                        <ChevronDown size={12} className={cn('text-text-3 transition-transform', !isExpanded && '-rotate-90')} />
                      </div>
                      {isExpanded && stageTasks.map((task) => <TaskRow key={task.id} task={task} onOpen={openDrawer} />)}
                    </React.Fragment>
                  )
                })
              ) : (
                filteredTasks.map((task) => <TaskRow key={task.id} task={task} onOpen={openDrawer} />)
              )}

              {filteredTasks.length === 0 && (
                <div style={{ gridColumn: '1 / -1' }} className="py-10 text-center text-text-4 font-mono text-[11px] uppercase tracking-wider border-b border-border-subtle">
                  No tasks match filters
                </div>
              )}
            </div>

            <div className="px-5 py-3">
              <button
                onClick={() => toast('Add task dialog would open', 'info')}
                className="h-8 px-3 border border-dashed border-border-strong text-text-3 font-ui text-[12px] rounded-lg flex items-center gap-1.5 hover:text-text-1 hover:bg-surface-2 transition-all"
              >
                <Plus size={12} /> Add Task
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="flex flex-col gap-4 sticky top-[88px]" style={{ alignSelf: 'start' }}>

          {/* Team */}
          <div className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border-subtle">
              <span className="font-display font-semibold text-[13px] text-text-1">Team ({teamMembers.length})</span>
              <button onClick={() => toast('Add member', 'info')} className="w-6 h-6 rounded bg-surface-2 border border-border-default text-text-3 hover:text-text-1 hover:bg-surface-3 flex items-center justify-center transition-colors">
                <Plus size={11} />
              </button>
            </div>
            {teamMembers.map((member) => (
              <div key={member.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-border-subtle last:border-0 hover:bg-white/[0.015] transition-colors">
                <Avatar name={member.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-ui font-semibold text-[12.5px] text-text-1 truncate">{member.name}</p>
                  <p className="font-mono text-[10px] text-text-3 uppercase tracking-wider">{member.role}</p>
                </div>
                <button onClick={() => toast(`${member.name} options`, 'info')} className="text-text-4 hover:text-text-2 transition-colors">
                  <MoreHorizontal size={13} />
                </button>
              </div>
            ))}
          </div>

          {/* Urgent deadlines */}
          {allTasks.some((t) => getDaysUntil(t.dueDate) <= 5) && (
            <div className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-border-subtle">
                <span className="font-display font-semibold text-[13px] text-text-1">Urgent</span>
                <span className="font-mono text-[10px] text-error bg-error/10 border border-error/25 rounded-full px-2 py-0.5">
                  {allTasks.filter((t) => getDaysUntil(t.dueDate) <= 3).length} critical
                </span>
              </div>
              {allTasks
                .filter((t) => getDaysUntil(t.dueDate) <= 5)
                .slice(0, 4)
                .map((task) => {
                  const taskDays = getDaysUntil(task.dueDate)
                  const d = new Date(task.dueDate)
                  return (
                    <div key={task.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-border-subtle last:border-0 hover:bg-white/[0.015] transition-colors">
                      <div className={cn('w-9 h-9 rounded-lg flex flex-col items-center justify-center flex-shrink-0 border', taskDays <= 2 ? 'bg-error/10 border-error/30' : 'bg-surface-2 border-border-default')}>
                        <span className={cn('font-mono text-[8px] font-semibold uppercase', taskDays <= 2 ? 'text-error' : 'text-text-3')}>{d.toLocaleString('en', { month: 'short' })}</span>
                        <span className={cn('font-display font-bold text-[14px] leading-none', taskDays <= 2 ? 'text-error' : 'text-text-1')}>{d.getDate()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <button onClick={() => openDrawer(task)} className="font-ui font-medium text-[12px] text-text-1 truncate hover:text-brand-red transition-colors text-left w-full">
                          {task.title}
                        </button>
                        <p className="font-mono text-[10px] text-text-3">{task.assignee.name}</p>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}

          {/* Files */}
          {allTasks.some((t) => (t.files?.length ?? 0) > 0) && (
            <div className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-border-subtle">
                <span className="font-display font-semibold text-[13px] text-text-1">Files</span>
                <button onClick={() => toast('Upload dialog', 'info')} className="w-6 h-6 rounded bg-surface-2 border border-border-default text-text-3 hover:text-text-1 hover:bg-surface-3 flex items-center justify-center transition-colors">
                  <Plus size={11} />
                </button>
              </div>
              {allTasks.flatMap((t) => t.files ?? []).slice(0, 5).map((file) => (
                <div key={file.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-border-subtle last:border-0 hover:bg-white/[0.015] transition-colors">
                  <div className="w-8 h-8 rounded bg-surface-2 border border-border-default flex items-center justify-center flex-shrink-0">
                    <File size={13} className="text-text-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-ui text-[12px] text-text-1 truncate">{file.name}</p>
                    <p className="font-mono text-[10px] text-text-3">{file.uploadedBy}</p>
                  </div>
                  <span className={cn('flex-shrink-0', file.clientVisible ? 'text-success' : 'text-text-4')}>
                    {file.clientVisible ? <Eye size={12} /> : <Lock size={12} />}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ClickUp sync */}
          <div className="bg-surface-1 border border-border-default rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3 pb-3 border-b border-border-subtle">
              <span className="w-8 h-8 rounded-lg bg-surface-2 border border-border-default flex items-center justify-center font-display font-bold text-[12px] text-service-mkt flex-shrink-0">CU</span>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[9.5px] text-text-4 uppercase tracking-wider">ClickUp Folder</p>
                <p className="font-ui font-semibold text-[12.5px] text-text-1 truncate">{project.clickUpFolder ?? 'Not linked'}</p>
              </div>
              <ClickUpStatus status={project.clickUpSync} />
            </div>
            <div className="space-y-1.5 mb-3">
              {[
                { k: 'Last synced', v: project.lastSynced ? new Date(project.lastSynced).toLocaleDateString() : '—' },
                { k: 'Tasks synced', v: `${allTasks.filter((t) => t.clickUpSync === 'synced').length}/${allTasks.length}` },
              ].map((row) => (
                <div key={row.k} className="flex items-center justify-between text-[11.5px]">
                  <span className="font-mono text-[10px] text-text-3 uppercase tracking-wider">{row.k}</span>
                  <span className="font-mono text-text-1">{row.v}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => toast('Syncing with ClickUp...', 'info')}
              className="w-full h-8 bg-surface-2 border border-border-default rounded-lg font-ui font-semibold text-[12px] text-text-1 flex items-center justify-center gap-1.5 hover:bg-surface-3 transition-colors"
            >
              <RefreshCw size={12} /> Sync Now
            </button>
          </div>
        </div>
      </div>

      <TaskDetailDrawer task={drawerTask} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  )
}
