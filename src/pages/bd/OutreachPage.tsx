import { useMemo, useState } from 'react'
import { Plus, Send, TrendingUp, TrendingDown, History } from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { ResponsiveTable } from '../../components/ui/ResponsiveTable'
import { SectionToolbar } from '../../components/ui/SectionToolbar'
import { CHANNEL_CONFIG, CHANNEL_ORDER } from '../../constants/bd'
import { cn } from '../../lib/cn'
import { formatCompactCurrency } from '../../lib/utils'
import { useBd } from '../../context/BdContext'
import { Avatar } from '../../components/ui/Avatar'
import { formatDate } from '../../lib/utils'
import { LogOutreachModal } from './LogOutreachModal'
import type { ChannelStats, BdChannel } from '../../types'

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
  const { channelStats, activities, avatarOf } = useBd()
  const [period, setPeriod] = useState('month')
  const [logFor, setLogFor] = useState<BdChannel | null>(null)
  const [logOpen, setLogOpen] = useState(false)

  const totals = useMemo(() => {
    const sent = channelStats.reduce((s, c) => s + c.sent, 0)
    const responses = channelStats.reduce((s, c) => s + c.responses, 0)
    return {
      sent,
      responses,
      rate: sent === 0 ? 0 : Math.round((responses / sent) * 100),
      meetings: channelStats.reduce((s, c) => s + c.meetings, 0),
      revenue: channelStats.reduce((s, c) => s + c.revenue, 0),
    }
  }, [channelStats])

  const ordered = useMemo(
    () => CHANNEL_ORDER.map((ch) => channelStats.find((s) => s.channel === ch)).filter((s): s is ChannelStats => !!s),
    [channelStats],
  )

  // The busiest channel sets the bar scale, so the cards compare against each
  // other rather than against an arbitrary ceiling.
  const maxSent = Math.max(...ordered.map((s) => s.sent), 1)

  // The recent list shows batches only — a single touchpoint belongs on its
  // lead, not in a roll-up of channel effort.
  const batches = useMemo(
    () => activities.filter((a) => a.leadId === null).sort((a, b) => b.at.localeCompare(a.at)),
    [activities],
  )

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
            <Button size="sm" iconLeft={<Plus size={15} />} onClick={() => { setLogFor(null); setLogOpen(true) }}>Log outreach</Button>
          </div>
        </div>

        {/* Totals inline rather than as a row of tiles — they frame the per-channel
            cards below, which are the actual subject of the page. */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-lg border border-border-default bg-surface-1 px-4 py-3 font-mono text-[11.5px] tabular-nums text-text-4">
          <span>Sent <span className="text-text-1">{totals.sent.toLocaleString('en-PK')}</span></span>
          <span>Replies <span className="text-text-2">{totals.responses}</span></span>
          <span>Response rate <span className="text-text-2">{totals.rate}%</span></span>
          <span>Meetings <span className="text-text-2">{totals.meetings}</span></span>
          <span className="ml-auto">Revenue won <span className="text-success">{formatCompactCurrency(totals.revenue)}</span></span>
        </div>

        {/* ── Per-channel cards ── */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {ordered.map((stat) => (
            <ChannelCard
              key={stat.channel}
              stat={stat}
              maxSent={maxSent}
              onLog={() => { setLogFor(stat.channel); setLogOpen(true) }}
            />
          ))}
        </div>

        {/* ── Comparison table ── */}
        <div className="overflow-hidden rounded-lg border border-border-default bg-surface-1">
          <SectionToolbar
            icon={Send}
            title="Channel comparison"
            description="Every channel side by side, best-converting first"
          />
          <div className="p-4 lg:p-5">
            <ChannelTable stats={[...ordered].sort((a, b) => b.revenue - a.revenue)} />
          </div>
        </div>

        {/* What was actually logged, newest first — the audit behind the totals. */}
        <div className="overflow-hidden rounded-lg border border-border-default bg-surface-1">
          <SectionToolbar
            icon={History}
            title="Recent outreach"
            description="Every batch logged, newest first"
            badge={batches.length}
          />
          <div className="flex flex-col divide-y divide-border-subtle">
            {batches.length === 0 ? (
              <p className="px-5 py-10 text-center font-ui text-[13px] text-text-4">
                Nothing logged yet. Use “Log outreach” after a session of sending.
              </p>
            ) : (
              batches.slice(0, 8).map((log) => {
                const cfg = CHANNEL_CONFIG[log.channel]
                const Icon = cfg.icon
                return (
                  <div key={log.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3 lg:px-5">
                    <Icon size={14} className={cn('shrink-0', cfg.tint)} />
                    <span className="font-ui text-[13px] text-text-1">
                      {log.volume} <span className="text-text-3">{cfg.volumeLabel.toLowerCase()}</span>
                    </span>
                    <span className="font-mono text-[11.5px] tabular-nums text-text-4">
                      {[
                        log.responses > 0 && `${log.responses} ${log.responses === 1 ? 'reply' : 'replies'}`,
                        log.meetingsBooked > 0 && `${log.meetingsBooked} ${log.meetingsBooked === 1 ? 'meeting' : 'meetings'}`,
                        log.leadsCreated > 0 && `${log.leadsCreated} ${log.leadsCreated === 1 ? 'lead' : 'leads'}`,
                      ].filter(Boolean).join(' · ')}
                    </span>
                    {log.note && (
                      <span className="min-w-0 flex-1 truncate font-ui text-[12px] text-text-4">{log.note}</span>
                    )}
                    <span className="ml-auto flex items-center gap-2">
                      <Avatar name={log.byName} src={avatarOf(log.byId)} size="xs" />
                      <span className="font-mono text-[11px] text-text-4">{formatDate(log.at.slice(0, 10))}</span>
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {logOpen && (
        <LogOutreachModal
          key={logFor ?? 'any'}
          open
          channel={logFor ?? undefined}
          onClose={() => { setLogOpen(false); setLogFor(null) }}
        />
      )}
    </div>
  )
}

function ChannelCard({ stat, maxSent, onLog }: { stat: ChannelStats; maxSent: number; onLog: () => void }) {
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
        <button
          onClick={onLog}
          aria-label={`Log outreach on ${config.label}`}
          className="flex size-6 shrink-0 items-center justify-center rounded-sm text-text-4 transition-colors hover:bg-surface-3 hover:text-text-1"
        >
          <Plus size={14} />
        </button>
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
