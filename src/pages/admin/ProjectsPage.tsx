import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  List, Columns, Plus, Search, ChevronDown, ChevronLeft, ChevronRight,
  MoreHorizontal, ArrowUpDown, Download, Calendar, AlertCircle,
  ExternalLink, Pencil, RefreshCw, Flag, CheckCircle2, Clock,
} from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Avatar } from '../../components/ui/Avatar'
import { Select } from '../../components/ui/Select'
import { ServiceChip } from '../../components/shared/ServiceChip'
import { StatusChip } from '../../components/shared/StatusChip'
import { ClickUpStatus } from '../../components/shared/ClickUpStatus'
import { PROJECTS } from '../../data/mock'
import { formatDate, getDaysUntil } from '../../lib/utils'
import { cn } from '../../lib/cn'
import type { ServiceType, ProjectStatus, Project } from '../../types'
import { NewProjectModal } from './NewProjectModal'

type ViewMode = 'list' | 'kanban' | 'timeline' | 'milestones'

const SERVICE_COLORS: Record<ServiceType, string> = {
  design: '#A78BFA',
  development: '#22D3EE',
  marketing: '#FBBF24',
}

const TILE_GRADIENT: Record<ServiceType, string> = {
  development: 'linear-gradient(135deg, #67E8F9, #06B6D4)',
  design: 'linear-gradient(135deg, #C4B5FD, #8B5CF6)',
  marketing: 'linear-gradient(135deg, #FCD34D, #F59E0B)',
}

const TILE_TEXT: Record<ServiceType, string> = {
  development: '#04212a',
  design: '#fff',
  marketing: '#1A1306',
}

const PROGRESS_COLOR = (pct: number): string => {
  if (pct < 25) return 'linear-gradient(90deg, #4A5468, #5C6A7F)'
  if (pct < 60) return 'linear-gradient(90deg, #F59E0B, #FBBF24)'
  if (pct < 85) return 'linear-gradient(90deg, #EE2737, #F94454)'
  return 'linear-gradient(90deg, #22C55E, #34D399)'
}

const KANBAN_COLS: { status: ProjectStatus; label: string; topColor: string; dotColor: string; countCls: string }[] = [
  { status: 'in_progress',     label: 'In Progress',     topColor: '#22C55E', dotColor: '#22C55E', countCls: 'text-text-2 bg-surface-3' },
  { status: 'awaiting_client', label: 'Awaiting Client',  topColor: '#F59E0B', dotColor: '#F59E0B', countCls: 'text-warning bg-warning/10' },
  { status: 'blocked',         label: 'Blocked',         topColor: '#F4364C', dotColor: '#F4364C', countCls: 'text-error bg-error/13' },
  { status: 'completed',       label: 'Completed',       topColor: '#5C6A7F', dotColor: '#7A8597', countCls: 'text-text-3 bg-surface-3' },
]

const PER_PAGE = 10
const PM_LIST = Array.from(new Map(PROJECTS.map(p => [p.pm.id, p.pm])).values())
const initials = (name: string) => name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

// ─────────────────────────────────────────────────
// Kanban Card
// ─────────────────────────────────────────────────

interface KanbanCardProps {
  project: Project
  colStatus: ProjectStatus
  isDragging: boolean
  isMenuOpen: boolean
  onMenuToggle: (e: React.MouseEvent) => void
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragEnd: () => void
}

