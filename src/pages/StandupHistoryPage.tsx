import { Topbar } from '../components/layout/Topbar'
import { Skeleton } from '../components/ui/Skeleton'
import { StandupTabs } from '../components/shared/StandupTabs'
import { StandupCard } from '../components/shared/StandupCard'
import { fmtMinutes } from '../lib/standup'
import { useAuthContext } from '../context/AuthContext'
import { useMyStandups } from '../hooks/useStandups'

const HISTORY_DAYS = 30

export default function StandupHistoryPage() {
  const { profile } = useAuthContext()
  const { data: standups = [], isLoading } = useMyStandups(profile?.id, HISTORY_DAYS)

  const totalMinutes = standups.reduce(
    (sum, s) => sum + s.entries.reduce((inner, e) => inner + e.minutes_spent, 0), 0,
  )
  const lateCount = standups.filter((s) => s.is_late).length

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Standup History" />
      <div className="p-4 lg:px-8 lg:py-7 flex flex-col gap-6">
        <div>
          <h2 className="font-display font-bold text-[22px] text-text-1">Standup History</h2>
          <p className="font-ui text-[13px] text-text-3">
            Your last {HISTORY_DAYS} standups — a record of what you shipped and what got in the way.
          </p>
        </div>

        <StandupTabs />

        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
        ) : standups.length === 0 ? (
          <div className="py-14 text-center font-ui text-[13px] text-text-4">
            No standups yet. Your first one will show up here once you submit it.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-3">
              <Stat label="Standups" value={String(standups.length)} />
              <Stat label="Time logged" value={fmtMinutes(totalMinutes)} />
              <Stat label="Late" value={String(lateCount)} tone={lateCount > 0 ? 'warning' : 'default'} />
            </div>
            <div className="space-y-3">
              {standups.map((s) => <StandupCard key={s.id} standup={s} showPerson={false} />)}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'warning' }) {
  return (
    <div className="bg-surface-1 border border-border-default rounded-lg px-4 py-2.5 min-w-28">
      <p className="font-mono text-[10px] uppercase tracking-wider text-text-4">{label}</p>
      <p className={tone === 'warning'
        ? 'font-display font-bold text-[18px] text-warning'
        : 'font-display font-bold text-[18px] text-text-1'}>{value}</p>
    </div>
  )
}
