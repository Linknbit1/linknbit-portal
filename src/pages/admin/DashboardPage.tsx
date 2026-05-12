import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp, TrendingDown, AlertTriangle, Users, Zap,
  ArrowRight, Flame
} from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Card } from '../../components/ui/Card'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { ServiceChip } from '../../components/shared/ServiceChip'
import { StatusChip } from '../../components/shared/StatusChip'
import { ClickUpStatus } from '../../components/shared/ClickUpStatus'
import { PROJECTS, ACTIVITY_FEED, LEADERBOARD, TEAM_PERFORMANCE } from '../../data/mock'
import { formatRelativeTime, getDaysUntil } from '../../lib/utils'
import { cn } from '../../lib/cn'
import type { ServiceType } from '../../types'

const KPI_CARDS = [
  {
    label: 'Active Projects',
    value: 18,
    change: +3,
    icon: <TrendingUp size={16} />,
    variant: 'default' as const,
    sub: 'vs last month',
  },
  {
    label: 'Overdue Tasks',
    value: 7,
    change: +2,
    icon: <AlertTriangle size={16} />,
    variant: 'error' as const,
    sub: 'vs last month',
  },
  {
    label: 'Team Utilization',
    value: '84%',
    change: undefined,
    icon: <Users size={16} />,
    variant: 'default' as const,
    sub: 'avg across teams',
    bar: 84,
  },
  {
    label: 'XP Awarded This Month',
    value: '12,400',
    change: undefined,
    icon: <Zap size={16} />,
    variant: 'default' as const,
    sub: 'Total XP distributed',
    xp: true,
  },
]

const WORKLOAD_STYLE: Record<string, string> = {
  light: 'bg-success/10 text-success border border-success/30',
  medium: 'bg-warning/10 text-warning border border-warning/30',
  heavy: 'bg-error/10 text-error border border-error/30',
}

