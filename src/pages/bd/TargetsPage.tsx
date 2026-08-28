import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts'
import { Pencil, Target, Trophy, TrendingDown, FileDown, Filter } from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { Avatar } from '../../components/ui/Avatar'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { SectionToolbar } from '../../components/ui/SectionToolbar'
import { ResponsiveTable } from '../../components/ui/ResponsiveTable'
import { cn } from '../../lib/cn'
import { formatCompactCurrency } from '../../lib/utils'
import {
  CHART_TOOLTIP_STYLE, CHART_AXIS_TICK, CHART_GRID_STROKE, CHART_LEGEND_STYLE, CHART_COLORS,
} from '../../lib/chartTheme'
import { CHANNEL_CONFIG, CHANNEL_ORDER } from '../../constants/bd'
import { useBd } from '../../context/BdContext'
import { useBdTargetTotals } from '../../hooks/useBd'
import { STAGE_CONFIG } from '../../constants/bd'
import { TargetsModal } from './TargetsModal'
import type { BdTarget, ChannelStats, Lead, LeadStage } from '../../types'

const PERIOD_OPTIONS = [
  { value: 'month', label: 'This month' },
  { value: 'quarter', label: 'This quarter' },
]

/**
 * The stages a lead climbs, in order. Lost and Unqualified are deliberately
 * absent: they are exits from the funnel, not steps in it.
 */
const FUNNEL_STAGES: LeadStage[] = ['new', 'contacted', 'qualified', 'meeting', 'proposal_sent', 'negotiation', 'won']

/** How many months of history the revenue chart shows. */
const TREND_MONTHS = 6

/**
 * How far a lead got.
 *
 * Only the *current* stage is stored, so for a live lead this is exact — being
 * at Negotiation means it passed everything before it. A lead that was lost or
 * screened out is the one case we cannot answer: its stage records how it ended,
 * not how far it climbed. Counting those only as having entered understates the
 * middle of the funnel slightly, which is the safe direction to be wrong in —
 * the alternative is inventing a drop-off point that never happened.
 */
function furthestStageIndex(lead: Lead): number {
  const i = FUNNEL_STAGES.indexOf(lead.stage)
  return i === -1 ? 0 : i
}

