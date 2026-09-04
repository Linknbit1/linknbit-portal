import { Link } from 'react-router-dom'
import { Plane, Plus } from 'lucide-react'
import { useMyLeaveBalances } from '../../hooks/useAttendance'

/**
 * What you have left, and the way to spend it.
 *
 * Filing a request lives in the queue now, so this is not a form — it is the
 * standing fact the form used to sit under. The number answers a question people
 * ask without meaning to request anything ("how much leave have I got?"), which
 * is why it stays on My Attendance rather than moving into the sheet with
 * everything else. The sheet shows the same figure again on its type dropdown,
 * where it answers a different question: whether the request being written fits.
 *
 * The button is a link, not a second form: `?new=leave` opens the queue with the
 * sheet already on the Leave tab.
 */
export function LeaveBalanceCard() {
  const { data: balances = [], isLoading } = useMyLeaveBalances()

  if (isLoading || balances.length === 0) return null

  return (
    <section className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3.5 border-b border-border-subtle">
        <Plane size={15} className="text-brand-red shrink-0" />
        <h2 className="font-display font-bold text-[15px] text-text-1">Leave balance</h2>
        {/* A link rather than a Button with an onClick: it goes somewhere, so
            it should middle-click and open in a new tab like anything else that
            does. Styled as the secondary button it sits in for. */}
        <Link
          to="/attendance/requests?new=leave"
          className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-sm border border-border-default bg-surface-2 px-3 font-ui text-body-sm font-medium text-text-1 transition-colors hover:bg-surface-3"
        >
          <Plus size={13} />
          Request leave
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-px bg-border-subtle sm:grid-cols-3">
        {balances.map((b) => (
          <div key={b.type.id} className="bg-surface-1 p-4">
            <p className="font-ui text-[11.5px] text-text-3 truncate">{b.type.name}</p>
            <p className="font-display font-bold text-[20px]/tight text-text-1 mt-0.5">
              {b.remaining}
              <span className="font-mono text-[11px] text-text-4 font-normal"> / {b.type.days_allowed}</span>
            </p>
            <p className="font-mono text-[10px] text-text-4">days left</p>
          </div>
        ))}
      </div>
    </section>
  )
}
