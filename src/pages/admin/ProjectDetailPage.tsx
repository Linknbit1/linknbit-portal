import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  CheckCircle2, AlertTriangle, Clock, Plus, RefreshCw,
  CheckCheck, RotateCcw, Eye, EyeOff, ChevronRight,
  FileText, Image, File, MoreHorizontal, ArrowLeft,
  Pencil, Archive, ExternalLink, Lock, Unlock, Zap,
  Users, Calendar, DollarSign, Filter,
} from 'lucide-react'
import { Avatar } from '../../components/ui/Avatar'
import { Select } from '../../components/ui/Select'
import { ServiceChip } from '../../components/shared/ServiceChip'
import { StatusChip } from '../../components/shared/StatusChip'
import { PriorityChip } from '../../components/shared/PriorityChip'
import { ClickUpStatus } from '../../components/shared/ClickUpStatus'
import { ClientVisibility } from '../../components/shared/ClientVisibility'
import { RoleBadge } from '../../components/shared/RoleBadge'
import { PROJECTS, TASKS, USERS } from '../../data/mock'
import { formatDate, formatCurrency, getDaysUntil } from '../../lib/utils'
import { cn } from '../../lib/cn'
import type { TaskStatus, Priority } from '../../types'

const FILE_TYPE_CLS: Record<string, string> = {
  pdf: 'text-error bg-error/8 border-error/25',
  image: 'text-info bg-info/8 border-info/25',
  figma: 'text-service-design bg-service-design-soft border-service-design/30',
  text: 'text-text-3 bg-surface-2 border-border-default',
  other: 'text-text-3 bg-surface-2 border-border-default',
}

const FILE_ICON_MAP: Record<string, typeof FileText> = {
  pdf: FileText,
  image: Image,
  figma: FileText,
  text: File,
  other: File,
}

const SERVICE_TILE_BG: Record<string, string> = {
  development: 'linear-gradient(135deg, #67E8F9, #06B6D4)',
  design: 'linear-gradient(135deg, #C4B5FD, #8B5CF6)',
  marketing: 'linear-gradient(135deg, #FCD34D, #F59E0B)',
}

const SERVICE_TILE_TEXT: Record<string, string> = {
  development: '#04212a',
  design: '#fff',
  marketing: '#1A1306',
}

const SERVICE_ACCENT: Record<string, string> = {
  development: '#22D3EE',
  design: '#A78BFA',
  marketing: '#FBBF24',
}

const PROGRESS_COLOR = (pct: number): string => {
  if (pct < 25) return 'linear-gradient(90deg, #4A5468, #5C6A7F)'
  if (pct < 60) return 'linear-gradient(90deg, #F59E0B, #FBBF24)'
  if (pct < 85) return 'linear-gradient(90deg, #EE2737, #F94454)'
  return 'linear-gradient(90deg, #22C55E, #34D399)'
}