function KanbanCard({ project, colStatus, isDragging, isMenuOpen, onMenuToggle, onDragStart, onDragEnd }: KanbanCardProps) {
  const navigate = useNavigate()
  const days = getDaysUntil(project.deadline)
  const isBlocked = colStatus === 'blocked'
  const isAwaiting = colStatus === 'awaiting_client'
  const isUrgent = days <= 3 && colStatus !== 'completed'
  const stageNum = Math.max(1, project.stages.findIndex(s => s.status === 'current' || s.status === 'blocked') + 1)

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, project.id)}
      onDragEnd={onDragEnd}
      onClick={() => navigate(`/admin/projects/${project.id}`)}
      className={cn(
        'relative bg-surface-2 border rounded-[8px] flex flex-col cursor-grab active:cursor-grabbing transition-all select-none group/card',
        'hover:bg-surface-3 hover:border-border-strong hover:shadow-sm',
        isDragging ? 'opacity-40' : '',
        isUrgent ? 'bg-linear-to-b from-error/8 to-error/2 border-error/30' : 'border-border-default',
      )}
    >
      {isUrgent && <span className="absolute left-0 inset-y-3 w-[2px] rounded-full bg-error" />}

      <div className="p-[12px_14px] flex flex-col gap-2.5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-display font-semibold text-[13.5px] text-text-1 leading-snug tracking-tight">{project.name}</p>
            <p className="font-mono text-[10.5px] text-text-3 uppercase tracking-wider mt-0.5">{project.clientName}</p>
          </div>
          <div
            className="relative shrink-0"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onMenuToggle}
              className="size-[22px] rounded-xs text-text-4 hover:bg-white/5 hover:text-text-2 flex items-center justify-center transition-colors"
            >
              <MoreHorizontal size={12} />
            </button>
            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-surface-2 border border-border-strong rounded-md shadow-xl overflow-hidden min-w-[164px]">
                <button
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[12.5px] font-ui text-text-1 hover:bg-surface-3 transition-colors text-left"
                  onClick={(e) => { e.stopPropagation(); navigate(`/admin/projects/${project.id}`) }}
                >
                  <ExternalLink size={12} className="text-text-3" /> View Detail
                </button>
                <button
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[12.5px] font-ui text-text-1 hover:bg-surface-3 transition-colors text-left"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Pencil size={12} className="text-text-3" /> Edit Project
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Service chip */}
        <div><ServiceChip service={project.serviceType} /></div>

        {/* Blocked / Awaiting banner */}
        {(isBlocked || isAwaiting) && (
          <div className={cn(
            'flex items-start gap-1.5 rounded-sm px-2.5 py-2 text-label/snug font-ui border',
            isBlocked ? 'bg-error/10 border-error/20 text-error' : 'bg-warning/10 border-warning/20 text-warning',
          )}>
            <AlertCircle size={11} className="shrink-0 mt-0.5" />
            <span>
              <strong className="font-semibold">{isBlocked ? 'Blocker' : 'Waiting'}</strong>
              {' · '}{project.currentStage}
            </span>
          </div>
        )}

        {/* Stage row */}
        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-surface-inset border border-border-subtle rounded-sm">
          <span className="font-mono text-[9px] text-text-4 uppercase tracking-wider shrink-0">Stage</span>
          <span className="font-ui text-[11.5px] text-text-1 font-medium flex-1 truncate">{project.currentStage}</span>
          <span className="font-mono text-[10px] text-text-4 shrink-0">{stageNum}/{project.stages.length}</span>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-surface-inset rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${project.progress}%`, background: PROGRESS_COLOR(project.progress) }} />
          </div>
          <span className="font-mono text-[10px] text-text-3 tabular-nums">{project.progress}%</span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-dashed border-border-subtle">
          <span className={cn(
            'flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider',
            days <= 0 ? 'text-error font-bold' : days <= 3 ? 'text-error' : days <= 7 ? 'text-warning' : 'text-text-3',
          )}>
            <Calendar size={10} />
            {days <= 0 ? 'Overdue' : `${days}d`}
          </span>
          <div className="flex items-center gap-2">
            <ClickUpStatus status={project.clickUpSync} />
            <Avatar name={project.pm.name} size="xs" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────
// Timeline View
// ─────────────────────────────────────────────────

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const TODAY = new Date('2026-05-16')

function TimelineView({ projects }: { projects: typeof PROJECTS }) {
  const parsed = projects.map(p => ({
    ...p,
    start: p.startDate ? new Date(p.startDate) : new Date(new Date(p.deadline).getTime() - 60 * 86400000),
    end: new Date(p.deadline),
  }))

  if (parsed.length === 0) return (
    <div className="bg-surface-1 border border-border-default rounded-md flex flex-col items-center justify-center py-16 gap-3">
      <span className="font-display font-semibold text-[14px] text-text-2">No projects to display</span>
    </div>
  )

  const rangeStart = new Date(Math.min(...parsed.map(p => p.start.getTime())))
  rangeStart.setDate(1)
  const rangeEnd = new Date(Math.max(...parsed.map(p => p.end.getTime())))
  rangeEnd.setMonth(rangeEnd.getMonth() + 1); rangeEnd.setDate(0)

  const totalMs = rangeEnd.getTime() - rangeStart.getTime()
  const pct = (d: Date) => Math.max(0, Math.min(100, ((d.getTime() - rangeStart.getTime()) / totalMs) * 100))

  const months: { date: Date; left: number; width: number }[] = []
  const m = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1)
  while (m <= rangeEnd) {
    const ms = new Date(m)
    const me = new Date(m.getFullYear(), m.getMonth() + 1, 0)
    months.push({ date: ms, left: pct(ms), width: ((Math.min(me.getTime(), rangeEnd.getTime()) - ms.getTime()) / totalMs) * 100 })
    m.setMonth(m.getMonth() + 1)
  }

  const todayPct = pct(TODAY)

  return (
    <div className="bg-surface-1 border border-border-default rounded-md overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border-subtle">
        <span className="font-display font-semibold text-[14px] text-text-1">Timeline</span>
        <span className="font-mono text-[10.5px] text-text-3 bg-surface-2 rounded-full px-2 py-[2px] uppercase tracking-wider">{parsed.length} projects</span>
        <div className="ml-auto flex items-center gap-1.5 font-mono text-[10.5px] text-text-3">
          <span className="size-2 rounded-full bg-brand-red inline-block" />
          Today · May 16 '26
        </div>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: 900 }}>
          {/* Month header */}
          <div className="flex border-b border-border-subtle bg-surface-2">
            <div className="w-[220px] shrink-0 px-5 py-2.5 font-ui font-semibold text-[10px] text-text-3 uppercase tracking-wider border-r border-border-subtle">
              Project
            </div>
            <div className="flex-1 relative h-9">
              {months.map((month, i) => (
                <div
                  key={i}
                  className="absolute inset-y-0 flex items-center justify-center border-r border-border-subtle last:border-r-0"
                  style={{ left: `${month.left}%`, width: `${month.width}%` }}
                >
                  <span className="font-mono text-[9.5px] text-text-3 uppercase tracking-wider">
                    {MONTH_NAMES[month.date.getMonth()]} '{String(month.date.getFullYear()).slice(2)}
                  </span>
                </div>
              ))}
              <div className="absolute inset-y-0 w-px bg-brand-red/50 z-10" style={{ left: `${todayPct}%` }} />
            </div>
          </div>

          {/* Project rows */}
          {parsed.map(project => {
            const startPct = pct(project.start)
            const endPct = pct(project.end)
            const barWidth = endPct - startPct
            const isOverdue = project.end < TODAY
            return (
              <div key={project.id} className="flex items-center border-b border-border-subtle last:border-b-0 hover:bg-white/1.5 transition-colors">
                <div className="w-[220px] shrink-0 px-4 py-3 border-r border-border-subtle flex items-center gap-2.5 min-w-0">
                  <div
                    className="size-7 rounded-sm flex items-center justify-center font-display font-bold text-[11px] shrink-0"
                    style={{ background: TILE_GRADIENT[project.serviceType], color: TILE_TEXT[project.serviceType] }}
                  >
                    {project.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-ui font-medium text-[12.5px] text-text-1 truncate">{project.name}</p>
                    <p className="font-mono text-[9.5px] text-text-3 uppercase tracking-wider">{project.progress}% done</p>
                  </div>
                </div>
                <div className="flex-1 relative h-[52px]">
                  {/* Month gridlines */}
                  {months.map((month, i) => (
                    <div key={i} className="absolute inset-y-0 border-r border-border-subtle/50" style={{ left: `${month.left + month.width}%` }} />
                  ))}
                  {/* Today line */}
                  <div className="absolute inset-y-0 w-px bg-brand-red/30 z-10" style={{ left: `${todayPct}%` }} />
                  {/* Bar track */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-7 rounded-[5px] overflow-hidden"
                    style={{
                      left: `${startPct}%`,
                      width: `${barWidth}%`,
                      background: `${SERVICE_COLORS[project.serviceType]}18`,
                      border: `1px solid ${SERVICE_COLORS[project.serviceType]}35`,
                    }}
                  >
                    <div
                      className="h-full rounded-[5px]"
                      style={{ width: `${project.progress}%`, background: `${SERVICE_COLORS[project.serviceType]}55` }}
                    />
                    <span
                      className="absolute inset-0 flex items-center px-2 font-mono text-[9px] uppercase tracking-wider truncate"
                      style={{ color: SERVICE_COLORS[project.serviceType] }}
                    >
                      {project.currentStage}
                    </span>
                  </div>
                  {/* Deadline dot */}
                  <div
                    className={cn('absolute top-1/2 -translate-y-1/2 size-[7px] rounded-full ml-[-3px] z-20', isOverdue ? 'bg-error' : 'bg-text-3')}
                    style={{ left: `${endPct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────
// Milestones View
// ─────────────────────────────────────────────────

function MilestonesView({ projects }: { projects: typeof PROJECTS }) {
  const rows = projects.flatMap(project =>
    project.stages
      .filter(s => s.requiresApproval || s.status === 'current' || s.status === 'blocked')
      .map(stage => ({ project, stage }))
  ).sort((a, b) => {
    const order = { blocked: 0, current: 1, upcoming: 2, completed: 3 } as Record<string, number>
    return (order[a.stage.status ?? 'upcoming'] ?? 2) - (order[b.stage.status ?? 'upcoming'] ?? 2)
  })

  if (rows.length === 0) return (
    <div className="bg-surface-1 border border-border-default rounded-md flex flex-col items-center justify-center py-16 gap-3 text-center">
      <span className="size-12 rounded-xl bg-surface-2 border border-dashed border-border-strong text-text-3 flex items-center justify-center">
        <Flag size={18} />
      </span>
      <p className="font-display font-semibold text-[14px] text-text-2">No milestones found</p>
      <p className="text-[12.5px] text-text-3">Projects with approval stages will appear here</p>
    </div>
  )

  const blockedCount = rows.filter(r => r.stage.status === 'blocked').length
  const pendingCount = rows.filter(r => r.stage.approvalStatus === 'pending').length

  return (
    <div className="bg-surface-1 border border-border-default rounded-md overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border-subtle">
        <span className="font-display font-semibold text-[14px] text-text-1">Milestones</span>
        <span className="font-mono text-[10.5px] text-text-3 bg-surface-2 rounded-full px-2 py-[2px] uppercase tracking-wider">{rows.length} total</span>
        {blockedCount > 0 && (
          <span className="font-mono text-[10.5px] text-error bg-error/12 border border-error/30 rounded-full px-2 py-[2px] uppercase tracking-wider">{blockedCount} blocked</span>
        )}
        {pendingCount > 0 && (
          <span className="font-mono text-[10.5px] text-warning bg-warning/12 border border-warning/30 rounded-full px-2 py-[2px] uppercase tracking-wider">{pendingCount} awaiting approval</span>
        )}
      </div>

      {/* Table header */}
      <div className="grid bg-surface-2 border-b border-border-default" style={{ gridTemplateColumns: '2fr 180px 130px 130px 140px' }}>
        {['Milestone', 'Project', 'Service', 'Stage Status', 'Approval'].map((col, i) => (
          <div key={col} className={cn('px-4 py-2.5 font-ui font-semibold text-[10px] text-text-3 uppercase tracking-wider', i === 0 && 'pl-5')}>
            {col}
          </div>
        ))}
      </div>

      {rows.map(({ project, stage }) => (
        <div
          key={`${project.id}-${stage.id}`}
          className="grid border-b border-border-subtle last:border-b-0 hover:bg-white/[0.018] transition-colors"
          style={{ gridTemplateColumns: '2fr 180px 130px 130px 140px' }}
        >
          <div className="pl-5 pr-4 py-3.5 flex items-center gap-3 min-w-0">
            <span className={cn(
              'size-2 rounded-full shrink-0',
              stage.status === 'completed' ? 'bg-success' :
              stage.status === 'blocked' ? 'bg-error shadow-[0_0_0_3px_rgba(244,54,76,0.18)]' :
              stage.status === 'current' ? 'bg-service-dev' : 'bg-border-strong',
            )} />
            <div className="min-w-0">
              <p className="font-ui font-medium text-[13px] text-text-1 truncate">{stage.name}</p>
              <p className="font-mono text-[9.5px] text-text-4 uppercase tracking-wider mt-0.5">
                Stage {stage.order} · {stage.requiresApproval ? 'Requires Approval' : 'Key Stage'}
              </p>
            </div>
          </div>

          <div className="px-4 py-3.5 flex items-center min-w-0">
            <div className="min-w-0">
              <p className="font-ui font-medium text-[12.5px] text-text-1 truncate">{project.name}</p>
              <p className="font-mono text-[9.5px] text-text-3 uppercase tracking-wider mt-0.5">{project.clientName}</p>
            </div>
          </div>

          <div className="px-4 py-3.5 flex items-center">
            <ServiceChip service={project.serviceType} />
          </div>

          <div className="px-4 py-3.5 flex items-center">
            {stage.status === 'completed' ? (
              <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider px-2 py-[3px] rounded-xs font-semibold border bg-success/12 text-success border-success/30">
                <CheckCircle2 size={10} /> Done
              </span>
            ) : stage.status === 'blocked' ? (
              <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider px-2 py-[3px] rounded-xs font-semibold border bg-error/12 text-error border-error/30">
                <AlertCircle size={10} /> Blocked
              </span>
            ) : stage.status === 'current' ? (
              <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider px-2 py-[3px] rounded-xs font-semibold border bg-service-dev/12 text-service-dev border-service-dev/30">
                <Clock size={10} /> Active
              </span>
            ) : (
              <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-[3px] rounded-xs font-semibold border bg-surface-2 text-text-3 border-border-default">
                Upcoming
              </span>
            )}
          </div>

          <div className="px-4 py-3.5 flex items-center">
            {stage.requiresApproval ? (
              <span className={cn(
                'font-mono text-[10px] uppercase tracking-wider px-2 py-[3px] rounded-xs font-semibold border',
                stage.approvalStatus === 'approved' ? 'bg-success/12 text-success border-success/30' :
                stage.approvalStatus === 'pending' ? 'bg-warning/12 text-warning border-warning/30' :
                stage.approvalStatus === 'rejected' ? 'bg-error/12 text-error border-error/30' :
                'bg-surface-2 text-text-3 border-border-default',
              )}>
                {stage.approvalStatus === 'approved' ? 'Approved' :
                 stage.approvalStatus === 'pending' ? 'Pending' :
                 stage.approvalStatus === 'rejected' ? 'Rejected' :
                 stage.approvalStatus === 'revision_requested' ? 'Revision' : 'Not Submitted'}
              </span>
            ) : (
              <span className="font-mono text-[10px] text-text-4">—</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────

export default function ProjectsPage() {
  const navigate = useNavigate()
  const [view, setView] = useState<ViewMode>('list')
  const [serviceFilter, setServiceFilter] = useState<ServiceType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all')
  const [pmFilter, setPmFilter] = useState('all')
  const [sortBy, setSortBy] = useState('deadline')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showNewModal, setShowNewModal] = useState(false)

  // Kanban drag-and-drop
  const [kanbanStatuses, setKanbanStatuses] = useState<Record<string, ProjectStatus>>(
    () => Object.fromEntries(PROJECTS.map(p => [p.id, p.status]))
  )
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<ProjectStatus | null>(null)
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  useEffect(() => {
    if (!openMenu) return
    const handler = () => setOpenMenu(null)
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openMenu])

  // Base filter/sort (no status — used for kanban)
  const applyBase = (list: typeof PROJECTS) =>
    list
      .filter(p => {
        if (serviceFilter !== 'all' && p.serviceType !== serviceFilter) return false
        if (pmFilter !== 'all' && p.pm.id !== pmFilter) return false
        if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.clientName.toLowerCase().includes(search.toLowerCase())) return false
        return true
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name)
        if (sortBy === 'progress') return b.progress - a.progress
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      })

  const listFiltered = applyBase(PROJECTS).filter(p => statusFilter === 'all' || p.status === statusFilter)
  const kanbanFiltered = applyBase(PROJECTS)
  const totalPages = Math.max(1, Math.ceil(listFiltered.length / PER_PAGE))
  const paginated = listFiltered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id)
    e.dataTransfer.effectAllowed = 'move'
  }
  const handleDragOver = (e: React.DragEvent, status: ProjectStatus) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverCol !== status) setDragOverCol(status)
  }
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverCol(null)
  }
  const handleDrop = (e: React.DragEvent, status: ProjectStatus) => {
    e.preventDefault()
    if (draggedId) setKanbanStatuses(prev => ({ ...prev, [draggedId]: status }))
    setDraggedId(null)
    setDragOverCol(null)
  }
  const handleDragEnd = () => { setDraggedId(null); setDragOverCol(null) }

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Projects" />

      <div className="p-7 flex flex-col gap-5 max-w-content mx-auto w-full">

        {/* ── Page header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display font-bold text-[26px] text-text-1 tracking-tight flex items-center gap-3">
              Projects
              <span className="font-mono text-[12px] text-text-3 bg-surface-2 border border-border-subtle rounded-full px-2.5 py-0.5 font-normal tracking-wide uppercase">
                {PROJECTS.length} total
              </span>
            </h2>
            <p className="text-body-sm text-text-3 mt-1.5 font-ui">
              Live view across Design, Development & Marketing
              <span className="mx-1.5 opacity-30">·</span>
              {PROJECTS.filter(p => p.status === 'blocked').length} blocked
              <span className="mx-1.5 opacity-30">·</span>
              {PROJECTS.filter(p => getDaysUntil(p.deadline) <= 5 && p.status !== 'completed').length} due soon
            </p>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button className="h-9 px-3.5 bg-surface-2 border border-border-default text-text-2 font-ui font-medium text-[13px] rounded-sm flex items-center gap-1.5 hover:bg-surface-3 hover:text-text-1 transition-colors">
              <Download size={13} /> Export
            </button>
            <button
              onClick={() => setShowNewModal(true)}
              className="h-9 px-4 bg-brand-red text-white font-ui font-semibold text-[13px] rounded-sm flex items-center gap-1.5 hover:bg-brand-red-hover transition-colors shadow-[0_4px_12px_rgba(238,39,55,0.2)]"
            >
              <Plus size={14} /> New Project
            </button>
          </div>
        </div>

        {/* ── Filter bar ── */}
        <div className="bg-surface-1 border border-border-default rounded-md p-3.5 flex items-center gap-2.5 flex-wrap">
          {/* Search */}
          <div className="flex items-center gap-2 h-9 min-w-[240px] flex-1 bg-surface-inset border border-border-default rounded-sm px-3 transition-colors focus-within:border-border-focus">
            <Search size={14} className="text-text-3 shrink-0" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search projects or clients..."
              className="bg-transparent border-0 outline-none text-[13px] font-ui text-text-1 placeholder:text-text-3 flex-1 min-w-0"
            />
            {search && (
              <button onClick={() => { setSearch(''); setPage(1) }} className="text-text-3 hover:text-text-2 shrink-0">
                <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
          </div>

          <div className="h-5 w-px bg-border-subtle shrink-0" />

          <Select
            value={serviceFilter}
            onChange={(v) => { setServiceFilter(v as ServiceType | 'all'); setPage(1) }}
            label="Service"
            options={[
              { value: 'all', label: 'All', dot: 'linear-gradient(135deg, #A78BFA, #22D3EE, #FBBF24)' },
              { value: 'design', label: 'Design', dot: SERVICE_COLORS.design },
              { value: 'development', label: 'Dev', dot: SERVICE_COLORS.development },
              { value: 'marketing', label: 'Mkt', dot: SERVICE_COLORS.marketing },
            ]}
            size="sm"
          />

          {(view === 'list') && (
            <Select
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v as ProjectStatus | 'all'); setPage(1) }}
              label="Status"
              options={[
                { value: 'all', label: 'All' },
                { value: 'in_progress', label: 'In Progress', dot: '#22C55E' },
                { value: 'awaiting_client', label: 'Awaiting', dot: '#F59E0B' },
                { value: 'blocked', label: 'Blocked', dot: '#F4364C' },
                { value: 'completed', label: 'Completed', dot: '#5C6A7F' },
                { value: 'on_hold', label: 'On Hold', dot: '#7A8597' },
              ]}
              size="sm"
            />
          )}

          <Select
            value={pmFilter}
            onChange={(v) => { setPmFilter(v); setPage(1) }}
            label="PM"
            options={[
              { value: 'all', label: 'Any' },
              ...PM_LIST.map(pm => ({ value: pm.id, label: pm.name.split(' ')[0] })),
            ]}
            size="sm"
          />

          <Select
            value={sortBy}
            onChange={setSortBy}
            label="Sort"
            options={[
              { value: 'deadline', label: 'Deadline' },
              { value: 'name', label: 'Name' },
              { value: 'progress', label: 'Progress' },
            ]}
            size="sm"
          />

          <div className="ml-auto flex items-center gap-3">
            <span className="font-mono text-[11px] text-text-3 uppercase tracking-wider whitespace-nowrap hidden sm:block">
              {view === 'list' ? listFiltered.length : kanbanFiltered.length} shown
            </span>
            <div className="h-5 w-px bg-border-subtle" />
            <div className="flex items-center bg-surface-2 border border-border-default rounded-sm p-[3px] gap-[2px]">
              {([
                { mode: 'list' as const, Icon: List, title: 'List view' },
                { mode: 'kanban' as const, Icon: Columns, title: 'Kanban view' },
                { mode: 'timeline' as const, Icon: Calendar, title: 'Timeline view' },
                { mode: 'milestones' as const, Icon: Flag, title: 'Milestones view' },
              ] as const).map(({ mode, Icon, title }) => (
                <button
                  key={mode}
                  onClick={() => setView(mode)}
                  title={title}
                  className={cn(
                    'w-[30px] h-[28px] rounded-xs flex items-center justify-center transition-colors',
                    view === mode ? 'bg-surface-3 text-text-1 shadow-sm' : 'text-text-3 hover:text-text-2',
                  )}
                >
                  <Icon size={14} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── LIST VIEW ── */}
        {view === 'list' && (
          <div className="bg-surface-1 border border-border-default rounded-md overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-3 px-[18px] py-[14px] border-b border-border-subtle">
              <span className="font-display font-semibold text-[14px] text-text-1">All Projects</span>
              <span className="font-mono text-[10.5px] text-text-3 bg-surface-2 rounded-full px-2 py-[2px] uppercase tracking-wider">
                {listFiltered.length} results
              </span>
              <div className="ml-auto flex items-center gap-2">
                <span className="font-mono text-[11px] text-text-3 tracking-wider hidden md:block">Last sync · 2 min ago</span>
                <button className="size-[30px] rounded-sm border border-border-default bg-surface-2 text-text-2 hover:bg-surface-3 hover:text-text-1 flex items-center justify-center transition-colors" title="Refresh">
                  <RefreshCw size={12} />
                </button>
                <button className="size-[30px] rounded-sm border border-border-default bg-surface-2 text-text-2 hover:bg-surface-3 hover:text-text-1 flex items-center justify-center transition-colors" title="Column settings">
                  <ArrowUpDown size={12} />
                </button>
              </div>
            </div>

            {/* Table */}
            <div
              className="grid"
              style={{ gridTemplateColumns: 'minmax(220px,1.7fr) 130px 120px 130px 120px 140px 100px 100px 52px 64px' }}
            >
              {/* Header row */}
              {['Project', 'Client', 'Service', 'Stage', 'Status', 'Progress', 'Deadline', 'PM', 'CU', ''].map((label, i) => (
                <div
                  key={i}
                  className={cn(
                    'p-3 bg-surface-2 border-b border-border-default font-ui font-semibold text-[10.5px] text-text-3 uppercase tracking-wider flex items-center gap-1 select-none',
                    i === 0 && 'pl-5',
                    i === 9 && 'pr-[18px] justify-end',
                    (label === 'Project' || label === 'Progress' || label === 'Deadline') && 'cursor-pointer hover:text-text-2 transition-colors',
                  )}
                >
                  {label}
                  {(label === 'Project' || label === 'Progress' || label === 'Deadline') && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-2.5 opacity-50"><polyline points="6 9 12 15 18 9"/></svg>
                  )}
                </div>
              ))}

              {/* Data rows */}
              {paginated.map((project) => {
                const days = getDaysUntil(project.deadline)
                const stageIdx = project.stages.findIndex(s => s.status === 'current' || s.status === 'blocked')
                return (
                  <div key={project.id} className="contents group">
                    {/* Project */}
                    <div
                      className="pl-5 pr-3 py-3.5 border-b border-border-subtle flex items-center gap-3 min-w-0 group-hover:bg-white/[0.018] transition-colors cursor-pointer"
                      onClick={() => navigate(`/admin/projects/${project.id}`)}
                    >
                      <div
                        className="size-[34px] rounded-[8px] flex items-center justify-center font-display font-bold text-[12px] shrink-0"
                        style={{ background: TILE_GRADIENT[project.serviceType], color: TILE_TEXT[project.serviceType] }}
                      >
                        {initials(project.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-display font-semibold text-[13.5px] text-text-1 truncate tracking-tight">{project.name}</p>
                        <p className="font-mono text-[10.5px] text-text-3 tracking-wider truncate mt-0.5">
                          {project.clickUpSync === 'error' && <span className="text-error font-semibold">SYNC ERR · </span>}
                          {project.status === 'blocked' && <span className="text-error font-semibold">BLOCKED · </span>}
                          {project.clientName}
                        </p>
                      </div>
                    </div>

                    {/* Client */}
                    <div className="px-3 py-3.5 border-b border-border-subtle flex items-center min-w-0 group-hover:bg-white/[0.018] transition-colors">
                      <div>
                        <p className="text-[12.5px] font-ui font-medium text-text-1 truncate">{project.clientName}</p>
                        <p className="text-[10px] font-mono text-text-4 uppercase tracking-wider mt-0.5">
                          {project.clientName.toLowerCase().includes('internal') || project.clientName.toLowerCase().includes('linknbit') ? 'In-house' : 'External'}
                        </p>
                      </div>
                    </div>

                    {/* Service */}
                    <div className="px-3 py-3.5 border-b border-border-subtle flex items-center group-hover:bg-white/[0.018] transition-colors">
                      <ServiceChip service={project.serviceType} />
                    </div>

                    {/* Stage */}
                    <div className="px-3 py-3.5 border-b border-border-subtle flex items-center gap-2 group-hover:bg-white/[0.018] transition-colors">
                      <span className="size-[18px] rounded-xs bg-surface-3 border border-border-default flex items-center justify-center font-mono text-[9px] text-text-3 shrink-0">
                        {stageIdx + 1 || 1}
                      </span>
                      <span className="text-[12px] font-ui font-medium text-text-2 truncate">{project.currentStage}</span>
                    </div>

                    {/* Status */}
                    <div className="px-3 py-3.5 border-b border-border-subtle flex items-center group-hover:bg-white/[0.018] transition-colors">
                      <StatusChip status={project.status} type="project" />
                    </div>

                    {/* Progress */}
                    <div className="px-3 py-3.5 border-b border-border-subtle flex items-center gap-2.5 group-hover:bg-white/[0.018] transition-colors">
                      <div className="flex-1 h-1.5 bg-surface-inset rounded-full overflow-hidden min-w-[56px]">
                        <div className="h-full rounded-full" style={{ width: `${project.progress}%`, background: PROGRESS_COLOR(project.progress) }} />
                      </div>
                      <span className="font-mono text-[11.5px] text-text-2 font-medium tabular-nums min-w-[32px] text-right">{project.progress}%</span>
                    </div>

                    {/* Deadline */}
                    <div className="px-3 py-3.5 border-b border-border-subtle group-hover:bg-white/[0.018] transition-colors">
                      <p className={cn(
                        'font-ui font-medium text-[12.5px] tabular-nums',
                        days <= 0 ? 'text-error' : days <= 3 ? 'text-error' : days <= 7 ? 'text-warning' : 'text-text-1',
                      )}>
                        {formatDate(project.deadline)}
                      </p>
                      <p className="font-mono text-[10px] text-text-3 uppercase tracking-wider mt-0.5">
                        {days <= 0 ? 'Overdue' : `${days}d left`}
                      </p>
                    </div>

                    {/* PM */}
                    <div className="px-3 py-3.5 border-b border-border-subtle flex items-center gap-2 min-w-0 group-hover:bg-white/[0.018] transition-colors">
                      <Avatar name={project.pm.name} size="xs" />
                      <span className="text-[12px] font-ui font-medium text-text-1 truncate">{project.pm.name.split(' ')[0]}</span>
                    </div>

                    {/* ClickUp */}
                    <div className="px-3 py-3.5 border-b border-border-subtle flex items-center group-hover:bg-white/[0.018] transition-colors">
                      <ClickUpStatus status={project.clickUpSync} />
                    </div>

                    {/* Open arrow */}
                    <div className="pr-[18px] px-3 py-3.5 border-b border-border-subtle flex items-center justify-end group-hover:bg-white/[0.018] transition-colors">
                      <button
                        onClick={() => navigate(`/admin/projects/${project.id}`)}
                        className="size-7 rounded-sm border border-border-default text-text-2 bg-transparent hover:bg-surface-3 hover:text-text-1 flex items-center justify-center transition-colors"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
                          <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Empty */}
            {paginated.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <span className="size-12 rounded-xl bg-surface-2 border border-dashed border-border-strong text-text-3 flex items-center justify-center text-xl">📂</span>
                <p className="font-display font-semibold text-[14px] text-text-2">No projects found</p>
                <p className="text-[12.5px] text-text-3 max-w-xs">Try adjusting your filters or search</p>
              </div>
            )}

            {/* Pagination */}
            <div className="px-[18px] py-[14px] bg-surface-1 flex items-center justify-between gap-4 border-t border-border-subtle">
              <p className="text-[12.5px] text-text-3 font-ui">
                Showing{' '}
                <strong className="text-text-1 font-semibold">
                  {listFiltered.length === 0 ? 0 : (page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, listFiltered.length)}
                </strong>
                {' '}of{' '}
                <strong className="text-text-1 font-semibold">{listFiltered.length}</strong>
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="size-8 rounded-sm border border-border-default bg-surface-2 text-text-2 flex items-center justify-center hover:bg-surface-3 hover:text-text-1 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={12} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={cn(
                      'size-8 rounded-sm border font-semibold text-[12.5px] flex items-center justify-center transition-colors',
                      page === i + 1 ? 'bg-brand-red border-brand-red text-white' : 'border-border-default bg-surface-2 text-text-2 hover:bg-surface-3 hover:text-text-1',
                    )}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="size-8 rounded-sm border border-border-default bg-surface-2 text-text-2 flex items-center justify-center hover:bg-surface-3 hover:text-text-1 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={12} />
                </button>
              </div>
              <div className="flex items-center gap-2 text-[12px] text-text-3">
                <span>Per page</span>
                <div className="flex items-center gap-1.5 h-8 px-2.5 bg-surface-2 border border-border-default rounded-sm text-text-1 font-semibold cursor-pointer hover:bg-surface-3 transition-colors">
                  {PER_PAGE}
                  <ChevronDown size={10} className="text-text-3" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── KANBAN VIEW ── */}
        {view === 'kanban' && (
          <div className="grid grid-cols-4 gap-3.5">
            {KANBAN_COLS.map((col) => {
              const colProjects = kanbanFiltered.filter(p => (kanbanStatuses[p.id] ?? p.status) === col.status)
              const isOver = dragOverCol === col.status

              return (
                <div
                  key={col.status}
                  className={cn(
                    'relative flex flex-col min-h-[480px] bg-surface-1 border rounded-md overflow-hidden transition-all',
                    isOver ? 'border-brand-red/40 shadow-[0_0_0_2px_rgba(238,39,55,0.12)] bg-surface-2/20' : 'border-border-default',
                    col.status === 'blocked' && !isOver && 'bg-[linear-gradient(to_bottom,rgba(244,54,76,0.025),transparent_80px)]',
                  )}
                  onDragOver={(e) => handleDragOver(e, col.status)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, col.status)}
                >
                  {/* Top color bar */}
                  <div className="absolute top-0 inset-x-0 h-[3px] rounded-t-md" style={{ background: col.topColor }} />

                  {/* Column header */}
                  <div className="mt-[3px] flex items-center gap-2 px-4 py-3.5 border-b border-border-subtle">
                    <span
                      className={cn('size-2 rounded-full shrink-0', col.status === 'blocked' && 'shadow-[0_0_0_3px_rgba(244,54,76,0.15)]')}
                      style={{ background: col.dotColor }}
                    />
                    <span className="font-display font-semibold text-[13.5px] text-text-1 flex-1 tracking-tight">{col.label}</span>
                    <span className={cn('font-mono text-[10.5px] font-medium px-2 py-[2px] rounded-full', col.countCls)}>
                      {colProjects.length}
                    </span>
                    <div className="relative">
                      <button
                        title="Column options"
                        onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === `col-${col.status}` ? null : `col-${col.status}`) }}
                        className="size-6 rounded-xs text-text-3 hover:text-text-2 hover:bg-white/5 flex items-center justify-center transition-colors"
                      >
                        <MoreHorizontal size={13} />
                      </button>
                      {openMenu === `col-${col.status}` && (
                        <div
                          className="absolute right-0 top-full mt-1 z-50 bg-surface-2 border border-border-strong rounded-md shadow-xl min-w-[160px] overflow-hidden"
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <button className="w-full flex items-center gap-2.5 px-3 py-2 text-[12.5px] font-ui text-text-1 hover:bg-surface-3 transition-colors text-left">
                            Sort by deadline
                          </button>
                          <button className="w-full flex items-center gap-2.5 px-3 py-2 text-[12.5px] font-ui text-text-1 hover:bg-surface-3 transition-colors text-left">
                            Filter this column
                          </button>
                          <div className="h-px bg-border-subtle my-1" />
                          <button className="w-full flex items-center gap-2.5 px-3 py-2 text-[12.5px] font-ui text-text-3 hover:bg-surface-3 transition-colors text-left">
                            Hide column
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      title={`Add to ${col.label}`}
                      onClick={() => setShowNewModal(true)}
                      className="size-6 rounded-[5px] border border-dashed border-border-strong text-text-3 hover:text-text-1 hover:border-solid hover:bg-surface-2 flex items-center justify-center shrink-0 transition-all"
                    >
                      <Plus size={11} />
                    </button>
                  </div>

                  {/* Cards */}
                  <div className="p-3 flex flex-col gap-2.5 flex-1">
                    {colProjects.length === 0 ? (
                      <div className="flex flex-col items-center justify-center flex-1 gap-2.5 py-8 text-center">
                        <span className="size-11 rounded-xl bg-surface-2 border border-dashed border-border-strong text-text-3 flex items-center justify-center">
                          {col.status === 'completed' ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="size-5"><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></svg>
                          ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="size-5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                          )}
                        </span>
                        <div>
                          <p className="font-display font-semibold text-[13px] text-text-2">
                            {col.status === 'completed' ? 'Nothing shipped yet' : 'No projects'}
                          </p>
                          <p className="text-[11.5px] text-text-3 mt-1 max-w-[160px] mx-auto leading-snug">
                            {col.status === 'completed'
                              ? 'Drag a card here to mark it complete'
                              : `No projects in ${col.label.toLowerCase()} right now`}
                          </p>
                        </div>
                        {col.status === 'completed' && (
                          <p className="font-mono text-[10px] text-text-4 uppercase tracking-wider">Last shipped · May 4 '26</p>
                        )}
                      </div>
                    ) : (
                      colProjects.map((project) => (
                        <KanbanCard
                          key={project.id}
                          project={project}
                          colStatus={col.status}
                          isDragging={draggedId === project.id}
                          isMenuOpen={openMenu === project.id}
                          onMenuToggle={(e) => { e.stopPropagation(); setOpenMenu(openMenu === project.id ? null : project.id) }}
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                        />
                      ))
                    )}

                    {/* Drop indicator */}
                    {isOver && draggedId && colProjects.length > 0 && (
                      <div className="h-[3px] rounded-full bg-brand-red/50 mx-1 mt-1" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── TIMELINE VIEW ── */}
        {view === 'timeline' && <TimelineView projects={kanbanFiltered} />}

        {/* ── MILESTONES VIEW ── */}
        {view === 'milestones' && <MilestonesView projects={kanbanFiltered} />}

      </div>

      {showNewModal && <NewProjectModal onClose={() => setShowNewModal(false)} />}
    </div>
  )
}
