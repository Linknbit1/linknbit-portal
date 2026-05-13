import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  Clock,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Layers,
  BarChart2,
} from 'lucide-react'
import { PROJECTS, APPROVALS } from '../../data/mock'
import { formatDate } from '../../lib/utils'
import { cn } from '../../lib/cn'

const SERVICE_LABELS: Record<string, string> = {
  development: 'App Development',
  design: 'UI/UX Design',
  marketing: 'Digital Marketing',
}

const SERVICE_COLORS: Record<string, { bg: string; text: string }> = {
  development: { bg: 'rgba(14,139,154,0.1)', text: '#0E8B9A' },
  design: { bg: 'rgba(122,63,217,0.1)', text: '#7A3FD9' },
  marketing: { bg: 'rgba(251,191,36,0.15)', text: '#B47700' },
}

const STATUS_LABELS: Record<string, string> = {
  in_progress: 'In Progress',
  blocked: 'Internal Review',
  awaiting_client: 'Action Needed',
  completed: 'Completed',
  on_hold: 'On Hold',
}

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  in_progress: { bg: 'rgba(31,157,85,0.08)', text: '#1F9D55', border: 'rgba(31,157,85,0.25)' },
  blocked: { bg: 'rgba(251,191,36,0.1)', text: '#B47700', border: 'rgba(251,191,36,0.25)' },
  awaiting_client: { bg: 'rgba(238,39,55,0.08)', text: '#EE2737', border: 'rgba(238,39,55,0.25)' },
  completed: { bg: 'rgba(31,157,85,0.08)', text: '#1F9D55', border: 'rgba(31,157,85,0.25)' },
  on_hold: { bg: '#F2EDE4', text: '#877F71', border: '#EAE3D6' },
}

const PROGRESS_COLORS = (p: number, action: boolean) => {
  if (action) return '#EE2737'
  if (p >= 80) return '#1F9D55'
  if (p >= 50) return '#0E8B9A'
  return '#7A3FD9'
}

type FilterKey = 'all' | 'active' | 'action_needed' | 'completed'

