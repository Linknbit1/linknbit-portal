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
  prevMonth: () => void
  nextMonth: () => void
  isCurrentMonth: boolean
  label: string
  /** True when a 'YYYY-MM-DD' falls in the selected month (always true for "All months"). */
  inMonth: (date: string) => boolean
}

/** Month stepper state shared by the request tabs (mirrors the Overtime tab). */
export function useMonthFilter(): MonthFilter {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [allMonths, setAllMonths] = useState(false)

  const prefix = `${year}-${String(month).padStart(2, '0')}`
  return {
    year,
    month,
    allMonths,
    setAllMonths,
    prevMonth: () => { if (month === 1) { setYear((y) => y - 1); setMonth(12) } else setMonth((m) => m - 1) },
    nextMonth: () => { if (month === 12) { setYear((y) => y + 1); setMonth(1) } else setMonth((m) => m + 1) },
    isCurrentMonth: year === now.getFullYear() && month === now.getMonth() + 1,
    label: allMonths ? 'All months' : `${MONTH_NAMES[month - 1]} ${year}`,
    inMonth: (date: string) => allMonths || date.startsWith(prefix),
  }
}
