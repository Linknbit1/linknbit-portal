// Shared attendance policy: day gates, late-cutoff resolution and status
// computation, used by both attendance-checkin (portal button) and
// attendance-biometric-punch (ZKTeco terminal relayed by the Pi).
//
// These helpers deliberately return structured verdicts instead of Responses.
// The two callers need the same *decision* but take opposite actions on it:
// the portal path rejects a failed gate with a 4xx, while a terminal punch has
// already physically happened and can only be recorded with a reason. Sharing
// the verdict keeps the rules in one place without forcing one path's error
// handling onto the other.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

/** Grace applied either side of an approved exception time. */
export const EXC_GRACE_MIN = 10

export interface PolicySettings {
  timezone: string
  work_start_time: string
  work_end_time: string
  /** When the second half of the day begins; the cutoff for a first-half day off. */
  half_day_start_time: string
  grace_period_min: number
  early_checkin_min: number | null
  saturday_working: boolean
  min_excluded_gap_min: number
}

export interface JobTypePolicy {
  require_office_network: boolean
  auto_detect_network: boolean
  enforce_schedule_window: boolean
  attendance_via_terminal: boolean
}

/** Strict on-site defaults, used when a job_type_policies row is missing. */
export const DEFAULT_POLICY: JobTypePolicy = {
  require_office_network: true,
  auto_detect_network: false,
  enforce_schedule_window: true,
  attendance_via_terminal: false,
}

export function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function fmtHHMM(total: number): string {
  const h = String(Math.floor(total / 60)).padStart(2, '0')
  const m = String(total % 60).padStart(2, '0')
  return `${h}:${m}`
}

export interface LocalParts {
  /** YYYY-MM-DD in the configured timezone. */
  today: string
  /** Minutes since local midnight. */
  localMinutes: number
  /** 0 = Sunday … 6 = Saturday. */
  dayOfWeek: number
}

// Uses Intl.DateTimeFormat rather than new Date(toLocaleString()) because the
// locale string format is not guaranteed parseable in Deno. en-CA reliably
// formats as YYYY-MM-DD, which PostgreSQL date columns expect.
export function localParts(at: Date, tz: string): LocalParts {
  const timeStr = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(at)
  const [h, m] = timeStr.split(':').map(Number)

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(at)
  const [ty, tm, td] = today.split('-').map(Number)

  return {
    today,
    localMinutes: h * 60 + m,
    // Constructed in local time purely to read back the weekday.
    dayOfWeek: new Date(ty, tm - 1, td).getDay(),
  }
}

export type DayGate =
  | { blocked: false }
  | { blocked: true; code: 'weekend'; message: string }
  | { blocked: true; code: 'holiday'; message: string; holidayName: string | null }

/**
 * Company-wide calendar gates: Sundays, non-working Saturdays and holidays.
 * Applies to every attendance path — a terminal punch on a holiday is still
 * "not a working day", it is just recorded rather than refused.
 */
export async function checkDayGates(
  db: SupabaseClient,
  today: string,
  dayOfWeek: number,
  settings: Pick<PolicySettings, 'saturday_working'>,
): Promise<DayGate> {
  if (dayOfWeek === 0) {
    return { blocked: true, code: 'weekend', message: 'Check-in is not allowed on Sundays.' }
  }

  if (dayOfWeek === 6 && !settings.saturday_working) {
    // A specific Saturday can be opted in via working_saturdays.
    const { data: workingSat } = await db
      .from('working_saturdays')
      .select('id')
      .eq('date', today)
      .maybeSingle()

    if (!workingSat) {
      return { blocked: true, code: 'weekend', message: 'Check-in is not allowed on Saturdays.' }
    }
  }

  const { data: holiday } = await db
    .from('holidays')
    .select('name')
    .eq('date', today)
    .maybeSingle()

  if (holiday) {
    const name: string | null = holiday.name ?? null
    return {
      blocked: true,
      code: 'holiday',
      message: `Check-in is not allowed on a holiday${name ? ` (${name})` : ''}.`,
      holidayName: name,
    }
  }

  return { blocked: false }
}

export interface CutoffResult {
  /** Minutes since local midnight; at or before this is on-time. */
  lateCutoff: number
  /** Earliest permitted arrival (work_start - early_checkin_min). */
  openMinutes: number
  /** Latest permitted arrival (work_end_time). */
  endMinutes: number
  /**
   * False when an approved late-arrival exception waives the early-window lower
   * bound (the employee is arriving late on purpose).
   */
  lowerBoundActive: boolean
}

/**
 * Resolves the on-time boundary for one employee on one date, layering:
 *   work_start + grace  →  profiles.allowed_check_in  →  first-half day off
 *   (half_day_start + grace)  →  approved late_arrival
 * Each later source replaces the earlier one entirely rather than stacking, so
 * a per-employee allowance does not also get the grace period on top.
 */