/** 'Aug' / '2026-08-01' for the last N months, oldest first. */
function recentMonths(count: number): { key: string; label: string }[] {
  const now = new Date()
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1)
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`,
      label: d.toLocaleDateString('en-GB', { month: 'short' }),
    }
  })
}

/** Attainment as a percentage, clamped for the bar but reported raw in the label. */
function pct(actual: number, target: number): number {
  if (target === 0) return 0
  return Math.round((actual / target) * 100)
}

function attainmentVariant(percentage: number): 'success' | 'warning' | 'error' {
  if (percentage >= 90) return 'success'
  if (percentage >= 60) return 'warning'
  return 'error'
}

/** Funnel bar colours, running cool → warm as leads narrow toward Won. */
const FUNNEL_COLORS = ['#8A93A3', '#60A5FA', '#22D3EE', '#A78BFA', '#F59E0B', '#22C55E']

export default function TargetsPage() {
  const { targets: BD_TARGETS, channelStats, leads, canSeeAll, avatarOf } = useBd()
  const [editOpen, setEditOpen] = useState(false)
  const [period, setPeriod] = useState('month')

  const months = useMemo(() => recentMonths(TREND_MONTHS), [])
  const { data: quotas = [] } = useBdTargetTotals(months[0].key)

  const totals = useMemo(() => {
    const revenueTarget = BD_TARGETS.reduce((s, t) => s + t.revenueTarget, 0)
    const revenueActual = BD_TARGETS.reduce((s, t) => s + t.revenueActual, 0)
    const wins = BD_TARGETS.reduce((s, t) => s + t.wins, 0)
    const losses = BD_TARGETS.reduce((s, t) => s + t.losses, 0)
    return {
      revenueTarget,
      revenueActual,
      attainment: pct(revenueActual, revenueTarget),
      gap: revenueTarget - revenueActual,
      winRate: wins + losses === 0 ? 0 : Math.round((wins / (wins + losses)) * 100),
      wins,
    }
  }, [BD_TARGETS])

  /** Stage-by-stage conversion, counted off the live pipeline. */
  const funnel = useMemo(() => {
    const counts = FUNNEL_STAGES.map(
      (_, i) => leads.filter((l) => furthestStageIndex(l) >= i).length,
    )
    const top = counts[0] || 1
    return FUNNEL_STAGES.map((stage, i) => ({
      stage: STAGE_CONFIG[stage].label,
      count: counts[i],
      /** Share of all leads that reached this stage. */
      ofTotal: Math.round((counts[i] / top) * 100),
      /** Conversion from the stage before — where leads actually drop. */
      fromPrevious: i === 0 || counts[i - 1] === 0 ? null : Math.round((counts[i] / counts[i - 1]) * 100),
    }))
  }, [leads])

  /**
   * Revenue closed per month against that month's quota.
   *
   * Actual is the value of leads that reached Won *in that month* — which is why
   * bd_leads carries `closed_at`: booking a deal to the month its lead was
   * created would credit the wrong quarter for anything that took more than a
   * few weeks to close.
   */
  const revenueTrend = useMemo(() => {
    const quotaByMonth = new Map(quotas.map((q) => [q.periodMonth, q.revenueTarget]))
    return months.map(({ key, label }) => ({
      month: label,
      target: quotaByMonth.get(key) ?? 0,
      actual: leads
        .filter((l) => l.stage === 'won' && l.closedAt?.slice(0, 7) === key.slice(0, 7))
        .reduce((n, l) => n + l.value, 0),
    }))
  }, [months, quotas, leads])

  const byRevenue = useMemo(
    () =>
      CHANNEL_ORDER.map((ch) => channelStats.find((c: ChannelStats) => c.channel === ch))
        .filter((c): c is ChannelStats => !!c)
        .sort((a, b) => b.revenue - a.revenue),
    [channelStats],
  )

  /**
   * The step that loses the most leads. Null on an empty pipeline — every
   * conversion is undefined then, and "0% at New Lead" would read as a crisis
   * rather than as no data.
   */
  const worstStep = useMemo(() => {
    const measurable = funnel.filter((f): f is typeof f & { fromPrevious: number } => f.fromPrevious !== null)
    if (measurable.length === 0) return null
    return measurable.reduce((worst, step) => (step.fromPrevious < worst.fromPrevious ? step : worst))
  }, [funnel])

  const channelRevenue = byRevenue.reduce((n, c) => n + c.revenue, 0)
  const channelWon = byRevenue.reduce((n, c) => n + c.won, 0)
  const channelLeads = byRevenue.reduce((n, c) => n + c.leads, 0)

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Performance" />
      <div className="p-4 lg:px-8 lg:py-7 flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="ml-auto flex items-center gap-2">
            <Select value={period} onChange={setPeriod} options={PERIOD_OPTIONS} size="sm" className="w-36" />
            <Button size="sm" variant="secondary" iconLeft={<Filter size={14} />}>Filters</Button>
            <Button size="sm" variant="secondary" iconLeft={<FileDown size={15} />}>Export</Button>
            {/* Nobody sets their own quota — RLS on bd_targets is manager-only,
                so offering the button to a rep would only produce a rollback. */}
            {canSeeAll && (
              <Button size="sm" iconLeft={<Pencil size={14} />} onClick={() => setEditOpen(true)}>Set targets</Button>
            )}
          </div>
        </div>

        {/* ── Headline: revenue against target ── */}
        <div className="rounded-lg border border-border-default bg-surface-1 p-5 lg:p-6 flex flex-col gap-5">
          <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
            <div>
              <p className="font-ui text-[11px] font-semibold uppercase tracking-widest text-text-3">
                Revenue this month
              </p>
              <p className="font-display font-bold text-[38px] lg:text-[44px] text-text-1 leading-none tracking-tight tabular-nums mt-2">
                {formatCompactCurrency(totals.revenueActual)}
              </p>
            </div>
            <div className="pb-1">
              <p className="font-ui text-[12.5px] text-text-3">
                of <span className="font-mono text-text-2">{formatCompactCurrency(totals.revenueTarget)}</span> target
              </p>
              <p
                className={cn(
                  'font-ui text-[12.5px] font-semibold mt-0.5',
                  totals.gap > 0 ? 'text-warning' : 'text-success',
                )}
              >
                {totals.gap > 0
                  ? `${formatCompactCurrency(totals.gap)} to go`
                  : `${formatCompactCurrency(-totals.gap)} over target`}
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="font-display font-bold text-[30px] text-text-1 tabular-nums leading-none">
                {totals.attainment}%
              </p>
              <p className="font-ui text-[11px] uppercase tracking-widest text-text-4 mt-1.5">Attainment</p>
            </div>
          </div>

          <ProgressBar
            value={Math.min(totals.attainment, 100)}
            size="md"
            variant={attainmentVariant(totals.attainment)}
          />
        </div>

        {/* Supporting figures inline — the headline block above is the page's
            subject, so these sit under it as context rather than as four tiles. */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-lg border border-border-default bg-surface-1 px-4 py-3 font-mono text-[11.5px] tabular-nums text-text-4">
          <span>Pipeline value <span className="text-text-1">{formatCompactCurrency(18_500_000)}</span></span>
          <span>Win rate <span className="text-text-2">{totals.winRate}%</span></span>
          <span>Avg deal <span className="text-text-2">{formatCompactCurrency(1_490_000)}</span></span>
          <span>Sales cycle <span className="text-text-2">34 days</span></span>
          <span className="ml-auto">{totals.wins} won this month</span>
        </div>

        {/* ── Trend ── */}
        <div className="overflow-hidden rounded-lg border border-border-default bg-surface-1">
          <SectionToolbar
            icon={Trophy}
            title="Revenue vs target"
            description="Closed-won against the month's quota"
          />
          <div className="p-4 lg:p-5">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={revenueTrend} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} />
                <XAxis dataKey="month" tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis
                  tick={CHART_AXIS_TICK}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `${v / 1_000_000}M`}
                  width={40}
                />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  formatter={(value) => formatCompactCurrency(Number(value))}
                />
                <Legend wrapperStyle={CHART_LEGEND_STYLE} />
                <Bar dataKey="target" name="Target" fill={CHART_COLORS.target} radius={[3, 3, 0, 0]} />
                <Bar dataKey="actual" name="Closed won" fill={CHART_COLORS.actual} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Per-rep ── */}
        <div className="overflow-hidden rounded-lg border border-border-default bg-surface-1">
          <SectionToolbar
            icon={Target}
            title="By rep"
            description="Revenue, outreach and meetings against each person's quota"
            badge={BD_TARGETS.length}
          />
          <div className="p-4 lg:p-5">
            <RepTable targets={BD_TARGETS} avatarOf={avatarOf} />
          </div>
        </div>

        {/* ── Funnel ── */}
        <div className="overflow-hidden rounded-lg border border-border-default bg-surface-1">
          <SectionToolbar
            icon={TrendingDown}
            title="Conversion funnel"
            description="New lead through to won, with the carry-through at each step"
          />
          <div className="flex flex-col gap-5 p-4 lg:p-5">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={funnel} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} horizontal={false} />
                <XAxis type="number" tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="stage" tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} width={96} />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  formatter={(value) => [`${value} leads`, 'Reached']}
                />
                <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                  {funnel.map((step, i) => (
                    <Cell key={step.stage} fill={FUNNEL_COLORS[i] ?? CHART_COLORS.info} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* The chart shows volume; this row shows where leads are actually lost. */}
            <div className="grid grid-cols-2 gap-2.5 border-t border-border-subtle pt-4 sm:grid-cols-3 lg:grid-cols-6">
              {funnel.map((step, i) => (
                <div key={step.stage} className="min-w-0">
                  <p className="truncate font-ui text-[10.5px] uppercase tracking-wider text-text-4">{step.stage}</p>
                  <p className="mt-1 font-display text-[19px] font-bold leading-tight tabular-nums text-text-1">
                    {step.count}
                  </p>
                  <p className="mt-0.5 font-mono text-[10.5px]">
                    <span style={{ color: FUNNEL_COLORS[i] }}>{step.ofTotal}%</span>
                    <span className="text-text-4"> of all</span>
                  </p>
                  {step.fromPrevious !== null && (
                    <p className={cn('font-mono text-[10.5px]', step.stage === worstStep?.stage ? 'text-warning' : 'text-text-4')}>
                      {step.fromPrevious}% carried
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Channel comparison ── */}
        <div className="overflow-hidden rounded-lg border border-border-default bg-surface-1">
          <SectionToolbar
            icon={Trophy}
            title="Channel comparison"
            description="Which channels actually turn effort into revenue"
          />
          <div className="p-4 lg:p-5">
            <ChannelReportTable stats={byRevenue} />
          </div>
        </div>

        {/* ── Weekly summary ── */}
        <div className="overflow-hidden rounded-lg border border-border-default bg-surface-1">
          <SectionToolbar icon={FileDown} title="Weekly summary" description="Auto-generated every Monday morning">
            <Button size="sm" variant="ghost" iconLeft={<FileDown size={14} />}>Download PDF</Button>
          </SectionToolbar>
          <div className="flex flex-col gap-3 p-5 font-ui text-body-sm/relaxed text-text-2">
            <p>
              <span className="font-semibold text-text-1">Revenue stands at {formatCompactCurrency(totals.revenueActual)}</span>{' '}
              against a {formatCompactCurrency(totals.revenueTarget)} target, {totals.attainment}% of the month, from{' '}
              {totals.wins} closed deal{totals.wins === 1 ? '' : 's'}.
            </p>
            <p>
              <span className="font-semibold text-text-1">Channels have produced {formatCompactCurrency(channelRevenue)}</span>{' '}
              across {channelWon} of {channelLeads} leads. {byRevenue[0] ? `${CHANNEL_CONFIG[byRevenue[0].channel].label} leads on revenue.` : ''}
            </p>
            {worstStep ? (
              <p>
                <span className="font-semibold text-text-1">The gap is at {worstStep.stage}.</span> Only{' '}
                {worstStep.fromPrevious}% of leads carry through from the stage before it, the steepest drop in the funnel.
              </p>
            ) : (
              <p>Add leads to the pipeline and this summary will start reporting where they drop off.</p>
            )}
          </div>
        </div>
      </div>

      {editOpen && <TargetsModal open onClose={() => setEditOpen(false)} />}
    </div>
  )
}

const COLS = 'grid grid-cols-[minmax(0,1.3fr)_minmax(0,1.5fr)_minmax(0,1.1fr)_minmax(0,1.1fr)_90px] gap-4 items-center'

function RepTable({ targets, avatarOf }: {
  targets: BdTarget[]
  avatarOf: (id: string | null | undefined) => string | undefined
}) {
  return (
    <ResponsiveTable
      desktop={
        <div>
          <div
            className={cn(
              COLS,
              'px-3 pb-2.5 border-b border-border-subtle font-ui text-[11px] font-semibold uppercase tracking-widest text-text-3',
            )}
          >
            <span>Rep</span>
            <span>Revenue</span>
            <span>Outreach</span>
            <span>Meetings</span>
            <span className="text-right">Won / Lost</span>
          </div>
          {targets.map((t) => (
            <div key={t.repId} className={cn(COLS, 'px-3 py-3.5 border-b border-border-subtle last:border-0')}>
              <span className="flex items-center gap-2.5 min-w-0">
                <Avatar name={t.repName} src={avatarOf(t.repId)} size="sm" />
                <span className="font-ui text-[13px] text-text-1 truncate">{t.repName}</span>
              </span>
              <QuotaCell actual={formatCompactCurrency(t.revenueActual)} target={formatCompactCurrency(t.revenueTarget)} percentage={pct(t.revenueActual, t.revenueTarget)} />
              <QuotaCell actual={`${t.outreachActual}`} target={`${t.outreachTarget}`} percentage={pct(t.outreachActual, t.outreachTarget)} />
              <QuotaCell actual={`${t.meetingsActual}`} target={`${t.meetingsTarget}`} percentage={pct(t.meetingsActual, t.meetingsTarget)} />
              <span className="font-mono text-[12.5px] tabular-nums text-right">
                <span className="text-success">{t.wins}</span>
                <span className="text-text-4"> / </span>
                <span className="text-text-3">{t.losses}</span>
              </span>
            </div>
          ))}
        </div>
      }
      mobile={targets.map((t) => (
        <div key={t.repId} className="rounded-md border border-border-default bg-surface-2 p-4 flex flex-col gap-3">
          <span className="flex items-center gap-2.5">
            <Avatar name={t.repName} src={avatarOf(t.repId)} size="sm" />
            <span className="font-ui font-semibold text-[13.5px] text-text-1">{t.repName}</span>
            <span className="ml-auto font-mono text-[12px] tabular-nums">
              <span className="text-success">{t.wins}W</span>
              <span className="text-text-4"> · </span>
              <span className="text-text-3">{t.losses}L</span>
            </span>
          </span>
          <QuotaCell label="Revenue" actual={formatCompactCurrency(t.revenueActual)} target={formatCompactCurrency(t.revenueTarget)} percentage={pct(t.revenueActual, t.revenueTarget)} />
          <QuotaCell label="Outreach" actual={`${t.outreachActual}`} target={`${t.outreachTarget}`} percentage={pct(t.outreachActual, t.outreachTarget)} />
          <QuotaCell label="Meetings" actual={`${t.meetingsActual}`} target={`${t.meetingsTarget}`} percentage={pct(t.meetingsActual, t.meetingsTarget)} />
        </div>
      ))}
    />
  )
}

interface QuotaCellProps {
  actual: string
  target: string
  percentage: number
  /** Shown on mobile, where there is no column header to name the figure. */
  label?: string
}

function QuotaCell({ actual, target, percentage, label }: QuotaCellProps) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <div className="flex items-baseline gap-1.5 font-mono text-[12px] tabular-nums">
        {label && <span className="font-ui text-[11px] text-text-4 mr-auto">{label}</span>}
        <span className="text-text-1">{actual}</span>
        <span className="text-text-4">/ {target}</span>
        <span
          className={cn(
            'ml-auto font-semibold',
            percentage >= 90 ? 'text-success' : percentage >= 60 ? 'text-warning' : 'text-error',
          )}
        >
          {percentage}%
        </span>
      </div>
      <ProgressBar value={Math.min(percentage, 100)} size="xs" variant={attainmentVariant(percentage)} />
    </div>
  )
}

/* ── Channel comparison table ───────────────────────────────────────────────── */

const CHANNEL_COLS =
  'grid grid-cols-[minmax(0,1.3fr)_80px_80px_80px_70px_90px_minmax(0,1fr)] items-center gap-3'

function ChannelReportTable({ stats }: { stats: ChannelStats[] }) {
  const best = stats[0]

  return (
    <ResponsiveTable
      desktop={
        <div>
          <div
            className={cn(
              CHANNEL_COLS,
              'border-b border-border-subtle px-3 pb-2.5 font-ui text-[11px] font-semibold uppercase tracking-widest text-text-3',
            )}
          >
            <span>Channel</span>
            <span className="text-right">Sent</span>
            <span className="text-right">Leads</span>
            <span className="text-right">Won</span>
            <span className="text-right">Win %</span>
            <span className="text-right">Per lead</span>
            <span className="text-right">Revenue</span>
          </div>
          {stats.map((stat) => {
            const config = CHANNEL_CONFIG[stat.channel]
            const Icon = config.icon
            const winRate = stat.leads === 0 ? 0 : Math.round((stat.won / stat.leads) * 100)
            const perLead = stat.leads === 0 ? 0 : Math.round(stat.revenue / stat.leads)
            return (
              <div
                key={stat.channel}
                className={cn(
                  CHANNEL_COLS,
                  'border-b border-border-subtle p-3 last:border-0',
                  stat.channel === best?.channel && 'bg-success/5',
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Icon size={14} className={cn('shrink-0', config.tint)} />
                  <span className="truncate font-ui text-[13px] text-text-1">{config.label}</span>
                </span>
                <span className="text-right font-mono text-[12.5px] tabular-nums text-text-3">{stat.sent || '-'}</span>
                <span className="text-right font-mono text-[12.5px] tabular-nums text-text-2">{stat.leads}</span>
                <span className={cn('text-right font-mono text-[12.5px] tabular-nums', stat.won > 0 ? 'text-success' : 'text-text-4')}>
                  {stat.won}
                </span>
                <span className="text-right font-mono text-[12.5px] tabular-nums text-text-2">{winRate}%</span>
                <span className="text-right font-mono text-[12.5px] tabular-nums text-text-3">
                  {perLead > 0 ? formatCompactCurrency(perLead) : '-'}
                </span>
                <span className="text-right font-mono text-[12.5px] tabular-nums text-text-1">
                  {stat.revenue > 0 ? formatCompactCurrency(stat.revenue) : '-'}
                </span>
              </div>
            )
          })}
        </div>
      }
      mobile={stats.map((stat) => {
        const config = CHANNEL_CONFIG[stat.channel]
        const Icon = config.icon
        const winRate = stat.leads === 0 ? 0 : Math.round((stat.won / stat.leads) * 100)
        return (
          <div key={stat.channel} className="flex flex-col gap-2 rounded-md border border-border-default bg-surface-2 p-3.5">
            <span className="flex items-center gap-2">
              <Icon size={14} className={config.tint} />
              <span className="font-ui text-[13px] font-semibold text-text-1">{config.label}</span>
              <span className="ml-auto font-mono text-[12.5px] tabular-nums text-text-1">
                {stat.revenue > 0 ? formatCompactCurrency(stat.revenue) : '-'}
              </span>
            </span>
            <p className="font-mono text-[11.5px] tabular-nums text-text-3">
              {stat.leads} leads · {stat.won} won · {winRate}% win rate
            </p>
          </div>
        )
      })}
    />
  )
}
