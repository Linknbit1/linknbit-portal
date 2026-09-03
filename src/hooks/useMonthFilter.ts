import { useState } from 'react'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export interface MonthFilter {
  year: number
  month: number
  allMonths: boolean
  setAllMonths: (v: boolean) => void
  /** Back to the period this filter opened on. Drives "Clear filters". */
  reset: () => void
  /** True when the period has been moved off the one the screen opened on. */
  isDefault: boolean
  prevMonth: () => void
  nextMonth: () => void
  isCurrentMonth: boolean
  label: string
  /** True when a 'YYYY-MM-DD' falls in the selected month (always true for "All months"). */
  inMonth: (date: string) => boolean
  /**
   * True when a range touches the selected month at all — a week of leave that
   * starts in March and ends in April belongs to both, and filtering on its
   * first day alone would lose it from one of them.
   */
  overlapsMonth: (start: string, end: string) => boolean
}

/**
 * Month stepper state shared by the request tabs (mirrors the Overtime tab).
 *
 * `startAllMonths` opens on every month rather than this one. Default off: a
 * screen almost always means "the month I am in", and an all-months list is a
 * long scroll whose top is rarely what somebody came for. `reset()` returns to
 * whichever of the two the screen opened on, so Clear filters puts the period
 * back where the user found it rather than somewhere it has never been.
 */
export function useMonthFilter(startAllMonths = false): MonthFilter {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [allMonths, setAllMonths] = useState(startAllMonths)

  const prefix = `${year}-${String(month).padStart(2, '0')}`
  const isThisMonth = year === now.getFullYear() && month === now.getMonth() + 1
  return {
    year,
    month,
    allMonths,
    setAllMonths,
    reset: () => {
      setYear(now.getFullYear())
      setMonth(now.getMonth() + 1)
      setAllMonths(startAllMonths)
    },
    isDefault: allMonths === startAllMonths && (startAllMonths || isThisMonth),
    prevMonth: () => { if (month === 1) { setYear((y) => y - 1); setMonth(12) } else setMonth((m) => m - 1) },
    nextMonth: () => { if (month === 12) { setYear((y) => y + 1); setMonth(1) } else setMonth((m) => m + 1) },
    isCurrentMonth: isThisMonth,
    label: allMonths ? 'All months' : `${MONTH_NAMES[month - 1]} ${year}`,
    inMonth: (date: string) => allMonths || date.startsWith(prefix),
    // '-31' is a safe upper bound: ISO dates sort lexicographically and no day
    // is higher, so no month needs its real length looked up.
    overlapsMonth: (start: string, end: string) =>
      allMonths || (start <= `${prefix}-31` && end >= `${prefix}-01`),
  }
}