export async function resolveCutoffs(
  db: SupabaseClient,
  profileId: string,
  today: string,
  settings: PolicySettings,
  allowedCheckIn: string | null,
): Promise<CutoffResult> {
  const startMinutes = minutesOf(settings.work_start_time)
  const openMinutes = startMinutes - (settings.early_checkin_min ?? 0)
  const endMinutes = minutesOf(settings.work_end_time)

  let lateCutoff = startMinutes + settings.grace_period_min
  if (allowedCheckIn) lateCutoff = minutesOf(allowedCheckIn)

  // Off for the FIRST half: not due in until the second half starts, so measure
  // from there. Without this the cutoff stayed at work_start + grace and every
  // such arrival was late by definition, however early they actually turned up.
  // Read from the attendance row rather than a parameter so no call site can
  // forget it — the leave/WFH sync has already stamped day_part by the time an
  // arrival is recorded. Keyed on day_part alone, so a partial WFH counts too.
  //
  // This replaces the per-employee allowance rather than stacking with it: the
  // allowance describes a normal day, and this is not one. An approved
  // late-arrival exception below still wins, being specific to this date.
  const { data: dayRow } = await db
    .from('attendance')
    .select('day_part')
    .eq('profile_id', profileId)
    .eq('date', today)
    .maybeSingle()

  if (dayRow?.day_part === 'first_half') {
    lateCutoff = minutesOf(settings.half_day_start_time) + settings.grace_period_min
  }

  let lowerBoundActive = true
  const { data: lateExc } = await db
    .from('attendance_exceptions')
    .select('requested_time')
    .eq('profile_id', profileId)
    .eq('date', today)
    .eq('exception_type', 'late_arrival')
    .eq('status', 'approved')
    .maybeSingle()

  if (lateExc?.requested_time) {
    lateCutoff = minutesOf(lateExc.requested_time) + EXC_GRACE_MIN
    lowerBoundActive = false
  }

  return { lateCutoff, openMinutes, endMinutes, lowerBoundActive }
}

/**
 * With schedule enforcement disabled (flexible remote/hybrid hours) there is no
 * late penalty at all — the arrival is always 'present'.
 */
export function computeStatus(
  localMinutes: number,
  lateCutoff: number,
  enforceScheduleWindow: boolean,
): 'present' | 'late' {
  return !enforceScheduleWindow || localMinutes <= lateCutoff ? 'present' : 'late'
}

export type ExistingRowKind =
  /** No row yet for this date. */
  | 'none'
  /** An arrival is already recorded for today. */
  | 'duplicate'
  /** Off for the WHOLE day — there is no half left to work. */
  | 'leave'
  /** Approved WFH: record the arrival, but waive the office-network gate. */
  | 'wfh'
  /** Anything else (absence placeholder, holiday, HALF-day leave) that an arrival supersedes. */
  | 'override'

export interface ExistingAttendanceRow {
  source: string
  status: string | null
  day_type: string
  day_part: string
  check_in: string | null
}

/**
 * Classifies the pre-existing attendance row for the date. Approved WFH/leave and
 * the nightly absence job all pre-insert 'system' rows, so the presence of a row
 * is not by itself a duplicate.
 *
 * Two fixes over the previous version, both causes of the same reported bug:
 *
 *  - It keys off day_type, not status. A half-day leave used to be status
 *    'half_day', which matched no branch here and fell through to 'override' — so
 *    the caller overwrote status with present/late and the leave vanished. Only a
 *    FULL day off blocks an arrival now; a half day is explicitly workable, and
 *    day_type/day_part are a different column that the arrival never touches.
 *
 *  - 'duplicate' now means "an arrival is already recorded" (check_in present)
 *    rather than "the row's source is self/biometric". Source described who wrote
 *    the row last, which is not the same question, and a leave sync stamping the
 *    row could change the answer.
 */
export function classifyExistingRow(
  existing: ExistingAttendanceRow | null,
): ExistingRowKind {
  if (!existing) return 'none'
  if (existing.check_in) return 'duplicate'
  if (existing.day_type === 'leave' && existing.day_part === 'full') return 'leave'
  if (existing.day_type === 'wfh') return 'wfh'
  return 'override'
}

export function ipInCidr(ip: string, cidr: string): boolean {
  try {
    const [range, bits] = cidr.split('/')
    const mask = ~((1 << (32 - Number(bits))) - 1) >>> 0
    const ipParts = ip.split('.').map(Number)
    const rangeParts = range.split('.').map(Number)
    if (ipParts.length !== 4 || rangeParts.length !== 4) return false
    const ipInt = ((ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3]) >>> 0
    const rangeInt = ((rangeParts[0] << 24) | (rangeParts[1] << 16) | (rangeParts[2] << 8) | rangeParts[3]) >>> 0
    return (ipInt & mask) === (rangeInt & mask)
  } catch {
    return false
  }
}
