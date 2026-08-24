import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp, AlertTriangle, Users, Zap,
  ArrowRight, CheckCircle2, Upload, Star, RefreshCw,
  CheckCheck, Award, MoreHorizontal, Plus, Activity,
} from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { ServiceChip } from '../../components/shared/ServiceChip'
import { StatusChip } from '../../components/shared/StatusChip'
import { ClickUpStatus } from '../../components/shared/ClickUpStatus'
import { PROJECTS, ACTIVITY_FEED, LEADERBOARD, TEAM_PERFORMANCE } from '../../data/mock'
import { formatRelativeTime, getDaysUntil, formatDate } from '../../lib/utils'
import { cn } from '../../lib/cn'
import type { ServiceType } from '../../types'

type Period = 'week' | 'month' | 'quarter'

const SERVICE_COLORS: Record<ServiceType, string> = {
  design: '#A78BFA',
  development: '#22D3EE',
  marketing: '#FBBF24',
}

const FEED_ICON_MAP: Record<string, { icon: typeof CheckCircle2; cls: string }> = {
  task_completed: { icon: CheckCheck, cls: 'bg-success/13 text-success border-success/33' },
  file_uploaded: { icon: Upload, cls: 'bg-service-design/13 text-[#C4B5FD] border-service-design/30' },
  stage_approved: { icon: CheckCircle2, cls: 'bg-success/13 text-success border-success/33' },
  stage_move: { icon: ArrowRight, cls: 'bg-warning/13 text-[#FCD34D] border-warning/30' },
  badge_earned: { icon: Award, cls: 'bg-coin-gold/18 text-coin-gold border-coin-gold/40' },
  revision_requested: { icon: RefreshCw, cls: 'bg-service-dev/13 text-[#67E8F9] border-service-dev/30' },
  clickup_error: { icon: AlertTriangle, cls: 'bg-error/13 text-error border-error' },
  xp_earned: { icon: Zap, cls: 'bg-coin-gold/18 text-coin-gold border-coin-gold/40' },
}

