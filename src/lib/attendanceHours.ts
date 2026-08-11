// Pure monthly-hours engine for the attendance Reports tab. No React, no Supabase.
//
// Model: "hours worked" is real labour only. Check-out is no longer a tracked
// user action — the only clock event is the morning check-in, and the day-end
// cron records the end of day. Every clocked day is therefore counted as
// check-in → work_end, minus approved out-of-office time. Overtime is not derived
// from clock times at all; it comes solely from the approved overtime-request
// flow, folded in by the Reports tab.
//   • Required target = Σ over ELAPSED working days of daily_expected
//     (= work_end − work_start). Approved full leave → 0 expected that day.
//     Half-day leave (day_type='leave', day_part<>'full') → half expected, and
//     credit for the half they worked is capped at that half. WFH → credited.
//     Absent / no record on an elapsed working day → full expected, 0 worked.
//     Holiday / non-working / future → excluded.
//   • Worked = work_end − effective_start − excluded_minutes. Early arrival is
//     capped at work_start; excluded_minutes is approved out-of-office time.
//   • Net = worked − expected. Negative = owed make-up hours (this is how
//     approved early-departure/late-arrival exceptions surface — they shorten the
//     worked day via excluded_minutes).

export interface HoursSettings {
  workStartMin: number // minutes since midnight, office tz
  workEndMin: number
}

export type DayKind =
  | 'worked'
  | 'wfh'
  | 'half_day'
  | 'leave'
  | 'absent'
  | 'holiday' // non-working day (Sunday/holiday/off-Saturday)
  | 'future'

export interface AttendanceLike {
  date: string // YYYY-MM-DD
  /** Attendance fact only: present | late | absent | null. Never leave/wfh. */
  status: string | null
  /** work | leave | wfh | holiday. */
  day_type: string
  /** full | first_half | second_half. Only leave is ever partial. */
  day_part: string
  check_in: string | null
  excluded_minutes?: number
}

export interface DayHours {
  date: string
  kind: DayKind
  expectedMin: number
  workedMin: number
}

export interface EmployeeHours {
  expectedMin: number
  workedMin: number
  deficitMin: number // max(0, expected − worked) — owed make-up hours
  netMin: number // worked − expected (signed)
  days: DayHours[]
}

export interface ComputeHoursArgs {
  records: AttendanceLike[]
  year: number
  month: number // 1-indexed
  settings: HoursSettings
  isWorkingDay: (dateStr: string) => boolean
  todayStr: string // YYYY-MM-DD in office tz
  /** UTC ISO → minutes since office-local midnight. */
  toLocalMinutes: (iso: string) => number
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function computeEmployeeHours(args: ComputeHoursArgs): EmployeeHours {
  const { records, year, month, settings, isWorkingDay, todayStr, toLocalMinutes } = args
  const { workStartMin, workEndMin } = settings
  const dailyExpected = Math.max(0, workEndMin - workStartMin)

  const byDate = new Map<string, AttendanceLike>()
  for (const r of records) byDate.set(r.date, r)

  // Worked minutes for a clocked day: check-in → work_end, minus approved
  // out-of-office time. Check-out is not tracked, so the day always ends at
  // work_end; early arrival is capped at work_start.
  const clocked = (rec: AttendanceLike): { worked: number } => {
    if (!rec.check_in) return { worked: 0 }
    const effStart = Math.max(toLocalMinutes(rec.check_in), workStartMin)
    const excluded = rec.excluded_minutes ?? 0
    return { worked: Math.max(0, workEndMin - effStart - excluded) }
  }

  const days: DayHours[] = []
  const lastDay = new Date(year, month, 0).getDate()

  for (let d = 1; d <= lastDay; d++) {
    const dateStr = `${year}-${pad(month)}-${pad(d)}`

    if (dateStr > todayStr) {
      days.push({ date: dateStr, kind: 'future', expectedMin: 0, workedMin: 0 })
      continue
    }
    if (!isWorkingDay(dateStr)) {
      days.push({ date: dateStr, kind: 'holiday', expectedMin: 0, workedMin: 0 })
      continue
    }

    const rec = byDate.get(dateStr)

    // The two facts are read from their own columns now. `halfDayDates` used to be
    // passed in to force half credit on days whose row had been overwritten to
    // 'present' by a check-in — that compensation is gone because the overwrite is.
    const isLeave = rec?.day_type === 'leave'
    const isHalf = isLeave && rec.day_part !== 'full'

    if (isLeave && !isHalf) {
      days.push({ date: dateStr, kind: 'leave', expectedMin: 0, workedMin: 0 })
    } else if (isHalf) {
      // Half the day is owed; whatever they actually worked on the other half counts.
      const { worked } = rec ? clocked(rec) : { worked: 0 }
      days.push({
        date: dateStr,
        kind: 'half_day',
        expectedMin: dailyExpected / 2,
        workedMin: Math.min(worked, dailyExpected / 2),
      })
    } else if (rec?.day_type === 'wfh') {
      days.push({
        date: dateStr,
        kind: 'wfh',
        expectedMin: dailyExpected,
        workedMin: dailyExpected,
      })
    } else if (rec?.day_type === 'holiday') {
      days.push({ date: dateStr, kind: 'holiday', expectedMin: 0, workedMin: 0 })
    } else if (!rec || rec.status === 'absent' || !rec.check_in) {
      days.push({ date: dateStr, kind: 'absent', expectedMin: dailyExpected, workedMin: 0 })
    } else {
      const { worked } = clocked(rec)
      days.push({
        date: dateStr,
        kind: 'worked',
        expectedMin: dailyExpected,
        workedMin: worked,
      })
    }
  }

  const expectedMin = days.reduce((a, x) => a + x.expectedMin, 0)
  const workedMin = days.reduce((a, x) => a + x.workedMin, 0)

  return {
    expectedMin,
    workedMin,
    deficitMin: Math.max(0, expectedMin - workedMin),
    netMin: workedMin - expectedMin,
    days,
  }
}
