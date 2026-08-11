import { useMemo, useState } from 'react'
import { Plus, Send, MessageSquareReply, CalendarCheck, Trophy, TrendingUp, TrendingDown } from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { ResponsiveTable } from '../../components/ui/ResponsiveTable'
import { SectionToolbar } from '../../components/ui/SectionToolbar'
import { BdKpiTile } from '../../components/shared/BdKpiTile'
import { CHANNEL_CONFIG, CHANNEL_ORDER } from '../../constants/bd'
import { cn } from '../../lib/cn'
import { formatCompactCurrency } from '../../lib/utils'
import { CHANNEL_STATS } from '../../data/bdMock'
import type { ChannelStats } from '../../types'

const PERIOD_OPTIONS = [
  { value: 'month', label: 'This month' },
  { value: 'quarter', label: 'This quarter' },
  { value: 'year', label: 'This year' },
]

/** Replies ÷ sent. Passive channels send nothing, so the rate is undefined there. */
function responseRate(stat: ChannelStats): number | null {
  if (stat.sent === 0) return null
  return Math.round((stat.responses / stat.sent) * 100)
}

export default function OutreachPage() {
  const [period, setPeriod] = useState('month')

  const totals = useMemo(() => {
    const sent = CHANNEL_STATS.reduce((s, c) => s + c.sent, 0)
    const responses = CHANNEL_STATS.reduce((s, c) => s + c.responses, 0)
    return {
      sent,
      responses,
      rate: sent === 0 ? 0 : Math.round((responses / sent) * 100),
      meetings: CHANNEL_STATS.reduce((s, c) => s + c.meetings, 0),
      revenue: CHANNEL_STATS.reduce((s, c) => s + c.revenue, 0),
    }
  }, [])

  const ordered = useMemo(
    () => CHANNEL_ORDER.map((ch) => CHANNEL_STATS.find((s) => s.channel === ch)).filter((s): s is ChannelStats => !!s),
    [],
  )

  // The busiest channel sets the bar scale, so the cards compare against each
  // other rather than against an arbitrary ceiling.
  const maxSent = Math.max(...ordered.map((s) => s.sent), 1)

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Outreach" />
      <div className="p-4 lg:px-8 lg:py-7 flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h2 className="font-display font-bold text-[22px] text-text-1">Outreach</h2>
            <p className="font-ui text-[13px] text-text-3">
              Volume and response rate per channel — including outreach that never became a lead
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Select value={period} onChange={setPeriod} options={PERIOD_OPTIONS} size="sm" className="w-36" />
            <Button size="sm" iconLeft={<Plus size={15} />}>Log activity</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <BdKpiTile
            icon={Send}
            label="Outreach sent"
            value={totals.sent.toLocaleString('en-PK')}
            delta={{ label: '+14%', direction: 'up', caption: 'vs last month' }}
          />
          <BdKpiTile
            icon={MessageSquareReply}
            label="Response rate"
            value={`${totals.rate}`}
            unit="%"
            delta={{ label: `${totals.responses} replies`, direction: 'flat' }}
          />
          <BdKpiTile
            icon={CalendarCheck}
            label="Meetings booked"
            value={`${totals.meetings}`}
            delta={{ label: '+9', direction: 'up', caption: 'vs last month' }}
          />
          <BdKpiTile
            icon={Trophy}
            label="Revenue won"
            value={formatCompactCurrency(totals.revenue)}
            tone="success"
            delta={{ label: '12 deals', direction: 'flat' }}
          />
        </div>

        {/* ── Per-channel cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
          {ordered.map((stat) => (
            <ChannelCard key={stat.channel} stat={stat} maxSent={maxSent} />
          ))}
        </div>

        {/* ── Comparison table ── */}
        <div className="rounded-lg border border-border-default bg-surface-1 overflow-hidden">
          <SectionToolbar
            icon={Send}
            title="Channel comparison"
            description="Every channel side by side, best-converting first"
          />
          <div className="p-4 lg:p-5">
            <ChannelTable stats={[...ordered].sort((a, b) => b.revenue - a.revenue)} />
          </div>
        </div>
      </div>
    </div>
  )
}

