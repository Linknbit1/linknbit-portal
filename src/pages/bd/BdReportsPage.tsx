import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { FileDown, Filter, TrendingDown, Trophy } from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { SectionToolbar } from '../../components/ui/SectionToolbar'
import { ResponsiveTable } from '../../components/ui/ResponsiveTable'
import { CHANNEL_CONFIG, CHANNEL_ORDER } from '../../constants/bd'
import { cn } from '../../lib/cn'
import { formatCompactCurrency } from '../../lib/utils'
import {
  CHART_TOOLTIP_STYLE, CHART_AXIS_TICK, CHART_GRID_STROKE, CHART_COLORS,
} from '../../lib/chartTheme'
import { BD_FUNNEL, CHANNEL_STATS } from '../../data/bdMock'
import type { ChannelStats } from '../../types'

const RANGE_OPTIONS = [
  { value: 'month', label: 'Last 30 days' },
  { value: 'quarter', label: 'This quarter' },
  { value: 'year', label: 'Year to date' },
]

/** Funnel bar colours, running cool → warm as leads narrow toward Won. */
const FUNNEL_COLORS = ['#8A93A3', '#60A5FA', '#22D3EE', '#A78BFA', '#F59E0B', '#22C55E']

export default function BdReportsPage() {
  const [range, setRange] = useState('month')

  const funnel = useMemo(() => {
    const top = BD_FUNNEL[0]?.count ?? 1
    return BD_FUNNEL.map((step, i) => {
      const previous = BD_FUNNEL[i - 1]?.count
      return {
        ...step,
        /** Share of all leads that reached this stage. */
        ofTotal: Math.round((step.count / top) * 100),
        /** Conversion from the stage immediately before — where leads actually drop. */
        fromPrevious: previous ? Math.round((step.count / previous) * 100) : null,
      }
    })
  }, [])

  const byRevenue = useMemo(
    () =>
      CHANNEL_ORDER.map((ch) => CHANNEL_STATS.find((s) => s.channel === ch))
        .filter((s): s is ChannelStats => !!s)
        .sort((a, b) => b.revenue - a.revenue),
    [],
  )

  const worstStep = useMemo(
    () =>
      funnel
        .filter((f) => f.fromPrevious !== null)
        .reduce((worst, step) => (step.fromPrevious! < worst.fromPrevious! ? step : worst)),
    [funnel],
  )

  const totalRevenue = byRevenue.reduce((s, c) => s + c.revenue, 0)
  const totalWon = byRevenue.reduce((s, c) => s + c.won, 0)
  const totalLeads = byRevenue.reduce((s, c) => s + c.leads, 0)

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="BD Reports" />
      <div className="p-4 lg:px-8 lg:py-7 flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h2 className="font-display font-bold text-[22px] text-text-1">BD Reports</h2>
            <p className="font-ui text-[13px] text-text-3">
              Where leads come from, where they stall, and what each channel is worth
            </p>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Select value={range} onChange={setRange} options={RANGE_OPTIONS} size="sm" className="w-40" />
            <Button size="sm" variant="secondary" iconLeft={<Filter size={14} />}>Filters</Button>
            <Button size="sm" iconLeft={<FileDown size={15} />}>Export</Button>
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
                <YAxis
                  type="category"
                  dataKey="stage"
                  tick={CHART_AXIS_TICK}
                  axisLine={false}
                  tickLine={false}
                  width={96}
                />
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
                    <p
                      className={cn(
                        'font-mono text-[10.5px]',
                        step.stage === worstStep.stage ? 'text-warning' : 'text-text-4',
                      )}
                    >
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
              <span className="font-semibold text-text-1">Pipeline moved forward.</span> Six leads advanced a stage,
              two reached Negotiation, and Peak Fitness Collective closed at{' '}
              <span className="font-mono text-text-1">{formatCompactCurrency(2_100_000)}</span>.
            </p>
            <p>
              <span className="font-semibold text-text-1">LinkedIn is carrying the quarter.</span> It produced the most
              leads and the most revenue — {formatCompactCurrency(totalRevenue)} across {totalWon} of {totalLeads} leads
              won — while cold calling is down 14% and has yet to convert a single deal.
            </p>
            <p>
              <span className="font-semibold text-text-1">The gap is at {worstStep.stage}.</span> Only{' '}
              {worstStep.fromPrevious}% of leads carry through from the stage before it, the steepest drop anywhere in
              the funnel.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

const COLS ='grid grid-cols-[minmax(0,1.3fr)_80px_80px_80px_70px_90px_minmax(0,1fr)] gap-3 items-center'

function ChannelReportTable({ stats }: { stats: ChannelStats[] }) {
  const best = stats[0]

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
                  COLS,
                  'p-3 border-b border-border-subtle last:border-0',
                  stat.channel === best?.channel && 'bg-success/5',
                )}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Icon size={14} className={cn('shrink-0', config.tint)} />
                  <span className="font-ui text-[13px] text-text-1 truncate">{config.label}</span>
                </span>
                <span className="font-mono text-[12.5px] text-text-3 tabular-nums text-right">{stat.sent || '—'}</span>
                <span className="font-mono text-[12.5px] text-text-2 tabular-nums text-right">{stat.leads}</span>
                <span
                  className={cn(
                    'font-mono text-[12.5px] tabular-nums text-right',
                    stat.won > 0 ? 'text-success' : 'text-text-4',
                  )}
                >
                  {stat.won}
                </span>
                <span className="font-mono text-[12.5px] text-text-2 tabular-nums text-right">{winRate}%</span>
                <span className="font-mono text-[12.5px] text-text-3 tabular-nums text-right">
                  {perLead > 0 ? formatCompactCurrency(perLead) : '—'}
                </span>
                <span className="font-mono text-[12.5px] text-text-1 tabular-nums text-right">
                  {stat.revenue > 0 ? formatCompactCurrency(stat.revenue) : '—'}
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
          <div key={stat.channel} className="rounded-md border border-border-default bg-surface-2 p-3.5 flex flex-col gap-2">
            <span className="flex items-center gap-2">
              <Icon size={14} className={config.tint} />
              <span className="font-ui font-semibold text-[13px] text-text-1">{config.label}</span>
              <span className="ml-auto font-mono text-[12.5px] text-text-1 tabular-nums">
                {stat.revenue > 0 ? formatCompactCurrency(stat.revenue) : '—'}
              </span>
            </span>
            <p className="font-mono text-[11.5px] text-text-3 tabular-nums">
              {stat.leads} leads · {stat.won} won · {winRate}% win rate
            </p>
          </div>
        )
      })}
    />
  )
}