function WorkloadBars({ level }: { level: 'light' | 'medium' | 'heavy' }) {
  const barCls = {
    light: 'text-success border-success/30 bg-success/13',
    medium: 'text-warning border-warning/30 bg-warning/13',
    heavy: 'text-error border-error/30 bg-error/13',
  }[level]

  const activeBars = level === 'light' ? 1 : level === 'medium' ? 2 : 3

  return (
    <span className={cn('inline-flex items-center gap-1.5 py-0.75 px-2.25 rounded-sm border text-[10.5px] font-ui font-semibold uppercase tracking-[0.04em] leading-[1.4] whitespace-nowrap', barCls)}>
      <span className="inline-flex items-end gap-0.5 h-3">
        {[4, 8, 12].map((h, i) => (
          <span
            key={i}
            className={cn('w-0.75', i < activeBars ? 'opacity-100' : 'opacity-20 bg-current')}
            style={{ height: h, background: i < activeBars ? 'currentColor' : undefined }}
          />
        ))}
      </span>
      {level}
    </span>
  )
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>('month')
  const [serviceFilter, setServiceFilter] = useState<ServiceType | 'all'>('all')

  const atRisk = PROJECTS.filter(
    (p) => p.status === 'blocked' || getDaysUntil(p.deadline) <= 7,
  ).slice(0, 6)

  const filteredProjects =
    serviceFilter === 'all' ? PROJECTS : PROJECTS.filter((p) => p.serviceType === serviceFilter)

  const inProgress = filteredProjects.filter((p) => p.status === 'in_progress').length
  const awaiting = filteredProjects.filter((p) => p.status === 'awaiting_client').length
  const blocked = filteredProjects.filter((p) => p.status === 'blocked').length
  const completed = filteredProjects.filter((p) => p.status === 'completed').length
  const total = filteredProjects.length

  const byService = {
    design: PROJECTS.filter((p) => p.serviceType === 'design').length,
    development: PROJECTS.filter((p) => p.serviceType === 'development').length,
    marketing: PROJECTS.filter((p) => p.serviceType === 'marketing').length,
  }

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Dashboard" />

      <div className="px-4 py-6 lg:px-8 lg:py-7 flex flex-col gap-6">

        {/* ── Greeting row ── */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display font-bold text-[26px] text-text-1 tracking-tight leading-none">
              Good morning, <span className="text-text-3 font-medium">Ghayas</span>
            </h2>
            <p className="text-body-sm text-text-3 mt-1.5">
              7 tasks overdue · 2 projects blocked · ClickUp sync error
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-surface-1 border border-border-default rounded-sm p-0.75 gap-0.5">
              {(['week', 'month', 'quarter'] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    'px-3 py-1.5 rounded-xs text-[12px] font-ui font-semibold capitalize transition-colors',
                    period === p
                      ? 'bg-surface-3 text-text-1 shadow-sm'
                      : 'text-text-3 hover:text-text-2',
                  )}
                >
                  {p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'Quarter'}
                </button>
              ))}
            </div>
            <Button size="sm" iconLeft={<Plus size={14} />}>New Project</Button>
          </div>
        </div>

        {/* ── KPI row ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Active Projects */}
          <div className="bg-surface-1 border border-border-default rounded-lg p-5 flex flex-col gap-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[11px] font-ui font-semibold text-text-3 uppercase tracking-widest">
                <span className="size-7 bg-surface-2 border border-border-subtle text-text-2 flex items-center justify-center">
                  <TrendingUp size={14} />
                </span>
                Active Projects
              </div>
              <button className="size-6 text-text-4 hover:bg-surface-2 hover:text-text-2 flex items-center justify-center">
                <MoreHorizontal size={14} />
              </button>
            </div>
            <div className="font-display font-bold text-[38px] text-text-1 leading-none tracking-tight tabular-nums flex items-baseline gap-2">
              18
              <span className="text-body-sm text-text-3 font-ui font-medium tracking-normal">projects</span>
            </div>
            <div className="flex items-center gap-1.5 text-[12px] font-ui font-semibold text-success">
              <TrendingUp size={12} />
              <span>+3</span>
              <span className="text-text-3 font-normal ml-0.5">vs last {period}</span>
            </div>
          </div>

          {/* Overdue Tasks */}
          <div className="bg-error/5 border border-error/30 rounded-lg p-5 flex flex-col gap-3 relative overflow-hidden">
            <div
              className="absolute top-0 right-0 size-20 pointer-events-none"
              style={{ background: 'radial-gradient(circle at top right, rgba(244,54,76,0.18), transparent 70%)' }}
            />
            <div className="flex items-center justify-between relative">
              <div className="flex items-center gap-2 text-[11px] font-ui font-semibold text-text-3 uppercase tracking-widest">
                <span className="size-7 bg-error/15 border border-error/30 text-error flex items-center justify-center">
                  <AlertTriangle size={14} />
                </span>
                Overdue Tasks
              </div>
              <button className="size-6 text-text-4 hover:bg-surface-2 hover:text-text-2 flex items-center justify-center">
                <MoreHorizontal size={14} />
              </button>
            </div>
            <div className="font-display font-bold text-[38px] text-error leading-none tracking-tight tabular-nums relative">
              7
            </div>
            <div className="flex items-center gap-1.5 text-[12px] font-ui font-semibold text-error relative">
              <TrendingUp size={12} />
              <span>+2</span>
              <span className="text-text-3 font-normal ml-0.5">vs last {period}</span>
            </div>
          </div>

          {/* Team Utilization */}
          <div className="bg-surface-1 border border-border-default rounded-lg p-5 flex flex-col gap-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[11px] font-ui font-semibold text-text-3 uppercase tracking-widest">
                <span className="size-7 bg-surface-2 border border-border-subtle text-text-2 flex items-center justify-center">
                  <Users size={14} />
                </span>
                Team Utilization
              </div>
              <button className="size-6 text-text-4 hover:bg-surface-2 hover:text-text-2 flex items-center justify-center">
                <MoreHorizontal size={14} />
              </button>
            </div>
            <div className="font-display font-bold text-[38px] text-text-1 leading-none tracking-tight flex items-baseline gap-2">
              84
              <span className="text-body-lg text-text-3 font-medium">%</span>
            </div>
            <div className="h-1.5 bg-surface-inset rounded-full overflow-hidden">
              <div className="h-full w-[84%] rounded-full" style={{ background: 'linear-gradient(90deg, #22D3EE, #06B6D4)' }} />
            </div>
            <p className="text-caption text-text-4 -mt-1.5">avg across all teams</p>
          </div>

          {/* XP Awarded */}
          <div className="bg-surface-1 border border-border-default rounded-lg p-5 flex flex-col gap-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[11px] font-ui font-semibold text-text-3 uppercase tracking-widest">
                <span className="size-7 bg-coin-gold/12 border border-coin-gold/30 text-coin-gold flex items-center justify-center">
                  <Zap size={14} />
                </span>
                XP Awarded
              </div>
              <button className="size-6 text-text-4 hover:bg-surface-2 hover:text-text-2 flex items-center justify-center">
                <MoreHorizontal size={14} />
              </button>
            </div>
            <div className="font-display font-bold text-[38px] text-coin-gold leading-none tracking-tight flex items-baseline gap-2">
              12.4k
              <span className="text-body-sm text-text-3 font-ui font-medium tracking-normal">xp</span>
            </div>
            <div className="flex items-center gap-1.5 text-[12px] font-ui font-semibold text-success">
              <TrendingUp size={12} />
              <span>+18%</span>
              <span className="text-text-3 font-normal ml-0.5">vs last {period}</span>
            </div>
          </div>
        </div>

        {/* ── Project Status Overview ── */}
        <div className="bg-surface-1 border border-border-default rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
            <div className="flex items-center gap-3">
              <h3 className="font-display font-semibold text-[15px] text-text-1 tracking-tight">
                Project Status Overview
              </h3>
              <span className="font-mono text-[10.5px] text-text-3 bg-surface-2 rounded-sm px-2 py-0.5 uppercase tracking-wider">
                {total} total
              </span>
            </div>
            <div className="flex items-center gap-2">
              {(['all', 'design', 'development', 'marketing'] as const).map((s) => {
                const dot = s !== 'all' ? SERVICE_COLORS[s] : undefined
                return (
                  <button
                    key={s}
                    onClick={() => setServiceFilter(s)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.25 rounded-sm text-[11.5px] font-ui font-semibold border transition-all capitalize',
                      serviceFilter === s && s === 'all'
                        ? 'bg-surface-2 border-border-strong text-text-1'
                        : serviceFilter === s && s === 'design'
                        ? 'bg-service-design/12 border-service-design/35 text-[#C4B5FD]'
                        : serviceFilter === s && s === 'development'
                        ? 'bg-service-dev/12 border-service-dev/35 text-[#67E8F9]'
                        : serviceFilter === s && s === 'marketing'
                        ? 'bg-service-mkt/12 border-service-mkt/35 text-[#FCD34D]'
                        : 'border-border-default bg-surface-1 text-text-2',
                    )}
                  >
                    {dot && <span className="size-1.5 rounded-full" style={{ background: dot }} />}
                    {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="p-6 grid grid-cols-[1fr_300px] gap-8 items-center">
            {/* Left: stacked bar + legend */}
            <div>
              <div className="flex items-baseline gap-3.5 mb-5">
                <span className="font-display font-bold text-[48px] text-text-1 leading-none tracking-tighter tabular-nums">
                  {total}
                </span>
                <span className="text-body-sm text-text-3 font-ui">active projects this {period}</span>
              </div>

              {/* Stacked bar */}
              <div className="flex w-full h-4.5 rounded-sm overflow-hidden bg-surface-inset border border-border-subtle">
                {inProgress > 0 && (
                  <div
                    className="flex items-center justify-center text-[11px] font-display font-bold border-r border-black/30 text-[#052e1c] transition-all"
                    style={{ flex: inProgress, background: 'linear-gradient(180deg, #34D399, #22C55E)' }}
                  >
                    {inProgress}
                  </div>
                )}
                {awaiting > 0 && (
                  <div
                    className="flex items-center justify-center text-[11px] font-display font-bold border-r border-black/30 text-[#1A1306] transition-all"
                    style={{ flex: awaiting, background: 'linear-gradient(180deg, #FBBF24, #F59E0B)' }}
                  >
                    {awaiting}
                  </div>
                )}
                {blocked > 0 && (
                  <div
                    className="flex items-center justify-center text-[11px] font-display font-bold border-r border-black/30 text-white transition-all"
                    style={{ flex: blocked, background: 'linear-gradient(180deg, #F4364C, #DC2638)' }}
                  >
                    {blocked}
                  </div>
                )}
                {completed > 0 && (
                  <div
                    className="flex items-center justify-center text-[11px] font-display font-bold text-white transition-all"
                    style={{ flex: completed, background: 'linear-gradient(180deg, #6A6A6A, #3F3F3F)' }}
                  >
                    {completed}
                  </div>
                )}
              </div>

              {/* Legend */}
              <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: 'In Progress', count: inProgress, pct: total ? Math.round((inProgress / total) * 100) : 0, color: 'border-success' },
                  { label: 'Awaiting', count: awaiting, pct: total ? Math.round((awaiting / total) * 100) : 0, color: 'border-warning' },
                  { label: 'Blocked', count: blocked, pct: total ? Math.round((blocked / total) * 100) : 0, color: 'border-error' },
                  { label: 'Completed', count: completed, pct: total ? Math.round((completed / total) * 100) : 0, color: 'border-border-strong' },
                ].map((item) => (
                  <div key={item.label} className={cn('border-l-2 pl-2.5 py-1 flex flex-col gap-1', item.color)}>
                    <span className="text-[10.5px] font-ui font-semibold text-text-3 uppercase tracking-wider">{item.label}</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-display font-bold text-[22px] text-text-1 leading-none tabular-nums">{item.count}</span>
                      <span className="font-mono text-[11px] text-text-3">({item.pct}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: service breakdown */}
            <div className="bg-surface-2 border border-border-default rounded-sm p-4">
              <p className="font-ui font-semibold text-[11px] text-text-3 uppercase tracking-wider mb-3.5">
                By Service
              </p>
              {[
                { label: 'Development', count: byService.development, dot: SERVICE_COLORS.development },
                { label: 'Design', count: byService.design, dot: SERVICE_COLORS.design },
                { label: 'Marketing', count: byService.marketing, dot: SERVICE_COLORS.marketing },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-2.5 py-2 border-b border-dashed border-border-subtle last:border-0">
                  <span className="size-2 shrink-0" style={{ background: row.dot }} />
                  <div className="flex-1 min-w-0">
                    <span className="font-ui font-medium text-[13px] text-text-1">{row.label}</span>
                    <span className="font-mono text-[10.5px] text-text-3 block mt-0.5">
                      {PROJECTS.filter((p) => p.serviceType === row.label.toLowerCase()).filter((p) => p.status === 'in_progress').length} active
                    </span>
                  </div>
                  <span className="font-display font-bold text-[16px] text-text-1 tabular-nums">{row.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── At-Risk Projects ── */}
        <div className="bg-surface-1 border border-border-default rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-6 py-3.5 border-b border-border-subtle">
            <div className="flex items-center gap-3">
              <h3 className="font-display font-semibold text-[15px] text-text-1 tracking-tight flex items-center gap-2">
                <AlertTriangle size={15} className="text-error" />
                At-Risk Projects
              </h3>
              <span className="font-mono text-[10.5px] text-error bg-error/13 rounded-sm px-2 py-0.5 border border-error/30 uppercase tracking-wider">
                {atRisk.length} flagged
              </span>
            </div>
            <Link to="/admin/projects" className="text-[12.5px] text-text-2 hover:text-brand-red flex items-center gap-1.5 font-ui font-medium transition-colors">
              View all projects <ArrowRight size={12} />
            </Link>
          </div>

          {/* Table */}
          <div
            className="grid"
            style={{ gridTemplateColumns: 'minmax(0,1.5fr) 118px 88px 96px minmax(0,1fr)' }}
          >
            {/* Header */}
            {['Project', 'Stage', 'Deadline', 'PM', 'Actions'].map((h, i) => (
              <div
                key={h}
                className={cn(
                  'p-3 bg-surface-2 border-b border-border-default font-ui font-semibold text-[10.5px] text-text-3 uppercase tracking-wider',
                  i === 0 && 'pl-6',
                  i === 4 && 'pr-6 text-right',
                )}
              >
                {h}
              </div>
            ))}

            {/* Rows */}
            {atRisk.map((project) => {
              const days = getDaysUntil(project.deadline)
              const isUrgent = days <= 2 || project.status === 'blocked'
              return (
                <div key={project.id} className="contents group">
                  {/* Project name */}
                  <div className={cn('pl-6 pr-3 py-3.5 border-b border-border-subtle flex items-center gap-2 min-w-0 group-hover:bg-white/1.5 transition-colors', isUrgent && 'bg-error/4 group-hover:bg-error/7')}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="size-1.5 rounded-full shrink-0"
                          style={{ background: SERVICE_COLORS[project.serviceType] }}
                        />
                        <span className="font-display font-semibold text-[13.5px] text-text-1 truncate tracking-tight">
                          {project.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <ServiceChip service={project.serviceType} />
                        <span className="font-mono text-[10.5px] text-text-4">{project.clientName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stage */}
                  <div className={cn('px-3 py-3.5 border-b border-border-subtle flex items-center gap-2 group-hover:bg-white/1.5 transition-colors', isUrgent && 'bg-error/4 group-hover:bg-error/7')}>
                    <span className="size-4.5 rounded-xs bg-surface-2 border border-border-default flex items-center justify-center font-mono text-[9px] text-text-3 shrink-0">
                      {project.stages.findIndex((s) => s.status === 'current' || s.status === 'blocked') + 1 || '?'}
                    </span>
                    <span className="text-[12.5px] font-ui font-medium text-text-2 truncate">{project.currentStage}</span>
                  </div>

                  {/* Deadline */}
                  <div className={cn('px-3 py-3.5 border-b border-border-subtle group-hover:bg-white/1.5 transition-colors', isUrgent && 'bg-error/4 group-hover:bg-error/7')}>
                    <div className={cn('flex items-center gap-1.5', days <= 2 ? 'text-error' : days <= 5 ? 'text-warning' : 'text-text-1')}>
                      <span className="font-display font-bold text-[16px] tabular-nums">{days}</span>
                      <span className="font-ui font-medium text-[11px]">days</span>
                    </div>
                    <span className="font-mono text-[10px] text-text-3 uppercase tracking-wider mt-0.5 block">{formatDate(project.deadline)}</span>
                  </div>

                  {/* PM */}
                  <div className={cn('px-3 py-3.5 border-b border-border-subtle flex items-center gap-2 min-w-0 group-hover:bg-white/1.5 transition-colors', isUrgent && 'bg-error/4 group-hover:bg-error/7')}>
                    <Avatar name={project.pm.name} size="xs" />
                    <span className="text-[12px] font-ui font-medium text-text-1 truncate min-w-0">{project.pm.name}</span>
                  </div>

                  {/* Actions */}
                  <div className={cn('pr-6 px-3 py-3.5 border-b border-border-subtle flex items-center gap-1.5 justify-end group-hover:bg-white/1.5 transition-colors', isUrgent && 'bg-error/4 group-hover:bg-error/7')}>
                    <ClickUpStatus status={project.clickUpSync} />
                    <StatusChip status={project.status} type="project" />
                    <Link
                      to={`/admin/projects/${project.id}`}
                      className="h-7 px-2.5 rounded-sm bg-transparent border border-border-default text-text-1 font-ui font-semibold text-[11.5px] flex items-center gap-1 hover:bg-surface-2 hover:border-border-strong transition-colors whitespace-nowrap"
                    >
                      View <ArrowRight size={11} />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Bottom row: Team + Activity + Leaderboard ── */}
        <div className="grid grid-cols-[1fr_300px] gap-5">

          {/* Left: Team Performance */}
          <div className="bg-surface-1 border border-border-default rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-border-subtle">
              <div className="flex items-center gap-2.5">
                <h3 className="font-display font-semibold text-[15px] text-text-1 tracking-tight">Team Performance</h3>
                <span className="font-mono text-[10.5px] text-text-3 bg-surface-2 rounded-sm px-2 py-0.5 uppercase tracking-wider">
                  This {period}
                </span>
              </div>
              <Activity size={14} className="text-text-3" />
            </div>

            <div
              className="grid"
              style={{ gridTemplateColumns: 'minmax(0,1.8fr) 100px 100px 110px 130px' }}
            >
              {['Member', 'Tasks Done', 'Avg. Days', 'XP Earned', 'Workload'].map((h, i) => (
                <div
                  key={h}
                  className={cn(
                    'p-3 bg-surface-2 border-b border-border-default font-ui font-semibold text-[10.5px] text-text-3 uppercase tracking-wider',
                    i === 0 && 'pl-6',
                    i === 4 && 'pr-6 text-right',
                  )}
                >
                  {h}
                </div>
              ))}

              {TEAM_PERFORMANCE.map((member, idx) => {
                const dept = member.role.toLowerCase().includes('design') ? 'design' :
                             member.role.toLowerCase().includes('market') ? 'marketing' : 'development'
                return (
                  <div key={member.id} className="contents group">
                    <div className={cn('pl-6 pr-3 py-3.5 flex items-center gap-2.5 group-hover:bg-white/1.5 transition-colors', idx < TEAM_PERFORMANCE.length - 1 && 'border-b border-border-subtle')}>
                      <Avatar name={member.name} size="sm" />
                      <div className="min-w-0">
                        <span className="font-display font-semibold text-[13.5px] text-text-1 tracking-tight block truncate">{member.name}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="size-1.25 rounded-full" style={{ background: SERVICE_COLORS[dept as ServiceType] }} />
                          <span className="text-[11.5px] text-text-3">{member.role}</span>
                        </div>
                      </div>
                    </div>
                    <div className={cn('px-3 py-3.5 flex items-center group-hover:bg-white/1.5 transition-colors', idx < TEAM_PERFORMANCE.length - 1 && 'border-b border-border-subtle')}>
                      <span className="font-display font-bold text-[17px] text-text-1 tabular-nums">{member.tasksCompleted}<span className="font-ui font-medium text-[11.5px] text-text-3 ml-1">tasks</span></span>
                    </div>
                    <div className={cn('px-3 py-3.5 flex items-center group-hover:bg-white/1.5 transition-colors', idx < TEAM_PERFORMANCE.length - 1 && 'border-b border-border-subtle')}>
                      <span className="font-display font-bold text-[17px] text-text-1 tabular-nums">{member.avgDays}<span className="font-ui font-medium text-[11.5px] text-text-3 ml-1">d</span></span>
                    </div>
                    <div className={cn('px-3 py-3.5 flex items-center group-hover:bg-white/1.5 transition-colors', idx < TEAM_PERFORMANCE.length - 1 && 'border-b border-border-subtle')}>
                      <span className="font-display font-bold text-[17px] text-coin-gold tabular-nums">{member.xp.toLocaleString()}<span className="font-ui font-medium text-[11.5px] text-coin-gold/70 ml-1">xp</span></span>
                    </div>
                    <div className={cn('pr-6 px-3 py-3.5 flex items-center justify-end group-hover:bg-white/1.5 transition-colors', idx < TEAM_PERFORMANCE.length - 1 && 'border-b border-border-subtle')}>
                      <WorkloadBars level={member.workload} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right: Activity Feed + Leaderboard stacked */}
          <div className="flex flex-col gap-5">
            {/* Activity Feed */}
            <div className="bg-surface-1 border border-border-default rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-subtle">
                <h3 className="font-display font-semibold text-[15px] text-text-1 tracking-tight">Recent Activity</h3>
                <span className="size-2 rounded-full bg-success animate-pulse" />
              </div>
              <div className="py-1.5">
                {ACTIVITY_FEED.slice(0, 5).map((item, idx) => {
                  const iconInfo = FEED_ICON_MAP[item.type] ?? FEED_ICON_MAP.task_completed
                  const Icon = iconInfo.icon
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'relative grid gap-3 px-5 py-3',
                        item.isError && 'bg-error/[0.07] border-l-2 border-error',
                      )}
                      style={{ gridTemplateColumns: '28px 1fr' }}
                    >
                      {/* connector line */}
                      {idx < ACTIVITY_FEED.slice(0, 5).length - 1 && (
                        <div className="absolute left-8.25 top-10.5 bottom-[-12px] w-px bg-border-subtle" />
                      )}
                      <span className={cn('size-7 rounded-full border flex items-center justify-center shrink-0 relative z-10', iconInfo.cls)}>
                        <Icon size={13} />
                      </span>
                      <div className="min-w-0">
                        <p className={cn('text-[12.5px] font-ui leading-snug', item.isError ? 'text-error' : 'text-text-2')}>
                          <span className="text-text-1 font-semibold">{item.actorName}</span>{' '}
                          {item.message}
                          {item.projectName && (
                            <span className="font-mono text-[11px] text-text-3"> · {item.projectName}</span>
                          )}
                        </p>
                        <p className="font-mono text-[10.5px] text-text-4 mt-1 tracking-wider">
                          {formatRelativeTime(item.timestamp)}
                          {item.projectName && <span className="text-text-3 ml-1.5">· {item.projectName}</span>}
                        </p>
                        {item.isError && (
                          <a href="#" className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.75 rounded bg-error/13 border border-error/30 text-error font-ui font-semibold text-[10px] uppercase tracking-wider">
                            <RefreshCw size={10} /> Retry Sync
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Leaderboard */}
            <div className="bg-surface-1 border border-border-default rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border-subtle">
                <Star size={14} className="text-coin-gold" />
                <h3 className="font-display font-semibold text-[15px] text-text-1 tracking-tight">Top Earners</h3>
              </div>
              <div>
                {LEADERBOARD.slice(0, 5).map((entry) => {
                  const rankCls =
                    entry.rank === 1 ? 'text-[#FBBF24]' :
                    entry.rank === 2 ? 'text-[#B5B5B5]' :
                    entry.rank === 3 ? 'text-[#D97757]' : 'text-text-4'
                  return (
                    <div
                      key={entry.user.id}
                      className="grid items-center gap-2.5 px-4 py-2.75 border-b border-border-subtle last:border-0 hover:bg-white/1.5 transition-colors"
                      style={{ gridTemplateColumns: '24px 32px minmax(0,1fr) auto' }}
                    >
                      <span className={cn('font-display font-bold text-[14px] text-center tabular-nums', rankCls)}>
                        {entry.rank}
                      </span>
                      <Avatar name={entry.user.name} size="sm" />
                      <div className="min-w-0">
                        <span className="font-ui font-semibold text-body-sm/tight text-text-1 block truncate">{entry.user.name}</span>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <div className="flex-1 h-1 bg-surface-inset rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${(entry.xpThisPeriod / 700) * 100}%`,
                                background: 'linear-gradient(90deg, #F59E0B, #FBBF24, #A78BFA)',
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      <span className="font-mono text-caption text-text-3 tabular-nums">{entry.xpThisPeriod}</span>
                    </div>
                  )
                })}
              </div>
              <div className="px-5 py-3 border-t border-border-subtle">
                <Link to="/gamification" className="text-caption text-brand-red hover:text-brand-red-hover flex items-center gap-1 transition-colors font-ui font-semibold">
                  Full leaderboard <ArrowRight size={11} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