function ChannelCard({ stat, maxSent }: { stat: ChannelStats; maxSent: number }) {
  const config = CHANNEL_CONFIG[stat.channel]
  const Icon = config.icon
  const rate = responseRate(stat)
  const TrendIcon = stat.trend >= 0 ? TrendingUp : TrendingDown

  return (
    <article className="rounded-lg border border-border-default bg-surface-1 p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <span className="size-9 rounded-md bg-surface-2 border border-border-subtle flex items-center justify-center shrink-0">
          <Icon size={16} className={config.tint} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-ui font-semibold text-[14px] text-text-1 truncate">{config.label}</h3>
          <p className="font-ui text-[11.5px] text-text-3">
            {stat.sent > 0 ? `${stat.sent} sent` : 'Inbound — nothing sent'}
          </p>
        </div>
        <span
          className={cn(
            'flex items-center gap-1 font-ui text-[12px] font-semibold shrink-0',
            stat.trend >= 0 ? 'text-success' : 'text-error',
          )}
        >
          <TrendIcon size={12} />
          {stat.trend > 0 ? '+' : ''}{stat.trend}%
        </span>
      </div>

      {stat.sent > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between font-ui text-[11px] text-text-3">
            <span>Volume</span>
            <span className="font-mono tabular-nums">{stat.sent}</span>
          </div>
          <ProgressBar value={stat.sent} max={maxSent} size="xs" />
        </div>
      )}

      <div className="grid grid-cols-4 gap-2 border-t border-border-subtle pt-3.5">
        <Metric label="Replies" value={`${stat.responses}`} sub={rate !== null ? `${rate}%` : undefined} />
        <Metric label="Meetings" value={`${stat.meetings}`} />
        <Metric label="Leads" value={`${stat.leads}`} />
        <Metric label="Won" value={`${stat.won}`} tone={stat.won > 0 ? 'success' : undefined} />
      </div>

      <div className="flex items-center justify-between border-t border-border-subtle pt-3">
        <span className="font-ui text-[11px] uppercase tracking-widest text-text-4">Revenue</span>
        <span className="font-display font-bold text-[15px] text-text-1 tabular-nums">
          {stat.revenue > 0 ? formatCompactCurrency(stat.revenue) : '—'}
        </span>
      </div>
    </article>
  )
}

function Metric({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'success' }) {
  return (
    <div className="min-w-0">
      <p className="font-ui text-[10px] uppercase tracking-wider text-text-4 truncate">{label}</p>
      <p
        className={cn(
          'font-display font-bold text-body-lg/tight tabular-nums mt-0.5',
          tone === 'success' ? 'text-success' : 'text-text-1',
        )}
      >
        {value}
      </p>
      {sub && <p className="font-mono text-[10px] text-text-4">{sub}</p>}
    </div>
  )
}

const COLS = 'grid grid-cols-[minmax(0,1.4fr)_90px_90px_90px_80px_70px_minmax(0,1fr)] gap-3 items-center'

function ChannelTable({ stats }: { stats: ChannelStats[] }) {
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
            <span className="text-right">Replies</span>
            <span className="text-right">Rate</span>
            <span className="text-right">Leads</span>
            <span className="text-right">Won</span>
            <span className="text-right">Revenue</span>
          </div>
          {stats.map((stat) => {
            const config = CHANNEL_CONFIG[stat.channel]
            const Icon = config.icon
            const rate = responseRate(stat)
            return (
              <div key={stat.channel} className={cn(COLS, 'p-3 border-b border-border-subtle last:border-0')}>
                <span className="flex items-center gap-2 min-w-0">
                  <Icon size={14} className={cn('shrink-0', config.tint)} />
                  <span className="font-ui text-[13px] text-text-1 truncate">{config.label}</span>
                </span>
                <span className="font-mono text-[12.5px] text-text-2 tabular-nums text-right">
                  {stat.sent || '—'}
                </span>
                <span className="font-mono text-[12.5px] text-text-2 tabular-nums text-right">{stat.responses}</span>
                <span className="font-mono text-[12.5px] tabular-nums text-right text-text-2">
                  {rate !== null ? `${rate}%` : '—'}
                </span>
                <span className="font-mono text-[12.5px] text-text-2 tabular-nums text-right">{stat.leads}</span>
                <span
                  className={cn(
                    'font-mono text-[12.5px] tabular-nums text-right',
                    stat.won > 0 ? 'text-success' : 'text-text-4',
                  )}
                >
                  {stat.won}
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
        const rate = responseRate(stat)
        return (
          <div key={stat.channel} className="rounded-md border border-border-default bg-surface-2 p-3.5 flex flex-col gap-2.5">
            <span className="flex items-center gap-2">
              <Icon size={14} className={config.tint} />
              <span className="font-ui font-semibold text-[13px] text-text-1">{config.label}</span>
              <span className="ml-auto font-mono text-[12.5px] text-text-1 tabular-nums">
                {stat.revenue > 0 ? formatCompactCurrency(stat.revenue) : '—'}
              </span>
            </span>
            <div className="grid grid-cols-5 gap-2">
              <Metric label="Sent" value={stat.sent ? `${stat.sent}` : '—'} />
              <Metric label="Replies" value={`${stat.responses}`} />
              <Metric label="Rate" value={rate !== null ? `${rate}%` : '—'} />
              <Metric label="Leads" value={`${stat.leads}`} />
              <Metric label="Won" value={`${stat.won}`} tone={stat.won > 0 ? 'success' : undefined} />
            </div>
          </div>
        )
      })}
    />
  )
}
