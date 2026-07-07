import { useMemo, useState } from 'react'
import { Coins, Trophy, Star, History, ArrowDownRight } from 'lucide-react'
import { Select } from '../ui/Select'
import { usePointsLedger } from '../../hooks/useGamification'
import { formatRelativeTime } from '../../lib/utils'
import { cn } from '../../lib/cn'
import type { LeaderboardEntry, XpTransactionRow } from '../../api/gamification'

interface PointsHistoryProps {
  myProfileId: string
  isGovernor: boolean
  /** Internal people for the governor person-picker + summary lookups. */
  people: LeaderboardEntry[]
  /** Fallback summary for the signed-in user (covers people not in the leaderboard slice). */
  selfSummary: { name: string; reputation_total: number; lp_balance: number; level: number }
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** "YYYY-MM" bucket key for a timestamp. */
const monthKey = (iso: string): string => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const monthKeyLabel = (key: string): string => {
  const [y, m] = key.split('-').map(Number)
  return `${MONTH_NAMES[m - 1]} ${y}`
}

const fmtLp = (n: number): string => `${n > 0 ? '+' : ''}${n.toLocaleString()} XP`

function SummaryCard({ icon: Icon, tint, value, label }: {
  icon: typeof Coins
  tint: string
  value: string
  label: string
}) {
  return (
    <div className="bg-surface-1 border border-border-default rounded-xl px-5 py-4 flex items-center gap-3">
      <div className={cn('size-11 rounded-xl flex items-center justify-center shrink-0', tint)}>
        <Icon size={19} />
      </div>
      <div className="min-w-0">
        <p className="font-display font-bold text-[24px] text-text-1 leading-none truncate">{value}</p>
        <p className="font-ui text-[11.5px] text-text-3 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

function LedgerRow({ row }: { row: XpTransactionRow }) {
  const earned = row.amount >= 0
  return (
    <div className="flex items-center gap-3 py-3">
      <div className={cn(
        'size-8 rounded-lg flex items-center justify-center shrink-0',
        earned ? 'bg-coin-gold/12 text-coin-gold' : 'bg-surface-2 text-text-4',
      )}>
        {earned ? <Coins size={15} /> : <ArrowDownRight size={15} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-ui text-[13px] text-text-1 truncate">{row.reason}</p>
        <p className="font-mono text-[10.5px] text-text-4 mt-0.5">{formatRelativeTime(row.created_at)}</p>
      </div>
      <span className={cn(
        'font-mono text-[12.5px] font-semibold tabular-nums shrink-0',
        earned ? 'text-success' : 'text-text-3',
      )}>
        {fmtLp(row.amount)}
      </span>
    </div>
  )
}

export function PointsHistory({ myProfileId, isGovernor, people, selfSummary }: PointsHistoryProps) {
  const [selectedId, setSelectedId] = useState(myProfileId)
  const [month, setMonth] = useState('all')

  const viewingId = isGovernor ? selectedId : myProfileId
  const { data: ledger = [], isLoading } = usePointsLedger(viewingId)

  // Group ledger rows by month. The query is already ordered newest-first, so groups
  // and the rows within them stay in descending order without re-sorting.
  const groups = useMemo(() => {
    const map = new Map<string, XpTransactionRow[]>()
    for (const row of ledger) {
      const k = monthKey(row.created_at)
      const bucket = map.get(k)
      if (bucket) bucket.push(row)
      else map.set(k, [row])
    }
    return [...map.entries()]
  }, [ledger])

  const monthOptions = useMemo(
    () => [{ value: 'all', label: 'All months' }, ...groups.map(([k]) => ({ value: k, label: monthKeyLabel(k) }))],
    [groups],
  )

  const visibleGroups = month === 'all' ? groups : groups.filter(([k]) => k === month)

  // Summary for the person being viewed. Reputation is authoritative from the leaderboard
  // when present; otherwise fall back to self, then to the ledger's positive sum (which
  // equals reputation since it never decreases).
  const person = people.find((p) => p.profile_id === viewingId)
  const isSelf = viewingId === myProfileId
  const lifetimeEarned = useMemo(
    () => ledger.reduce((s, r) => (r.amount > 0 ? s + r.amount : s), 0),
    [ledger],
  )
  const nowKey = monthKey(new Date().toISOString())
  const earnedThisMonth = useMemo(
    () => ledger.reduce((s, r) => (r.amount > 0 && monthKey(r.created_at) === nowKey ? s + r.amount : s), 0),
    [ledger, nowKey],
  )
  const reputation = person?.reputation_total ?? (isSelf ? selfSummary.reputation_total : lifetimeEarned)
  const level = person?.level ?? (isSelf ? selfSummary.level : null)

  const peopleOptions = useMemo(
    () => people.map((p) => ({ value: p.profile_id, label: p.profile_id === myProfileId ? `${p.name} (you)` : p.name, avatar: { name: p.name, url: p.avatar_url } })),
    [people, myProfileId],
  )

  return (
    <div className="flex flex-col gap-5">
      {/* Controls — person picker (governors) + month filter */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        {isGovernor && (
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">Employee</label>
            <Select value={selectedId} onChange={setSelectedId} options={peopleOptions} />
          </div>
        )}
        <div className="flex flex-col gap-1.5 sm:w-56">
          <label className="text-label font-ui font-semibold text-text-2 uppercase tracking-wider">Month</label>
          <Select value={month} onChange={setMonth} options={monthOptions} />
        </div>
      </div>

      {/* Summary for the viewed person */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryCard
          icon={Trophy}
          tint="bg-service-design/15 border border-service-design/30 text-service-design"
          value={reputation.toLocaleString()}
          label={level !== null ? `Reputation · Level ${level} · never resets` : 'Reputation · never resets'}
        />
        <SummaryCard
          icon={Coins}
          tint="bg-coin-gold/15 border border-coin-gold/30 text-coin-gold"
          value={earnedThisMonth.toLocaleString()}
          label="XP earned · this month"
        />
        <SummaryCard
          icon={Star}
          tint="bg-service-dev/15 border border-service-dev/30 text-service-dev"
          value={lifetimeEarned.toLocaleString()}
          label="XP earned · all time"
        />
      </div>

      {/* Ledger grouped by month */}
      {isLoading ? (
        <div className="bg-surface-1 border border-border-default rounded-xl p-5 flex flex-col gap-3 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="size-8 rounded-lg bg-surface-2 shrink-0" />
              <div className="flex-1 h-4 rounded bg-surface-2" />
              <div className="h-4 w-16 rounded bg-surface-2" />
            </div>
          ))}
        </div>
      ) : visibleGroups.length === 0 ? (
        <div className="bg-surface-1 border border-border-default rounded-xl py-14 flex flex-col items-center gap-3 text-center">
          <div className="size-12 rounded-full bg-surface-2 flex items-center justify-center">
            <History size={22} className="text-text-4" />
          </div>
          <p className="font-ui text-[13px] text-text-3">No points activity yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {visibleGroups.map(([key, rows]) => {
            const earned = rows.reduce((s, r) => (r.amount > 0 ? s + r.amount : s), 0)
            return (
              <section key={key}>
                <div className="flex items-center justify-between gap-3 mb-1.5 px-0.5">
                  <h3 className="font-display font-bold text-[14px] text-text-1">{monthKeyLabel(key)}</h3>
                  <span className="font-mono text-[11.5px] font-semibold text-success">{fmtLp(earned)} earned</span>
                </div>
                <div className="bg-surface-1 border border-border-default rounded-xl px-4 divide-y divide-border-subtle">
                  {rows.map((row) => <LedgerRow key={row.id} row={row} />)}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