const WORKLOAD_PCT: Record<string, number> = { light: 65, medium: 88, heavy: 96 }
const WORKLOAD_CLS: Record<string, string> = {
  light: 'text-success bg-success',
  medium: 'text-warning bg-warning',
  heavy: 'text-error bg-error',
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all')
  const [viewMode, setViewMode] = useState<'internal' | 'client'>('internal')
  const [internalNote, setInternalNote] = useState<string | null>(null)
  const [editingNote, setEditingNote] = useState(false)

  const project = PROJECTS.find((p) => p.id === id) ?? PROJECTS[0]
  const allTasks = TASKS.filter((t) => t.projectId === project.id)
  const teamMembers = USERS.filter((u) => project.teamIds.includes(u.id))

  const filteredTasks = allTasks.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false
    return true
  })

  const currentStageIndex = project.stages.findIndex((s) => s.status === 'current' || s.status === 'blocked')
  const currentStage = project.stages[currentStageIndex]
  const days = getDaysUntil(project.deadline)
  const accentColor = SERVICE_ACCENT[project.serviceType]
  const currentNote = internalNote ?? project.internalNote ?? ''

  const stageNeedsApproval = currentStage?.requiresApproval && currentStage?.approvalStatus === 'pending'
  const overdueCount = allTasks.filter((t) => getDaysUntil(t.dueDate) < 0).length

  return (
    <div className="flex flex-col flex-1">
      {/* Topbar */}
      <header className="h-16 topbar-glass border-b border-border-default sticky top-0 z-40 flex items-center px-8 gap-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link to="/admin/projects" className="text-[13px] text-text-3 hover:text-text-1 font-ui font-medium transition-colors whitespace-nowrap">
            Projects
          </Link>
          <ChevronRight size={14} className="text-text-4 flex-shrink-0" />
          <h1 className="font-display font-bold text-[17px] text-text-1 tracking-tight leading-none whitespace-nowrap truncate">
            {project.name}
          </h1>
          {project.clickUpFolder && (
            <span className="font-mono text-[11px] text-text-4 bg-surface-2 rounded-[5px] px-1.5 py-[2px] tracking-wider">
              CU-8472
            </span>
          )}
        </div>

        {/* Internal / Client view toggle */}
        <div className="flex items-center bg-surface-1 border border-border-default rounded-sm p-[3px] gap-[2px] ml-2">
          {(['internal', 'client'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setViewMode(v)}
              className={cn(
                'px-3 py-[5px] rounded-[4px] font-ui font-semibold text-[11px] flex items-center gap-1.5 transition-colors capitalize',
                viewMode === v ? 'bg-surface-3 text-text-1 shadow-sm' : 'text-text-3',
              )}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full', viewMode === v ? 'bg-current' : 'bg-text-4')} />
              {v === 'internal' ? 'Internal' : 'Client view'}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2.5">
          {project.clickUpSync === 'error' && (
            <button className="flex items-center gap-2 pl-2 pr-3 py-1.5 bg-error/13 border border-error/30 rounded-full text-error font-ui font-semibold text-[12px] hover:bg-error/20 transition-colors">
              <span className="w-4 h-4 rounded-full bg-error text-white flex items-center justify-center">
                <AlertTriangle size={9} />
              </span>
              <span className="font-bold text-[11.5px]">CU</span>
              <div className="flex flex-col items-start leading-tight">
                <span className="text-[11.5px]">Sync error</span>
                <span className="font-mono text-[9.5px] opacity-75">3 hrs ago</span>
              </div>
            </button>
          )}
          <button className="h-[34px] px-3 border border-border-default rounded-sm font-ui font-semibold text-[12.5px] text-text-1 bg-surface-1 hover:bg-surface-2 flex items-center gap-1.5 transition-colors">
            <Pencil size={13} /> Edit project
          </button>
          <button className="h-[34px] px-3 border border-error/30 rounded-sm font-ui font-semibold text-[12.5px] text-error bg-transparent hover:bg-error/13 flex items-center gap-1.5 transition-colors">
            <Archive size={13} /> Archive
          </button>
        </div>
      </header>

      {/* Content grid */}
      <div className="p-6 grid gap-6 max-w-content mx-auto w-full" style={{ gridTemplateColumns: 'minmax(0,1fr) 380px' }}>

        {/* ── LEFT COLUMN ── */}
        <div className="flex flex-col gap-5 min-w-0">

          {/* 1. Project Header */}
          <section
            className="bg-surface-1 border border-border-default rounded-lg p-6 flex flex-col gap-4 relative overflow-hidden"
            style={{ borderLeft: `3px solid ${accentColor}` }}
          >
            {/* Subtle glow */}
            <div
              className="absolute top-0 right-0 pointer-events-none"
              style={{
                width: 320, height: 320,
                background: `radial-gradient(circle at top right, ${accentColor}09, transparent 65%)`,
              }}
            />

            <div className="flex items-start justify-between gap-5 relative">
              {/* Left: tile + name */}
              <div className="flex items-start gap-4 min-w-0">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center font-display font-bold text-[22px] flex-shrink-0"
                  style={{
                    background: SERVICE_TILE_BG[project.serviceType],
                    color: SERVICE_TILE_TEXT[project.serviceType],
                    boxShadow: `0 4px 16px ${accentColor}29`,
                  }}
                >
                  {project.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h1 className="font-display font-bold text-[28px] text-text-1 leading-tight tracking-tight m-0 mb-2">
                    {project.name}
                  </h1>
                  <div className="flex items-center gap-2 flex-wrap text-[12.5px] text-text-3">
                    <a href="#" className="text-text-2 font-medium hover:text-text-1 transition-colors">{project.clientName}</a>
                    <span className="text-text-4">·</span>
                    <a href="#" className="text-text-2 font-medium hover:text-text-1 transition-colors">{project.pm.name}</a>
                    <span className="text-text-4">·</span>
                    <span>Created May 2026</span>
                  </div>
                </div>
              </div>

              {/* Right: chips */}
              <div className="flex flex-col gap-2 items-end flex-shrink-0 relative">
                <div className="flex gap-2">
                  <ServiceChip service={project.serviceType} />
                  <StatusChip status={project.status} type="project" />
                </div>
                <ClickUpStatus status={project.clickUpSync} showLabel />
              </div>
            </div>

            {/* Meta grid */}
            <div className="grid border-t border-border-subtle pt-4" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
              {[
                {
                  label: 'Progress',
                  value: (
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-surface-inset rounded-full overflow-hidden flex-shrink-0">
                        <div className="h-full rounded-full" style={{ width: `${project.progress}%`, background: PROGRESS_COLOR(project.progress) }} />
                      </div>
                      <span>{project.progress}%</span>
                    </div>
                  ),
                },
                {
                  label: 'Deadline',
                  value: (
                    <span className={cn(days <= 3 ? 'text-error' : days <= 7 ? 'text-warning' : 'text-text-1')}>
                      {formatDate(project.deadline)}
                      <span className="font-mono text-[10.5px] text-text-3 uppercase ml-2 tracking-wider">{days}d left</span>
                    </span>
                  ),
                },
                {
                  label: 'Team',
                  value: (
                    <div className="flex -space-x-1">
                      {teamMembers.slice(0, 4).map((u) => (
                        <Avatar key={u.id} name={u.name} size="xs" className="ring-2 ring-surface-1" />
                      ))}
                      {teamMembers.length > 4 && (
                        <span className="w-6 h-6 rounded-full bg-surface-3 border-2 border-surface-1 flex items-center justify-center font-mono text-[9px] text-text-3">
                          +{teamMembers.length - 4}
                        </span>
                      )}
                    </div>
                  ),
                },
                {
                  label: 'Budget',
                  value: project.budget ? formatCurrency(project.budget) : '—',
                },
                {
                  label: 'Tasks',
                  value: (
                    <span>
                      {allTasks.filter((t) => t.status === 'completed').length}/{allTasks.length}
                      {overdueCount > 0 && (
                        <span className="font-mono text-[10.5px] text-error uppercase ml-2 tracking-wider">{overdueCount} overdue</span>
                      )}
                    </span>
                  ),
                },
              ].map((cell, i) => (
                <div key={cell.label} className={cn('flex flex-col gap-1.5 px-[18px]', i > 0 && 'border-l border-border-subtle', i === 0 && 'pl-0', i === 4 && 'pr-0')}>
                  <span className="font-ui font-semibold text-[9.5px] text-text-4 uppercase tracking-widest">{cell.label}</span>
                  <div className="font-display font-semibold text-[14px] text-text-1 flex items-center gap-2 leading-snug">
                    {cell.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Internal note */}
            {(currentNote || editingNote) && (
              <div className="flex items-center gap-3 px-3.5 py-2.5 bg-surface-inset border border-border-subtle rounded-sm">
                <div className="flex items-center gap-1.5 font-mono text-[10px] text-text-4 uppercase tracking-wider flex-shrink-0 pr-3 border-r border-border-subtle">
                  <Lock size={10} />
                  Internal
                </div>
                {editingNote ? (
                  <input
                    autoFocus
                    defaultValue={currentNote}
                    onBlur={(e) => { setInternalNote(e.target.value); setEditingNote(false) }}
                    className="flex-1 bg-transparent border-0 outline-none text-[12.5px] font-ui text-text-2 italic"
                  />
                ) : (
                  <p className="flex-1 text-[12.5px] font-ui text-text-2 italic">{currentNote}</p>
                )}
                <span className="font-mono text-[10.5px] text-text-4 tracking-wider flex-shrink-0">AK · 2d ago</span>
                <button onClick={() => setEditingNote(true)} className="text-text-3 hover:text-text-1 p-1 rounded transition-colors">
                  <Pencil size={12} />
                </button>
              </div>
            )}
          </section>

          {/* 2. Stage Pipeline */}
          {project.stages.length > 0 && (
            <div className="bg-surface-1 border border-border-default rounded-lg overflow-hidden">
              <div className="px-6 py-5">
                <div className="flex items-center gap-3 mb-5">
                  <span className="font-display font-semibold text-[14px] text-text-1">Project Pipeline</span>
                  <div className="ml-auto flex items-center gap-3.5 font-mono text-[11px] text-text-3 tracking-wider">
                    <span>
                      <strong className="text-text-1 font-semibold tabular-nums">
                        {project.stages.filter((s) => s.status === 'completed').length}
                      </strong>/{project.stages.length} stages
                    </span>
                    <div className="w-24 h-[5px] bg-surface-inset rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(project.stages.filter((s) => s.status === 'completed').length / project.stages.length) * 100}%`,
                          background: `linear-gradient(90deg, ${accentColor}, ${accentColor}cc)`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Stepper */}
                <div
                  className="relative grid"
                  style={{ gridTemplateColumns: `repeat(${project.stages.length}, 1fr)` }}
                >
                  {/* Background connector */}
                  <div
                    className="absolute bg-border-subtle"
                    style={{
                      top: 17,
                      left: `calc(${100 / project.stages.length / 2}%)`,
                      right: `calc(${100 / project.stages.length / 2}%)`,
                      height: 2,
                      zIndex: 0,
                    }}
                  />
                  {/* Completed connector */}
                  {currentStageIndex > 0 && (
                    <div
                      className="absolute bg-success"
                      style={{
                        top: 17,
                        left: `calc(${100 / project.stages.length / 2}%)`,
                        width: `calc(${((currentStageIndex) / (project.stages.length - 1)) * 100}% * ${(project.stages.length - 1) / project.stages.length})`,
                        height: 2,
                        zIndex: 0,
                      }}
                    />
                  )}

                  {project.stages.map((stage, i) => {
                    const isBlocked = stage.status === 'blocked'
                    const isCurrent = stage.status === 'current' || stage.status === 'blocked'
                    const isDone = stage.status === 'completed'

                    return (
                      <div key={stage.id} className="flex flex-col items-center gap-2.5 relative z-[1] cursor-pointer group">
                        {/* Puck */}
                        <div
                          className={cn(
                            'w-9 h-9 rounded-full flex items-center justify-center border-2 font-mono text-[12px] font-semibold relative transition-all',
                            isDone && 'bg-success border-success text-[#062013]',
                            isCurrent && !isBlocked && 'border-service-dev text-[#04212a] shadow-[0_0_0_4px_rgba(34,211,238,0.18)]',
                            isCurrent && isBlocked && 'bg-error border-error text-white shadow-[0_0_0_4px_rgba(244,54,76,0.22)]',
                            !isCurrent && !isDone && 'bg-surface-1 border-border-default text-text-3',
                          )}
                          style={isCurrent && !isBlocked ? { background: '#06B6D4' } : undefined}
                        >
                          {isDone ? <CheckCircle2 size={16} className="text-[#062013]" /> : i + 1}
                        </div>
                        {/* Labels */}
                        <div className="flex flex-col items-center gap-0.5 text-center">
                          <span className={cn(
                            'font-mono text-[9.5px] uppercase tracking-wider',
                            isCurrent && !isBlocked ? 'text-service-dev' :
                            isCurrent && isBlocked ? 'text-error' : 'text-text-4',
                          )}>
                            S{i + 1}
                          </span>
                          <span className={cn(
                            'font-ui font-semibold text-[11px] leading-snug max-w-[92px]',
                            isDone ? 'text-text-1' :
                            isCurrent ? 'text-white' :
                            'text-text-3',
                          )}>
                            {stage.name}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Blocked detail strip */}
                {project.stages.find((s) => s.status === 'blocked') && (
                  <div className="mt-6 flex items-center gap-3.5 p-3.5 rounded-sm"
                    style={{
                      background: 'linear-gradient(180deg, rgba(244,54,76,0.06), rgba(244,54,76,0.02))',
                      border: '1px solid rgba(244,54,76,0.33)',
                    }}
                  >
                    <span className="w-8 h-8 rounded-[8px] bg-error/18 text-error flex items-center justify-center flex-shrink-0">
                      <AlertTriangle size={16} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 font-display font-semibold text-[13px] text-text-1">
                        {project.stages.find((s) => s.status === 'blocked')?.name}
                        <span className="font-mono text-[9.5px] text-error bg-error/18 px-1.5 py-[2px] rounded uppercase tracking-wider">Blocked</span>
                      </div>
                      <p className="text-[11.5px] text-text-2 mt-0.5">
                        Client delayed UAT sign-off. <strong className="text-error">Following up Friday.</strong>
                      </p>
                    </div>
                    <span className="font-mono text-[10.5px] text-text-3 tracking-wider flex-shrink-0">3 days ago</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. Stage Approval Bar */}
          {stageNeedsApproval && (
            <div
              className="bg-surface-1 border border-border-default rounded-lg px-6 py-4 flex items-center gap-4 relative overflow-hidden"
              style={{ borderLeft: '3px solid #F59E0B' }}
            >
              <span className="w-10 h-10 rounded-[10px] bg-warning/15 text-warning border border-warning/30 flex items-center justify-center flex-shrink-0">
                <Clock size={18} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 font-display font-semibold text-[14px] text-text-1 leading-snug">
                  Awaiting Client Approval: {currentStage?.name}
                  <span className="font-mono text-[9.5px] text-warning bg-warning/13 border border-warning/30 px-1.5 py-[2px] rounded uppercase tracking-wider">Pending</span>
                </div>
                <p className="text-[12px] text-text-3 mt-1 leading-snug">
                  Submitted <strong className="text-text-2">3 days ago</strong> · Client notified by email · Waiting on <strong className="text-text-2">Imran Shah</strong>
                </p>
              </div>
              <div className="flex gap-2 items-center flex-shrink-0">
                <button className="h-9 px-4 bg-brand-red text-white font-ui font-semibold text-[12.5px] rounded-sm flex items-center gap-1.5 hover:bg-brand-red-hover transition-colors shadow-[0_4px_12px_rgba(238,39,55,0.2)]">
                  <CheckCheck size={13} /> Approve
                </button>
                <button className="h-9 px-3.5 border border-border-default text-text-2 font-ui font-semibold text-[12.5px] rounded-sm flex items-center gap-1.5 hover:bg-surface-2 transition-colors">
                  <RotateCcw size={13} /> Request Revision
                </button>
              </div>
            </div>
          )}

          {/* 4. Task List */}
          <div className="bg-surface-1 border border-border-default rounded-lg overflow-hidden">
            {/* Task toolbar */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border-subtle">
              <div className="flex items-center gap-2.5">
                <span className="font-display font-semibold text-[14px] text-text-1 flex items-center gap-2.5">
                  Tasks
                  {currentStage && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-[3px] rounded-full bg-surface-2 font-mono text-[10.5px] text-text-2 font-medium tracking-wider">
                      <span className={cn('w-[5px] h-[5px] rounded-full', project.status === 'blocked' ? 'bg-error' : 'bg-service-dev')} />
                      {currentStage.name}
                    </span>
                  )}
                </span>
                <span className="font-mono text-[10.5px] text-text-3 bg-surface-2 rounded-full px-2 py-[2px] uppercase tracking-wider">
                  {allTasks.length} tasks
                </span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Select
                  size="sm"
                  value={statusFilter}
                  onChange={(v) => setStatusFilter(v as TaskStatus | 'all')}
                  options={[
                    { value: 'all', label: 'All Status' },
                    { value: 'todo', label: 'To Do' },
                    { value: 'in_progress', label: 'In Progress' },
                    { value: 'review', label: 'Review' },
                    { value: 'blocked', label: 'Blocked' },
                    { value: 'completed', label: 'Completed' },
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
                <button className="h-[30px] px-2.5 bg-surface-2 border border-border-default rounded-[6px] text-text-2 font-ui font-semibold text-[11.5px] flex items-center gap-1.5 hover:bg-surface-3 hover:text-text-1 transition-colors">
                  <Plus size={12} /> Add Task
                </button>
              </div>
            </div>

            {/* Task table */}
            <div
              className="grid"
              style={{ gridTemplateColumns: 'minmax(280px,2.4fr) 130px 120px 110px 100px 80px 96px' }}
            >
              {['Task', 'Assignee', 'Status', 'Priority', 'Due', 'XP', ''].map((h, i) => (
                <div
                  key={h + i}
                  className={cn(
                    'px-3.5 py-2.5 bg-surface-2 border-b border-border-subtle font-ui font-semibold text-[10px] text-text-3 uppercase tracking-wider flex items-center',
                    i === 0 && 'pl-5',
                    i === 6 && 'pr-[18px] justify-end',
                  )}
                >
                  {h}
                </div>
              ))}

              {filteredTasks.map((task) => {
                const taskDays = getDaysUntil(task.dueDate)
                const isBlocked = task.status === 'blocked'
                return (
                  <div key={task.id} className="contents group">
                    {/* Title */}
                    <div className={cn(
                      'pl-5 pr-3.5 py-[11px] border-b border-border-subtle flex items-center min-w-0 group-hover:bg-white/[0.018] transition-colors',
                      isBlocked && 'bg-error/4',
                      isBlocked && 'shadow-[inset_2px_0_0_rgba(244,54,76,1)]',
                    )}>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/admin/tasks/${task.id}`}
                            className="font-ui font-medium text-[13.5px] text-text-1 hover:text-brand-red transition-colors"
                          >
                            {task.title}
                          </Link>
                          {task.clickUpId && (
                            <span className="font-mono text-[10px] text-text-4">{task.clickUpId}</span>
                          )}
                        </div>
                        {taskDays <= 0 && (
                          <span className="font-mono text-[10.5px] text-error font-semibold tracking-wider uppercase">
                            {Math.abs(taskDays)}d overdue
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Assignee */}
                    <div className={cn('px-3.5 py-[11px] border-b border-border-subtle flex items-center gap-2 min-w-0 group-hover:bg-white/[0.018] transition-colors', isBlocked && 'bg-error/4')}>
                      <Avatar name={task.assignee.name} size="xs" />
                      <span className="text-[12px] font-ui font-medium text-text-1 truncate">{task.assignee.name}</span>
                    </div>

                    {/* Status */}
                    <div className={cn('px-3.5 py-[11px] border-b border-border-subtle flex items-center group-hover:bg-white/[0.018] transition-colors', isBlocked && 'bg-error/4')}>
                      <StatusChip status={task.status} />
                    </div>

                    {/* Priority */}
                    <div className={cn('px-3.5 py-[11px] border-b border-border-subtle flex items-center group-hover:bg-white/[0.018] transition-colors', isBlocked && 'bg-error/4')}>
                      <PriorityChip priority={task.priority} />
                    </div>

                    {/* Due */}
                    <div className={cn('px-3.5 py-[11px] border-b border-border-subtle group-hover:bg-white/[0.018] transition-colors', isBlocked && 'bg-error/4')}>
                      <span className={cn('font-mono text-[11.5px] font-medium tabular-nums block', taskDays < 0 ? 'text-error' : taskDays <= 2 ? 'text-warning' : 'text-text-1')}>
                        {formatDate(task.dueDate)}
                      </span>
                      <span className="font-mono text-[9.5px] text-text-3 uppercase tracking-wider mt-0.5 block">
                        {taskDays < 0 ? 'Overdue' : taskDays === 0 ? 'Today' : `${taskDays}d`}
                      </span>
                    </div>

                    {/* XP */}
                    <div className={cn('px-3.5 py-[11px] border-b border-border-subtle flex items-center group-hover:bg-white/[0.018] transition-colors', isBlocked && 'bg-error/4')}>
                      <span className="inline-flex items-center gap-1 bg-coin-gold/12 border border-coin-gold/30 text-coin-gold font-display font-bold text-[11.5px] rounded-full px-2 py-[3px]">
                        <Zap size={10} />
                        {task.xpReward}
                      </span>
                    </div>

                    {/* Meta icons */}
                    <div className={cn('pr-[18px] px-3.5 py-[11px] border-b border-border-subtle flex items-center gap-1.5 justify-end group-hover:bg-white/[0.018] transition-colors', isBlocked && 'bg-error/4')}>
                      <span className={cn(
                        'w-[26px] h-[26px] rounded-[6px] bg-surface-2 border border-border-default flex items-center justify-center cursor-pointer hover:bg-surface-3 transition-colors',
                        task.clientVisible ? 'text-success bg-success/10 border-success/30' : 'text-text-3',
                      )}>
                        {task.clientVisible ? <Eye size={12} /> : <EyeOff size={12} />}
                      </span>
                      <ClickUpStatus status={task.clickUpSync} />
                      <Link
                        to={`/admin/tasks/${task.id}`}
                        className="w-[26px] h-[26px] rounded-[6px] bg-surface-2 border border-border-default text-text-2 flex items-center justify-center hover:bg-surface-3 hover:text-text-1 transition-colors"
                      >
                        <ExternalLink size={12} />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Add task row */}
            <div className="px-5 py-3.5 flex items-center gap-3">
              <button className="h-9 px-3.5 border border-dashed border-border-strong text-text-2 font-ui font-semibold text-[12.5px] rounded-[6px] flex items-center gap-2 hover:bg-surface-2 hover:text-text-1 hover:border-solid transition-all">
                <Plus size={12} /> Add Task
              </button>
              <div className="ml-auto font-mono text-[10.5px] text-text-4 tracking-wider">
                Press <kbd className="font-mono text-[10px] px-1.5 py-[1px] bg-surface-2 border border-border-default rounded text-text-2">N</kbd> to add
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="flex flex-col gap-5 sticky top-[88px]" style={{ alignSelf: 'start' }}>

          {/* Team Members */}
          <div className="bg-surface-1 border border-border-default rounded-lg overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border-subtle">
              <span className="font-display font-semibold text-[13px] text-text-1">Team</span>
              <span className="font-mono text-[10.5px] text-text-3 bg-surface-2 rounded-full px-2 py-[2px] uppercase tracking-wider">{teamMembers.length}</span>
              <button className="ml-auto h-[26px] px-2.5 text-[11px] font-semibold bg-surface-2 border border-border-default rounded-[6px] text-text-2 hover:bg-surface-3 hover:text-text-1 flex items-center gap-1.5 transition-colors">
                <Plus size={11} /> Add
              </button>
            </div>
            {teamMembers.map((member) => {
              const workload = member.id === 'u2' ? 'heavy' : member.id === 'u3' ? 'medium' : 'light'
              const wPct = WORKLOAD_PCT[workload]
              const wCls = WORKLOAD_CLS[workload]
              return (
                <div key={member.id} className="flex items-center gap-3 px-[18px] py-3 border-b border-border-subtle last:border-0 hover:bg-white/[0.015] transition-colors">
                  <Avatar name={member.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-ui font-semibold text-[13px] text-text-1 truncate">{member.name}</span>
                    </div>
                    <span className="font-mono text-[10px] text-text-3 uppercase tracking-wider mt-0.5 block">{member.role}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <div className="w-14 h-1 bg-surface-inset rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full', wCls.split(' ')[1])} style={{ width: `${wPct}%` }} />
                    </div>
                    <span className={cn('font-mono text-[9.5px] tracking-wider font-medium', wCls.split(' ')[0])}>
                      {workload}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Upcoming Deadlines */}
          <div className="bg-surface-1 border border-border-default rounded-lg overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border-subtle">
              <span className="font-display font-semibold text-[13px] text-text-1">Deadlines</span>
              <span className="font-mono text-[10.5px] text-error bg-error/13 rounded-full px-2 py-[2px] uppercase tracking-wider border border-error/30">
                {allTasks.filter((t) => getDaysUntil(t.dueDate) <= 3).length} urgent
              </span>
            </div>
            {allTasks.slice(0, 4).map((task) => {
              const taskDays = getDaysUntil(task.dueDate)
              const d = new Date(task.dueDate)
              const isCrit = taskDays <= 2
              return (
                <div key={task.id} className="flex items-center gap-3 px-[18px] py-[11px] border-b border-border-subtle last:border-0 hover:bg-white/[0.015] transition-colors">
                  <div className={cn(
                    'w-[38px] h-[38px] rounded-[7px] flex flex-col items-center justify-center flex-shrink-0 border',
                    isCrit ? 'bg-error/13 border-error/30' : 'bg-surface-2 border-border-default',
                  )}>
                    <span className={cn('font-mono text-[8.5px] font-semibold uppercase tracking-wider leading-none mb-0.5', isCrit ? 'text-error' : 'text-text-3')}>
                      {d.toLocaleString('en', { month: 'short' })}
                    </span>
                    <span className={cn('font-display font-bold text-[15px] leading-none', isCrit ? 'text-error' : 'text-text-1')}>
                      {d.getDate()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-ui font-medium text-[12.5px] text-text-1 truncate">{task.title}</p>
                    <div className="flex items-center gap-1.5 mt-1 font-mono text-[10px] text-text-3 tracking-wider">
                      <Avatar name={task.assignee.name} size="xs" />
                      <span>{task.assignee.name}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Files */}
          {allTasks.some((t) => (t.files?.length ?? 0) > 0) && (
            <div className="bg-surface-1 border border-border-default rounded-lg overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border-subtle">
                <span className="font-display font-semibold text-[13px] text-text-1">Files</span>
                <button className="ml-auto h-[26px] px-2.5 text-[11px] font-semibold bg-surface-2 border border-border-default rounded-[6px] text-text-2 hover:bg-surface-3 hover:text-text-1 flex items-center gap-1.5 transition-colors">
                  <Plus size={11} /> Upload
                </button>
              </div>
              {allTasks.flatMap((t) => t.files ?? []).slice(0, 4).map((file) => {
                const Icon = FILE_ICON_MAP[file.type] ?? File
                return (
                  <div key={file.id} className="flex items-center gap-3 px-[18px] py-[11px] border-b border-border-subtle last:border-0 hover:bg-white/[0.015] transition-colors">
                    <span className={cn('w-9 h-9 rounded-[7px] border flex items-center justify-center font-mono text-[8.5px] font-bold tracking-wider flex-shrink-0', FILE_TYPE_CLS[file.type])}>
                      <Icon size={14} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-ui font-medium text-[12.5px] text-text-1 truncate">{file.name}</p>
                      <p className="font-mono text-[10px] text-text-3 tracking-wider mt-0.5">{file.uploadedBy} · {file.uploadedAt}</p>
                    </div>
                    <button className={cn(
                      'flex-shrink-0 flex items-center gap-1 h-[26px] px-2 rounded-[6px] border font-mono text-[9.5px] font-semibold uppercase tracking-wider transition-colors',
                      file.clientVisible
                        ? 'text-success bg-success/8 border-success/30 hover:bg-success/15'
                        : 'text-text-3 bg-surface-2 border-border-default hover:bg-surface-3',
                    )}>
                      {file.clientVisible ? <Eye size={11} /> : <EyeOff size={11} />}
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* ClickUp Sync */}
          <div className="bg-surface-1 border border-border-default rounded-lg overflow-hidden">
            <div className="p-4">
              <div className="flex items-center gap-2.5 pb-3.5 border-b border-border-subtle mb-3.5">
                <span className="w-9 h-9 rounded-[7px] bg-surface-2 border border-border-default flex items-center justify-center font-display font-bold text-[14px] text-service-mkt flex-shrink-0">
                  CU
                </span>
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-[9.5px] text-text-4 uppercase tracking-wider block">ClickUp Folder</span>
                  <span className="font-ui font-semibold text-[13px] text-text-1 block mt-0.5 truncate">
                    {project.clickUpFolder ?? 'Not linked'}
                  </span>
                </div>
              </div>
              {[
                { k: 'Sync Status', v: project.clickUpSync, err: project.clickUpSync === 'error' },
                { k: 'Last Synced', v: project.lastSynced ? new Date(project.lastSynced).toLocaleString() : '—' },
                { k: 'Tasks Synced', v: `${allTasks.filter((t) => t.clickUpSync === 'synced').length}/${allTasks.length}` },
              ].map((row) => (
                <div key={row.k} className="flex items-center justify-between py-1.5 text-[11.5px]">
                  <span className="font-mono text-[10px] text-text-3 uppercase tracking-wider">{row.k}</span>
                  <span className={cn('font-mono text-[11px] font-medium tabular-nums text-text-1', row.err && 'text-error font-semibold flex items-center gap-1.5')}>
                    {row.err && <span className="w-1.5 h-1.5 rounded-full bg-error inline-block" />}
                    {typeof row.v === 'string' ? row.v : <ClickUpStatus status={row.v} />}
                  </span>
                </div>
              ))}

              {project.clickUpSync === 'error' && (
                <div className="mt-3 p-2.5 bg-error/13 border border-error/30 rounded-[6px] text-[11.5px] text-error leading-snug flex gap-2">
                  <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-text-1 font-semibold block mb-0.5">Sync Failed</strong>
                    Authentication token expired. Re-authorize in Settings.
                  </div>
                </div>
              )}

              <button className="mt-3 w-full h-9 bg-surface-2 border border-border-default rounded-sm font-ui font-semibold text-[12.5px] text-text-1 flex items-center justify-center gap-1.5 hover:bg-surface-3 hover:border-border-strong transition-colors">
                <RefreshCw size={13} /> Retry Sync
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
