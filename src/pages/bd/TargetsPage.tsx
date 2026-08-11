import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Pencil, Wallet, Target, Percent, Timer, Trophy } from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { Avatar } from '../../components/ui/Avatar'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { SectionToolbar } from '../../components/ui/SectionToolbar'
import { ResponsiveTable } from '../../components/ui/ResponsiveTable'
import { BdKpiTile } from '../../components/shared/BdKpiTile'
import { cn } from '../../lib/cn'
import { formatCompactCurrency } from '../../lib/utils'
import {
  CHART_TOOLTIP_STYLE, CHART_AXIS_TICK, CHART_GRID_STROKE, CHART_LEGEND_STYLE, CHART_COLORS,
} from '../../lib/chartTheme'
import { useBd } from '../../context/BdPrototypeContext'
import { BD_REVENUE_TREND } from '../../data/bdMock'
import { TargetsModal } from './TargetsModal'
import type { BdTarget } from '../../types'

const PERIOD_OPTIONS = [
  { value: 'month', label: 'This month' },
  { value: 'quarter', label: 'This quarter' },
]

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

export default function TargetsPage() {
  const { targets: BD_TARGETS } = useBd()
  const [editOpen, setEditOpen] = useState(false)
  const [period, setPeriod] = useState('month')

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

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Targets & KPIs" />
      <div className="p-4 lg:px-8 lg:py-7 flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h2 className="font-display font-bold text-[22px] text-text-1">Targets &amp; KPIs</h2>
            <p className="font-ui text-[13px] text-text-3">
              Revenue and activity quotas, tracked against what the team has actually closed
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Select value={period} onChange={setPeriod} options={PERIOD_OPTIONS} size="sm" className="w-36" />
            <Button size="sm" variant="secondary" iconLeft={<Pencil size={14} />} onClick={() => setEditOpen(true)}>Set targets</Button>
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

        {/* ── Supporting KPIs ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <BdKpiTile
            icon={Wallet}
            label="Pipeline value"
            value={formatCompactCurrency(18_500_000)}
            delta={{ label: 'weighted', direction: 'flat', caption: 'by stage' }}
          />
          <BdKpiTile
            icon={Percent}
            label="Win rate"
            value={`${totals.winRate}`}
            unit="%"
            delta={{ label: `${totals.wins} won`, direction: 'flat', caption: 'this month' }}
          />
          <BdKpiTile
            icon={Target}
            label="Avg deal size"
            value={formatCompactCurrency(1_490_000)}
            delta={{ label: '+12%', direction: 'up', caption: 'vs last month' }}
          />
          <BdKpiTile
            icon={Timer}
            label="Avg sales cycle"
            value="34"
            unit="days"
            delta={{ label: '-4 days', direction: 'up', caption: 'faster' }}
          />
        </div>

        {/* ── Trend ── */}
        <div className="rounded-lg border border-border-default bg-surface-1 overflow-hidden">
          <SectionToolbar
            icon={Trophy}
            title="Revenue vs target"
            description="Closed-won against the month's quota"
          />
          <div className="p-4 lg:p-5">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={BD_REVENUE_TREND} barGap={4}>
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
        <div className="rounded-lg border border-border-default bg-surface-1 overflow-hidden">
          <SectionToolbar
            icon={Target}
            title="By rep"
            description="Revenue, outreach and meetings against each person's quota"
            badge={BD_TARGETS.length}
          />
          <div className="p-4 lg:p-5">
            <RepTable targets={BD_TARGETS} />
          </div>
        </div>
      </div>

      {editOpen && <TargetsModal open onClose={() => setEditOpen(false)} />}
    </div>
  )
}

const COLS = 'grid grid-cols-[minmax(0,1.3fr)_minmax(0,1.5fr)_minmax(0,1.1fr)_minmax(0,1.1fr)_90px] gap-4 items-center'

function RepTable({ targets }: { targets: BdTarget[] }) {
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
                <Avatar name={t.repName} size="sm" />
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
            <Avatar name={t.repName} size="sm" />
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
