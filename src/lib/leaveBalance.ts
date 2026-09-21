/**
 * How a leave balance reads, in one place.
 *
 * Two screens show this number — the request sheet and the member profile — and
 * they must agree, because one of them is where somebody decides whether to
 * approve a request against it.
 *
 * The number can be negative. Nothing here clamps it: a person 1.5 days past
 * their allowance reads "1.5 days over", not "0 left". The old client-side
 * calculation wrapped the subtraction in `Math.max(0, …)`, which meant the single
 * fact an approver needed was the single fact the screen could not express.
 */

/** Whole days print bare; halves print to one place. Never "9.50", never "9". */
export function formatLeaveDays(days: number): string {
  return Number.isInteger(days) ? String(days) : days.toFixed(1)
}

export interface LeaveBalanceReading {
  /** "3 left", "1.5 over", "none left". */
  label: string
  /** Past the allowance — render in the danger tone and say so. */
  over: boolean
  /** Exactly nothing remaining. Not an error, but not spendable either. */
  exhausted: boolean
}

export function readLeaveBalance(remaining: number): LeaveBalanceReading {
  if (remaining < 0) {
    return { label: `${formatLeaveDays(Math.abs(remaining))} over`, over: true, exhausted: false }
  }
  if (remaining === 0) {
    return { label: 'none left', over: false, exhausted: true }
  }
  return { label: `${formatLeaveDays(remaining)} left`, over: false, exhausted: false }
}

/**
 * How full the bar is, allowing overflow to read as full rather than as a bar
 * that quietly stops growing. Capped at 100 for geometry; `over` carries the
 * rest of the story.
 */
export function leaveUsedPercent(used: number, allowed: number): number {
  if (allowed <= 0) return 0
  return Math.min(100, Math.round((used / allowed) * 100))
}

/**
 * True when the balance query was refused rather than empty.
 *
 * `leave_balances` raises rather than returning a partial figure, so a viewer who
 * may not see all of somebody's leave gets an error, not a wrong number. The two
 * cases look identical to a component unless it asks.
 */
export function isLeaveBalanceForbidden(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const code = 'code' in error ? String(error.code) : ''
  const message = 'message' in error ? String(error.message) : ''
  return code === '42501' || message.toLowerCase().includes('forbidden')
}
