import { useState } from 'react'
import { Link } from 'react-router-dom'
import { List, Columns, Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Button } from '../../components/ui/Button'
import { Avatar } from '../../components/ui/Avatar'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { ServiceChip } from '../../components/shared/ServiceChip'
import { StatusChip } from '../../components/shared/StatusChip'
import { ClickUpStatus } from '../../components/shared/ClickUpStatus'
import { PROJECTS } from '../../data/mock'
import { formatDate, getDaysUntil } from '../../lib/utils'
import { cn } from '../../lib/cn'
import type { ServiceType, ProjectStatus } from '../../types'

type ViewMode = 'list' | 'kanban'

const KANBAN_COLUMNS: { status: ProjectStatus; label: string; accent: string }[] = [
  { status: 'in_progress', label: 'In Progress', accent: 'border-l-info' },
  { status: 'awaiting_client', label: 'Awaiting Client', accent: 'border-l-warning' },
  { status: 'blocked', label: 'Blocked', accent: 'border-l-error' },
  { status: 'completed', label: 'Completed', accent: 'border-l-success' },
]

export default function ProjectsPage() {
  const [view, setView] = useState<ViewMode>('list')
  const [serviceFilter, setServiceFilter] = useState<ServiceType | 'all'>('all')
  const [search, setSearch] = useState('')

  const filtered = PROJECTS.filter((p) => {
    if (serviceFilter !== 'all' && p.serviceType !== serviceFilter) return false
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Projects" />

      <div className="p-8 flex flex-col gap-5 max-w-content mx-auto w-full">
        {/* Controls */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="flex items-center gap-2 h-9 bg-surface-1 border border-border-default rounded-sm px-3 w-64">
            <Search size={14} className="text-text-3 flex-shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="bg-transparent border-0 outline-none text-body-sm font-ui text-text-1 placeholder:text-text-3 flex-1"
            />
          </div>

          {/* Service filter */}
          {(['all', 'design', 'development', 'marketing'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setServiceFilter(s)}
              className={cn(
                'h-9 px-3 rounded-sm text-body-sm font-ui font-medium transition-colors capitalize',
                serviceFilter === s
                  ? 'bg-surface-2 text-text-1 border border-border-strong'
                  : 'text-text-3 hover:text-text-2 border border-transparent',
              )}
            >
              {s === 'all' ? 'All Services' : s}
            </button>
          ))}

          <div className="ml-auto flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center bg-surface-1 border border-border-default rounded-sm p-0.5">
              {([
                { mode: 'list' as const, icon: List },
                { mode: 'kanban' as const, icon: Columns },
              ]).map(({ mode, icon: Icon }) => (
                <button
                  key={mode}
                  onClick={() => setView(mode)}
                  className={cn(
                    'w-8 h-8 rounded-xs flex items-center justify-center transition-colors',
                    view === mode ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-2',
                  )}
                  title={mode.charAt(0).toUpperCase() + mode.slice(1)}
                >
                  <Icon size={15} />
                </button>
              ))}
              <button
                className="w-8 h-8 rounded-xs flex items-center justify-center text-text-4 cursor-not-allowed"
                title="Timeline — coming soon"
                disabled
              >
                <span className="text-[10px] font-mono">TL</span>
              </button>
            </div>
            <Button size="sm" iconLeft={<Plus size={14} />}>New Project</Button>
          </div>
        </div>

        {/* List view */}
        {view === 'list' && (
          <div className="bg-surface-1 border border-border-default rounded-lg overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_auto] gap-3 px-5 py-3 border-b border-border-subtle bg-surface-2">
              {['Project', 'Client', 'Service', 'Stage', 'Status', 'Progress', 'Deadline', 'PM', ''].map((col) => (
                <span key={col} className="text-label font-ui text-text-4 uppercase tracking-wider font-semibold">
                  {col}
                </span>
              ))}
            </div>
            {filtered.map((project) => {
              const days = getDaysUntil(project.deadline)
              const isSelected = project.status === 'blocked'
              return (
                <div
                  key={project.id}
                  className={cn(
                    'grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_auto] gap-3 items-center px-5 py-3 border-b border-border-subtle last:border-0 hover:bg-surface-2/60 transition-colors',
                    isSelected && 'bg-error/5 border-l-2 border-l-error',
                  )}
                >
                  <div className="min-w-0">
                    <p className="font-ui font-semibold text-body-sm text-text-1 truncate">
                      {project.name}
                    </p>
                  </div>
                  <p className="text-body-sm text-text-2 truncate">{project.clientName}</p>
                  <ServiceChip service={project.serviceType} />
                  <p className="text-caption text-text-3 truncate">{project.currentStage}</p>
                  <StatusChip status={project.status} type="project" />
                  <div className="flex items-center gap-1.5">
                    <ProgressBar value={project.progress} size="xs" className="flex-1" />
                    <span className="font-mono text-[10px] text-text-4 flex-shrink-0">{project.progress}%</span>
                  </div>
                  <span className={cn('text-caption font-mono', days <= 3 ? 'text-error font-bold' : days <= 7 ? 'text-warning' : 'text-text-3')}>
                    {formatDate(project.deadline)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Avatar name={project.pm.name} size="xs" />
                    <span className="text-caption text-text-3 truncate hidden xl:block">{project.pm.name.split(' ')[0]}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <ClickUpStatus status={project.clickUpSync} />
                    <Link to={`/admin/projects/${project.id}`}>
                      <Button size="sm" variant="ghost">View</Button>
                    </Link>
                  </div>
                </div>
              )
            })}
            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-border-subtle">
              <span className="text-body-sm text-text-3 font-ui">Showing {filtered.length} of {PROJECTS.length} projects</span>
              <div className="flex items-center gap-2">
                <button className="w-8 h-8 rounded-sm bg-surface-2 border border-border-default text-text-3 flex items-center justify-center hover:text-text-1 transition-colors">
                  <ChevronLeft size={14} />
                </button>
                <span className="text-body-sm font-ui text-text-2 px-1">1 / 2</span>
                <button className="w-8 h-8 rounded-sm bg-surface-2 border border-border-default text-text-3 flex items-center justify-center hover:text-text-1 transition-colors">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Kanban view */}
        {view === 'kanban' && (
          <div className="grid grid-cols-4 gap-4 items-start">
            {KANBAN_COLUMNS.map((col) => {
              const cards = filtered.filter((p) => p.status === col.status)
              return (
                <div key={col.status} className="flex flex-col gap-3">
                  {/* Column header */}
                  <div className="flex items-center gap-2">
                    <h3 className="font-ui font-semibold text-body-sm text-text-2">{col.label}</h3>
                    <span className="font-mono text-[10px] text-text-4 bg-surface-2 px-1.5 py-0.5 rounded-xs">{cards.length}</span>
                  </div>
                  {/* Cards */}
                  {cards.length === 0 ? (
                    <div className="bg-surface-1 border border-border-subtle rounded-lg p-5 text-center">
                      <div className="w-8 h-8 rounded-md bg-surface-2 flex items-center justify-center mx-auto mb-2">
                        <Columns size={16} className="text-text-4" />
                      </div>
                      <p className="text-caption text-text-4 font-ui">No projects</p>
                    </div>
                  ) : (
                    cards.map((project) => {
                      const days = getDaysUntil(project.deadline)
                      return (
                        <div
                          key={project.id}
                          className={cn(
                            'bg-surface-1 border border-border-default rounded-lg p-4 border-l-4 transition-shadow hover:shadow-md',
                            col.accent,
                            col.status === 'blocked' && 'bg-error/5 border-error/40',
                          )}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <p className="font-ui font-semibold text-body-sm text-text-1 leading-snug flex-1">
                              {project.name}
                            </p>
                            <ClickUpStatus status={project.clickUpSync} size={13} />
                          </div>
                          <p className="text-caption text-text-3 mb-2.5">{project.clientName}</p>
                          <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
                            <ServiceChip service={project.serviceType} />
                            <span className="text-caption text-text-3 font-ui">{project.currentStage}</span>
                          </div>
                          <ProgressBar
                            value={project.progress}
                            size="xs"
                            variant={project.progress >= 70 ? 'success' : 'default'}
                            className="mb-2.5"
                          />
                          <div className="flex items-center justify-between">
                            <span className={cn('text-[10px] font-mono', days <= 3 ? 'text-error' : days <= 7 ? 'text-warning' : 'text-text-4')}>
                              {formatDate(project.deadline)}
                            </span>
                            <Avatar name={project.pm.name} size="xs" />
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
