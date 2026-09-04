import { useMemo, useState } from 'react'

export type RangeMode = 'day' | 'week' | 'month' | 'custom'

export interface DateRangeFilter {
  mode: RangeMode
  setMode: (mode: RangeMode) => void
  /** Inclusive bounds, `YYYY-MM-DD`, always ordered from ≤ to. */
  from: string
  to: string
  /** Day mode edits one date; custom mode edits both ends. */
  setDay: (date: string) => void
  setFrom: (date: string) => void
  setTo: (date: string) => void
  step: (delta: number) => void
  /** True when the span contains today, so Next can be stopped at the present. */
  includesToday: boolean
  /** Whether stepping means anything — a custom span is set, not walked. */
  steppable: boolean
  label: string
  /** How many days the span covers, for deciding whether a Date column earns its place. */
  dayCount: number
  reset: () => void
  isDefault: boolean
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** Local calendar date (`en-CA` renders ISO), never UTC — a working day is local. */
function localToday(): string {
  return new Intl.DateTimeFormat('en-CA').format(new Date())
}

const iso = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Parsed as local midnight: `new Date('2026-09-04')` is UTC and can land a day early. */
const parse = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const addDays = (s: string, n: number): string => {
  const d = parse(s)
  d.setDate(d.getDate() + n)
  return iso(d)
}

/** Monday-first, because the working week is and the calendar grid already is. */
function startOfWeek(s: string): string {
  const d = parse(s)
  const dow = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dow)
  return iso(d)
}

const startOfMonth = (s: string): string => `${s.slice(0, 7)}-01`

function endOfMonth(s: string): string {
  const d = parse(s)
  return iso(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}

const shortDate = (s: string): string =>
  parse(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

/**
 * A span of dates that can be a day, a week, a month, or two dates you pick.
 *
 * One anchor date drives the first three: switching Day → Week → Month widens
 * around the day you were already looking at rather than jumping to today, so
 * "this day, now the week around it" is one press and keeps your place. Custom
 * keeps its own two ends, so flipping to Custom and back does not lose them.
 *
 * Bounds are always returned ordered. A custom range whose end is before its
 * start is a half-typed range, not an error worth blocking on — swapping is
 * what the reader meant, and the pickers show what they typed.
 */
export function useDateRangeFilter(initial: RangeMode = 'day'): DateRangeFilter {
  const today = localToday()
  const [mode, setModeRaw] = useState<RangeMode>(initial)
  const [anchor, setAnchor] = useState(today)
  const [customFrom, setCustomFrom] = useState(() => startOfMonth(today))
  const [customTo, setCustomTo] = useState(today)

  const [from, to] = useMemo<[string, string]>(() => {
    switch (mode) {
      case 'day': return [anchor, anchor]
      case 'week': {
        const start = startOfWeek(anchor)
        return [start, addDays(start, 6)]
      }
      case 'month': return [startOfMonth(anchor), endOfMonth(anchor)]
      case 'custom': return customFrom <= customTo ? [customFrom, customTo] : [customTo, customFrom]
    }
  }, [mode, anchor, customFrom, customTo])

  const label = useMemo(() => {
    switch (mode) {
      case 'day':
        return anchor === today
          ? 'Today'
          : parse(anchor).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      case 'week':
        return `${shortDate(from)} – ${shortDate(to)}`
      case 'month':
        return `${MONTHS[parse(anchor).getMonth()]} ${parse(anchor).getFullYear()}`
      case 'custom':
        return from === to ? shortDate(from) : `${shortDate(from)} – ${shortDate(to)}`
    }
  }, [mode, anchor, from, to, today])

  const step = (delta: number) => {
    if (mode === 'custom') return
    setAnchor((cur) => {
      if (mode === 'day') return addDays(cur, delta)
      if (mode === 'week') return addDays(cur, delta * 7)
      const d = parse(cur)
      return iso(new Date(d.getFullYear(), d.getMonth() + delta, 1))
    })
  }

  const dayCount = useMemo(() => {
    const ms = parse(to).getTime() - parse(from).getTime()
    return Math.round(ms / 86_400_000) + 1
  }, [from, to])

  const reset = () => {
    setModeRaw(initial)
    setAnchor(today)
    setCustomFrom(startOfMonth(today))
    setCustomTo(today)
  }

  return {
    mode,
    setMode: setModeRaw,
    from,
    to,
    setDay: setAnchor,
    setFrom: setCustomFrom,
    setTo: setCustomTo,
    step,
    includesToday: from <= today && today <= to,
    steppable: mode !== 'custom',
    label,
    dayCount,
    reset,
    isDefault: mode === initial && anchor === today,
  }
}
