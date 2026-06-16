// Pure monthly-hours engine for the attendance Reports tab. No React, no Supabase.
//
// Model (see plan): "hours worked" is real labour only.
//   • Required target = Σ over ELAPSED working days of daily_expected
//     (= work_end − work_start). Approved full leave → 0 expected that day.
//     Half-day (leave or status) → half expected. WFH → credited as worked.
//     Absent / no record on an elapsed working day → full expected, 0 worked.
//     Holiday / non-working / future → excluded.
//   • Worked time caps at work_end. A checkout within [work_end, work_end+buffer]
//     counts to work_end with no overtime; beyond the buffer it counts fully and
//     overtime accrues from work_end. Early arrival is capped at work_start.
//   • excluded_minutes (approved out-of-office time, written by the auto-checkout
//     job) is subtracted from the day's worked total.
//   • Net = worked − expected. Positive = surplus/overtime, negative = owed
//     make-up hours (this is how approved early-departure/late-arrival exceptions
//     surface — they simply shorten the worked day).

export interface HoursSettings {
  workStartMin: number // minutes since midnight, office tz
  workEndMin: number
  checkoutBufferMin: number
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
  check_out: string | null
  excluded_minutes?: number
}

export interface DayHours {
  date: string
  kind: DayKind
  expectedMin: number
  workedMin: number
  overtimeMin: number
}

export interface EmployeeHours {
  expectedMin: number
  workedMin: number
  overtimeMin: number
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
  const { workStartMin, workEndMin, checkoutBufferMin } = settings
  const dailyExpected = Math.max(0, workEndMin - workStartMin)

  const byDate = new Map<string, AttendanceLike>()
  for (const r of records) byDate.set(r.date, r)

  // Worked minutes + overtime for a clocked day, applying the cap/buffer rule and
  // subtracting out-of-office excluded minutes.
  const clocked = (rec: AttendanceLike): { worked: number; ot: number } => {
    if (!rec.check_in) return { worked: 0, ot: 0 }
    const effStart = Math.max(toLocalMinutes(rec.check_in), workStartMin)
    let worked: number
    let ot = 0
    if (rec.check_out === null) {
      // No checkout yet — credit up to work_end (matches the auto-checkout backfill).
      worked = Math.max(0, workEndMin - effStart)
    } else {
      const co = toLocalMinutes(rec.check_out)
      if (co <= workEndMin) {
        worked = Math.max(0, co - effStart)
      } else if (co <= workEndMin + checkoutBufferMin) {
        worked = Math.max(0, workEndMin - effStart)
      } else {
        worked = Math.max(0, co - effStart)
        ot = co - workEndMin
      }
    }
    const excluded = rec.excluded_minutes ?? 0
    worked = Math.max(0, worked - excluded)
    return { worked, ot }
  }

  const days: DayHours[] = []
  const lastDay = new Date(year, month, 0).getDate()

  for (let d = 1; d <= lastDay; d++) {
    const dateStr = `${year}-${pad(month)}-${pad(d)}`

    if (dateStr > todayStr) {
      days.push({ date: dateStr, kind: 'future', expectedMin: 0, workedMin: 0, overtimeMin: 0 })
      continue
    }
    if (!isWorkingDay(dateStr)) {
      days.push({ date: dateStr, kind: 'holiday', expectedMin: 0, workedMin: 0, overtimeMin: 0 })
      continue
    }

    const rec = byDate.get(dateStr)
    const isHalf = rec?.status === 'half_day' || halfDayDates.has(dateStr)

    if (rec?.status === 'leave') {
      days.push({ date: dateStr, kind: 'leave', expectedMin: 0, workedMin: 0, overtimeMin: 0 })
    } else if (isHalf) {
      const { worked, ot } = rec ? clocked(rec) : { worked: 0, ot: 0 }
      days.push({
        date: dateStr,
        kind: 'half_day',
        expectedMin: dailyExpected / 2,
        workedMin: worked,
        overtimeMin: ot,
      })
    } else if (rec?.status === 'wfh') {
      days.push({
        date: dateStr,
        kind: 'wfh',
        expectedMin: dailyExpected,
        workedMin: dailyExpected,
        overtimeMin: 0,
      })
    } else if (!rec || rec.status === 'absent' || !rec.check_in) {
      days.push({ date: dateStr, kind: 'absent', expectedMin: dailyExpected, workedMin: 0, overtimeMin: 0 })
    } else {
      const { worked, ot } = clocked(rec)
      days.push({
        date: dateStr,
        kind: 'worked',
        expectedMin: dailyExpected,
        workedMin: worked,
        overtimeMin: ot,
      })
    }
  }

  const expectedMin = days.reduce((a, x) => a + x.expectedMin, 0)
  const workedMin = days.reduce((a, x) => a + x.workedMin, 0)
  const overtimeMin = days.reduce((a, x) => a + x.overtimeMin, 0)

  return {
    expectedMin,
    workedMin,
    overtimeMin,
    deficitMin: Math.max(0, expectedMin - workedMin),
    netMin: workedMin - expectedMin,
    days,
  }
}