export default function ClientProjectsPage() {
  const [filter, setFilter] = useState<FilterKey>('all')
  const [search, setSearch] = useState('')

  const pendingApprovals = APPROVALS.filter((a) => a.status === 'pending').length
  const actionNeeded = PROJECTS.filter((p) => p.status === 'awaiting_client')
  const activeProjects = PROJECTS.filter((p) =>
    ['in_progress', 'awaiting_client', 'blocked'].includes(p.status),
  )
  const completedProjects = PROJECTS.filter((p) => p.status === 'completed')

  const filtered = PROJECTS.filter((p) => {
    const matchSearch =
      search === '' || p.name.toLowerCase().includes(search.toLowerCase())
    if (!matchSearch) return false
    if (filter === 'all') return true
    if (filter === 'active')
      return ['in_progress', 'awaiting_client', 'blocked'].includes(p.status)
    if (filter === 'action_needed') return p.status === 'awaiting_client'
    if (filter === 'completed') return p.status === 'completed'
    return true
  })

  const FILTER_TABS: { key: FilterKey; label: string; count?: number }[] = [
    { key: 'all', label: 'All Projects', count: PROJECTS.length },
    { key: 'active', label: 'Active', count: activeProjects.length },
    { key: 'action_needed', label: 'Action Needed', count: actionNeeded.length },
    { key: 'completed', label: 'Completed', count: completedProjects.length },
  ]

  const stats = [
    { label: 'Total Projects', value: PROJECTS.length, icon: BarChart2, color: '#0E8B9A' },
    { label: 'Active', value: activeProjects.length, icon: TrendingUp, color: '#1F9D55' },
    { label: 'Action Needed', value: actionNeeded.length, icon: AlertCircle, color: '#EE2737' },
    { label: 'Pending Approvals', value: pendingApprovals, icon: Layers, color: '#7A3FD9' },
  ]

  return (
    <div className="py-10 font-ui" style={{ color: '#1A1612' }}>
      {/* Welcome */}
      <div className="mb-8">
        <h1
          className="font-display font-bold text-[38px] leading-tight tracking-tight mb-1.5"
          style={{ color: '#1A1612' }}
        >
          Welcome back, Imran.
        </h1>
        <p className="text-[15px]" style={{ color: '#4F4940' }}>
          {activeProjects.length} active projects across your portfolio.
          {actionNeeded.length > 0 && (
            <>
              {' '}
              <span className="font-semibold" style={{ color: '#EE2737' }}>
                {actionNeeded.length} {actionNeeded.length === 1 ? 'needs' : 'need'} your attention.
              </span>
            </>
          )}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-client-surface border border-client-border rounded-xl p-4 flex items-center gap-3.5 shadow-sm"
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${s.color}18` }}
            >
              <s.icon size={18} style={{ color: s.color }} />
            </div>
            <div>
              <p
                className="font-display font-bold text-[24px] leading-none"
                style={{ color: '#1A1612' }}
              >
                {s.value}
              </p>
              <p className="text-[12px] mt-0.5" style={{ color: '#877F71' }}>
                {s.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="flex items-center gap-1 p-1 rounded-lg"
          style={{ background: '#EAE3D6' }}
        >
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                'px-3.5 py-1.5 rounded-md text-[13px] font-medium transition-all flex items-center gap-1.5',
                filter === tab.key
                  ? 'bg-client-surface shadow-sm font-semibold'
                  : 'hover:bg-white/60',
              )}
              style={{ color: filter === tab.key ? '#1A1612' : '#4F4940' }}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    'text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center',
                    tab.key === 'action_needed' && tab.count > 0
                      ? 'bg-red-500 text-white'
                      : filter === tab.key
                        ? 'bg-[#EAE3D6] text-[#4F4940]'
                        : 'bg-[#D6CFC5] text-[#4F4940]',
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-72">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: '#B7AE9D' }}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects…"
            className="w-full pl-9 pr-4 py-2 rounded-lg text-[13px] border outline-none transition-colors focus:border-[#EE2737]/40"
            style={{
              background: '#FFFFFF',
              borderColor: '#EAE3D6',
              color: '#1A1612',
            }}
          />
        </div>
      </div>

      {/* Project grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20" style={{ color: '#877F71' }}>
          <CheckCircle2 size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-display font-bold text-[18px]" style={{ color: '#1A1612' }}>
            No projects found
          </p>
          <p className="text-[14px] mt-1">Try adjusting your search or filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5">
          {filtered.map((project) => {
            const svc = SERVICE_COLORS[project.serviceType]
            const sts = STATUS_STYLES[project.status] ?? STATUS_STYLES.on_hold
            const isAction = project.status === 'awaiting_client'

            return (
              <div
                key={project.id}
                className={cn(
                  'bg-client-surface rounded-xl border p-6 shadow-sm hover:shadow-md transition-all',
                  isAction ? 'border-2' : 'border-client-border',
                )}
                style={isAction ? { borderColor: 'rgba(238,39,55,0.5)' } : {}}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-xs font-semibold"
                        style={{ background: svc.bg, color: svc.text }}
                      >
                        {SERVICE_LABELS[project.serviceType]}
                      </span>
                    </div>
                    <h3
                      className="font-display font-bold text-[18px] leading-tight"
                      style={{ color: '#1A1612' }}
                    >
                      {project.name}
                    </h3>
                    <p className="text-[12px] mt-1" style={{ color: '#877F71' }}>
                      {project.clientName}
                    </p>
                  </div>
                  <span
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap border flex-shrink-0"
                    style={{
                      background: sts.bg,
                      color: sts.text,
                      borderColor: sts.border,
                    }}
                  >
                    {isAction && '⚡ '}
                    {STATUS_LABELS[project.status]}
                  </span>
                </div>

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[13px]" style={{ color: '#4F4940' }}>
                      {project.currentStage}
                    </span>
                    <span
                      className="text-[13px] font-mono font-bold"
                      style={{ color: '#1A1612' }}
                    >
                      {project.progress}%
                    </span>
                  </div>
                  <div
                    className="w-full h-1.5 rounded-full overflow-hidden"
                    style={{ background: '#EAE3D6' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${project.progress}%`,
                        background: PROGRESS_COLORS(project.progress, isAction),
                      }}
                    />
                  </div>
                </div>

                {/* Footer */}
                <div
                  className="flex items-center justify-between pt-4 border-t"
                  style={{ borderColor: '#EAE3D6' }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                      style={{
                        background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                      }}
                    >
                      {project.pm.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </div>
                    <span className="text-[12px]" style={{ color: '#877F71' }}>
                      {project.pm.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className="text-[12px] font-mono flex items-center gap-1"
                      style={{ color: '#B7AE9D' }}
                    >
                      <Clock size={11} />
                      {formatDate(project.deadline)}
                    </span>
                    <Link
                      to={`/client/projects/${project.id}`}
                      className="px-4 py-1.5 rounded-md text-[13px] font-semibold transition-all flex items-center gap-1 hover:opacity-90"
                      style={{
                        background: isAction ? '#EE2737' : 'transparent',
                        color: isAction ? 'white' : '#EE2737',
                        border: '1px solid #EE2737',
                      }}
                    >
                      {isAction ? 'Review Now' : 'View'}
                      <ChevronRight size={13} />
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
