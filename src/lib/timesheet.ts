/**
 * Clock arithmetic and day-state naming for the timesheet chart.
 *
 * Everything the bars need is expressed as minutes past midnight in the office
 * timezone, because that is the only unit in which a timer segment (a UTC
 * instant), a work-start setting (a bare 'HH:MM') and a break window can be
 * compared at all. Converting once, here, keeps the components doing geometry
 * rather than timezone maths.
 */

const MINUTES_IN_DAY = 24 * 60

/** 'HH:MM' (or 'HH:MM:SS') to minutes past midnight. Null for anything else. */
export function parseClock(value: string | null | undefined): number | null {
  const match = value ? /^(\d{1,2}):(\d{2})/.exec(value) : null
  if (!match) return null
  const minutes = Number(match[1]) * 60 + Number(match[2])
  return minutes >= 0 && minutes <= MINUTES_IN_DAY ? minutes : null
}

/** An instant, as minutes past midnight in the office timezone. */
export function minutesInto(at: string, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date(at))
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0)
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0)
  return h * 60 + m
}

/** "9:12 AM" — the twelve-hour reading of an instant, in the office timezone. */
export function clockAt(at: string, tz: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(new Date(at))
}

/** "9:00 AM" from minutes past midnight. */
export function formatClock12(minutes: number): string {
  const total = Math.max(0, Math.min(MINUTES_IN_DAY, Math.round(minutes)))
  const h24 = Math.floor(total / 60) % 24
  const m = total % 60
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h12}:${String(m).padStart(2, '0')} ${h24 >= 12 ? 'PM' : 'AM'}`
}

/**
 * An hour tick on the ruler. The meridiem is spelled out only where it would
 * otherwise be guesswork — the first tick and each time it flips — so twelve
 * labels in a row do not turn into twelve "AM"s fighting for the same pixels.
 */
export function hourTick(hour: number, isFirst: boolean): string {
  const h24 = ((hour % 24) + 24) % 24
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  const showMeridiem = isFirst || h24 === 0 || h24 === 12
  return showMeridiem ? `${h12} ${h24 >= 12 ? 'PM' : 'AM'}` : String(h12)
}

/** Where a [from, to] minute span sits on a bar running from `start` to `end`. */
export function spanOn(
  from: number, to: number, start: number, end: number,
): { left: number; width: number } | null {
  const span = Math.max(1, end - start)
  const clippedFrom = Math.max(from, start)
  const clippedTo = Math.min(to, end)
  if (clippedTo <= clippedFrom) return null
  return {
    left: ((clippedFrom - start) / span) * 100,
    width: ((clippedTo - clippedFrom) / span) * 100,
  }
}

/* ── What kind of day it was ──────────────────────────────────────────────── */

export type DayState = 'off' | 'holiday' | 'leave' | 'wfh' | 'present' | 'late' | 'absent' | 'no_show'

export interface DayFacts {
  is_working_day: boolean
  day_type: string
  day_part: string
  att_status: string | null
}

/**
 * One word for the day, for filtering and for the row's wash colour.
 *
 * The day kind wins over the attendance status on a full day off — somebody on
 * approved leave has no arrival to be judged on — but on a half day the status
 * still decides, because half of that day they were due in.
 */
export function dayState(facts: DayFacts): DayState {
  const fullDay = facts.day_part === 'full'
  if (facts.day_type === 'holiday') return 'holiday'
  if (!facts.is_working_day) return 'off'
  if (facts.day_type === 'leave' && fullDay) return 'leave'
  if (facts.att_status === 'late') return 'late'
  if (facts.att_status === 'absent') return fullDay ? 'absent' : 'no_show'
  if (facts.day_type === 'wfh') return 'wfh'
  if (facts.att_status === 'present') return 'present'
  if (facts.day_type === 'leave') return 'leave'
  return 'absent'
}

/** True when nobody was expected in at all, so an empty bar is not a finding. */
export function isDayOff(state: DayState): boolean {
  return state === 'off' || state === 'holiday' || state === 'leave'
}

/* ── Exceptions, as bands on the bar ──────────────────────────────────────── */

export const EXCEPTION_LABELS: Record<string, string> = {
  late_arrival: 'Late arrival',
  early_departure: 'Early departure',
  out_of_office: 'Out of office',
}

/**
 * The stretch of the day an approved exception took away.
 *
 * A late arrival eats the front of the working window, an early departure the
 * back, and an out-of-office the middle — so all three are the same shape once
 * the missing edge is filled in from the person's own expected window.
 */
export function exceptionSpan(
  exception: { type: string; requested_time: string | null; return_time: string | null },
  expectedStart: number,
  expectedEnd: number,
): { from: number; to: number } | null {
  const at = parseClock(exception.requested_time)
  if (at === null) return null

  if (exception.type === 'late_arrival') {
    return at > expectedStart ? { from: expectedStart, to: at } : null
  }
  if (exception.type === 'early_departure') {
    return at < expectedEnd ? { from: at, to: expectedEnd } : null
  }
  // Out of office with no stated return runs to the end of the day: they said
  // when they left and never said they were back.
  const back = parseClock(exception.return_time) ?? expectedEnd
  return back > at ? { from: at, to: back } : null
}
