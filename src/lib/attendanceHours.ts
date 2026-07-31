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
//     Half-day (leave or status) → half expected. WFH → credited as worked.
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
  status: string
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
  /** Dates with an approved half-day leave (forces half credit even if the row
   *  stayed 'present' because the employee checked in before approval). */
  halfDayDates: Set<string>
  todayStr: string // YYYY-MM-DD in office tz
  /** UTC ISO → minutes since office-local midnight. */
  toLocalMinutes: (iso: string) => number
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function computeEmployeeHours(args: ComputeHoursArgs): EmployeeHours {
  const { records, year, month, settings, isWorkingDay, halfDayDates, todayStr, toLocalMinutes } = args
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
    const isHalf = rec?.status === 'half_day' || halfDayDates.has(dateStr)

    if (rec?.status === 'leave') {
      days.push({ date: dateStr, kind: 'leave', expectedMin: 0, workedMin: 0 })
    } else if (isHalf) {
      const { worked } = rec ? clocked(rec) : { worked: 0 }
      days.push({
        date: dateStr,
        kind: 'half_day',
        expectedMin: dailyExpected / 2,
        workedMin: worked,
      })
    } else if (rec?.status === 'wfh') {
      days.push({
        date: dateStr,
        kind: 'wfh',
        expectedMin: dailyExpected,
        workedMin: dailyExpected,
      })
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