export default function DashboardPage() {
  const [serviceFilter, setServiceFilter] = useState<ServiceType | 'all'>('all')

  const atRisk = PROJECTS.filter(
    (p) => p.status === 'blocked' || getDaysUntil(p.deadline) <= 7,
  ).slice(0, 4)

  const filteredProjects =
    serviceFilter === 'all' ? PROJECTS : PROJECTS.filter((p) => p.serviceType === serviceFilter)

  const topLeaderboard = LEADERBOARD.slice(0, 5)

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Dashboard" />

      <div className="p-8 flex flex-col gap-6 max-w-content mx-auto w-full">
        {/* ── KPI row ── */}
        <div className="grid grid-cols-4 gap-4">
          {KPI_CARDS.map((kpi) => (
            <Card
              key={kpi.label}
              className={cn(
                'relative overflow-hidden',
                kpi.variant === 'error' && 'border-error/40 bg-error/5',
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-label text-text-3 uppercase tracking-wider font-ui">
                  {kpi.label}
                </span>
                <span
                  className={cn(
                    'w-8 h-8 rounded-sm flex items-center justify-center',
                    kpi.variant === 'error'
                      ? 'bg-error/15 text-error'
                      : 'bg-surface-2 text-text-3',
                  )}
                >
                  {kpi.icon}
                </span>
              </div>
              <div className="flex items-end gap-2">
                <span
                  className={cn(
                    'font-display font-bold text-h2 leading-none tracking-tight',
                    kpi.xp ? 'xp-text' : kpi.variant === 'error' ? 'text-error' : 'text-text-1',
                  )}
                >
                  {kpi.value}
                </span>
                {kpi.change !== undefined && (
                  <span
                    className={cn(
                      'flex items-center gap-1 text-caption font-ui mb-0.5',
                      kpi.change > 0
                        ? kpi.variant === 'error' ? 'text-error' : 'text-success'
                        : 'text-success',
                    )}
                  >
                    {kpi.change > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {kpi.change > 0 ? '+' : ''}{kpi.change}
                  </span>
                )}
              </div>
              {kpi.bar !== undefined && (
                <ProgressBar value={kpi.bar} size="xs" className="mt-2.5" />
              )}
              <p className="text-caption text-text-4 mt-1.5">{kpi.sub}</p>
            </Card>
          ))}
        </div>

        {/* ── Middle row: Project Status + At-Risk ── */}
        <div className="grid grid-cols-3 gap-4">
          {/* Project Status Overview */}
          <Card className="col-span-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-h4 text-text-1 tracking-tight">
                Projects by Status
              </h3>
            </div>
            {/* Filters */}
            <div className="flex gap-1.5 mb-4 flex-wrap">
              {(['all', 'design', 'development', 'marketing'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setServiceFilter(s)}
                  className={cn(
                    'text-caption font-ui font-medium px-2.5 py-1 rounded-xs transition-colors capitalize',
                    serviceFilter === s
                      ? 'bg-surface-2 text-text-1 border border-border-strong'
                      : 'text-text-3 hover:text-text-2 border border-transparent',
                  )}
                >
                  {s === 'all' ? 'All' : s}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {[
                { label: 'In Progress', count: filteredProjects.filter((p) => p.status === 'in_progress').length, color: 'bg-info', total: filteredProjects.length },
                { label: 'Awaiting Client', count: filteredProjects.filter((p) => p.status === 'awaiting_client').length, color: 'bg-warning', total: filteredProjects.length },
                { label: 'Blocked', count: filteredProjects.filter((p) => p.status === 'blocked').length, color: 'bg-error', total: filteredProjects.length },
                { label: 'Completed', count: filteredProjects.filter((p) => p.status === 'completed').length, color: 'bg-success', total: filteredProjects.length },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-3">
                  <span className="text-body-sm text-text-2 font-ui w-32 flex-shrink-0">{row.label}</span>
                  <div className="flex-1 h-2 bg-surface-3 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all duration-500', row.color)}
                      style={{ width: row.total > 0 ? `${(row.count / row.total) * 100}%` : '0%' }}
                    />
                  </div>
                  <span className="font-mono text-caption text-text-3 w-4 text-right flex-shrink-0">{row.count}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* At-Risk Projects */}
          <Card className="col-span-2" padding="none">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
              <h3 className="font-display font-semibold text-h4 text-text-1 tracking-tight flex items-center gap-2">
                <AlertTriangle size={16} className="text-error" />
                At-Risk Projects
              </h3>
              <Link to="/admin/projects" className="text-caption text-brand-red hover:text-brand-red-hover flex items-center gap-1 transition-colors">
                View all <ArrowRight size={12} />
              </Link>
            </div>
            <div className="divide-y divide-border-subtle">
              {atRisk.map((project) => {
                const days = getDaysUntil(project.deadline)
                return (
                  <div key={project.id} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-ui font-semibold text-body-sm text-text-1 truncate">{project.name}</p>
                      <p className="text-caption text-text-3 mt-0.5">{project.clientName}</p>
                    </div>
                    <ServiceChip service={project.serviceType} />
                    <span className="text-caption text-text-3 font-ui w-24 flex-shrink-0 text-center">
                      {project.currentStage}
                    </span>
                    <span
                      className={cn(
                        'text-caption font-mono w-16 text-right flex-shrink-0',
                        days <= 2 ? 'text-error font-bold' : days <= 5 ? 'text-warning' : 'text-text-3',
                      )}
                    >
                      {days}d left
                    </span>
                    <Avatar name={project.pm.name} size="xs" />
                    <ClickUpStatus status={project.clickUpSync} />
                    <StatusChip status={project.status} type="project" />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-shrink-0"
                      onClick={() => {}}
                    >
                      View
                    </Button>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>

        {/* ── Bottom row: Team + Activity + Leaderboard ── */}
        <div className="grid grid-cols-5 gap-4">
          {/* Team Performance */}
          <Card className="col-span-2" padding="none">
            <div className="px-5 py-4 border-b border-border-subtle">
              <h3 className="font-display font-semibold text-h4 text-text-1 tracking-tight">
                Team Performance
              </h3>
            </div>
            <div className="divide-y divide-border-subtle">
              {TEAM_PERFORMANCE.map((member) => (
                <div key={member.id} className="flex items-center gap-3 px-5 py-3">
                  <Avatar name={member.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-ui font-semibold text-body-sm text-text-1 truncate">{member.name}</p>
                    <p className="text-caption text-text-3">{member.role}</p>
                  </div>
                  <div className="text-right flex-shrink-0 hidden xl:block">
                    <p className="font-mono text-caption text-text-2">{member.tasksCompleted} tasks</p>
                    <p className="text-[10px] text-text-4 font-mono">avg {member.avgDays}d</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-mono text-caption xp-text font-bold">{member.xp.toLocaleString()} XP</p>
                  </div>
                  <span className={cn('text-[10px] font-ui font-semibold rounded-xs px-1.5 py-0.5 uppercase tracking-wide flex-shrink-0', WORKLOAD_STYLE[member.workload])}>
                    {member.workload}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Activity Feed */}
          <Card className="col-span-2" padding="none">
            <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
              <h3 className="font-display font-semibold text-h4 text-text-1 tracking-tight">
                Recent Activity
              </h3>
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" title="Live" />
            </div>
            <div className="divide-y divide-border-subtle overflow-y-auto max-h-[360px]">
              {ACTIVITY_FEED.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'flex gap-3 px-5 py-3',
                    item.isError && 'bg-error/5',
                  )}
                >
                  <Avatar name={item.actorName === 'System' ? 'SY' : item.actorName} size="xs" className="flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-body-sm font-ui leading-snug', item.isError ? 'text-error' : 'text-text-2')}>
                      <span className="text-text-1 font-semibold">{item.actorName}</span>{' '}
                      {item.message}
                      {item.projectName && (
                        <span className="text-text-3"> · {item.projectName}</span>
                      )}
                    </p>
                    <p className="text-[10px] font-mono text-text-4 mt-1">
                      {formatRelativeTime(item.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* XP Leaderboard */}
          <Card className="col-span-1" padding="none">
            <div className="px-5 py-4 border-b border-border-subtle flex items-center gap-2">
              <Flame size={15} className="text-coin-gold" />
              <h3 className="font-display font-semibold text-h4 text-text-1 tracking-tight">
                Top Earners
              </h3>
            </div>
            <div className="px-4 py-3 space-y-2.5">
              {topLeaderboard.map((entry) => (
                <div key={entry.user.id} className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      'font-display font-bold w-5 text-center flex-shrink-0',
                      entry.rank === 1 ? 'text-[#FFD700] text-body-sm' :
                      entry.rank === 2 ? 'text-[#C0C0C0] text-caption' :
                      entry.rank === 3 ? 'text-[#CD7F32] text-caption' :
                      'text-text-4 text-caption',
                    )}
                  >
                    {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
                  </span>
                  <Avatar name={entry.user.name} size="xs" />
                  <div className="flex-1 min-w-0">
                    <p className="font-ui font-semibold text-body-sm text-text-1 truncate leading-tight">
                      {entry.user.name}
                    </p>
                    <div className="w-full h-1 bg-surface-3 rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full bg-xp-gradient rounded-full"
                        style={{ width: `${(entry.xpThisPeriod / 700) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="font-mono text-caption text-text-3 flex-shrink-0">
                    {entry.xpThisPeriod}
                  </span>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-border-subtle">
              <Link
                to="/admin/gamification"
                className="text-caption text-brand-red hover:text-brand-red-hover flex items-center gap-1 transition-colors"
              >
                View full leaderboard <ArrowRight size={11} />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
