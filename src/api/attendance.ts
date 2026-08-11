import { supabase } from '../lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '../types/database'

export type AttendanceRow = Tables<'attendance'>
export type AttendanceSettings = Tables<'attendance_settings'>
export type EnrolledDevice = Tables<'enrolled_devices'>
export type AttendanceException = Tables<'attendance_exceptions'>
export type HolidayRow = Tables<'holidays'>
export type OvertimeRequest = Tables<'overtime_requests'>

export interface CheckInResult {
  status: 'present' | 'late'
  check_in: string
  device_flagged: boolean
}

export interface AttendanceWithProfile extends AttendanceRow {
  profiles: { name: string; avatar_url: string | null } | null
}

export interface EnrolledDeviceWithProfile extends EnrolledDevice {
  profiles: { name: string; avatar_url: string | null } | null
}

export interface MarkAttendancePayload {
  profileId: string
  date: string
  status: string
  note?: string
  /** ISO timestamp; only written when provided (lets HR record the time). */
  checkIn?: string | null
}

// ── Employee self check-in (calls Edge Function) ──────────────────────────────

export async function checkIn(payload: {
  deviceFingerprint: string
  deviceName: string
  fingerprintHint?: string
}): Promise<CheckInResult> {
  const { data, error } = await supabase.functions.invoke<CheckInResult>('attendance-checkin', {
    body: {
      device_fingerprint: payload.deviceFingerprint,
      device_name: payload.deviceName,
      fingerprint_hint: payload.fingerprintHint,
    },
  })
  if (error) {
    // FunctionsHttpError wraps the Response — read structured body so callers get code + message
    const ctx = (error as { context?: Response }).context
    if (ctx) {
      let body: { error?: string; code?: string } | null = null
      try { body = await ctx.json() } catch { /* non-JSON body */ }
      if (body?.code) {
        const enriched = new Error(body.error ?? error.message) as Error & { code: string }
        enriched.code = body.code
        throw enriched
      }
    }
    throw error
  }
  if (!data) throw new Error('No response from attendance-checkin')
  return data
}

// Check-out is no longer a user action. The only clock event is the morning
// check-in; the day-end cron (fn_auto_checkout_missing) records the end of day.

// ── My attendance history (last 30 days for current user) ────────────────────

export async function fetchMyAttendance(days = 30): Promise<AttendanceRow[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const since = new Date()
  since.setDate(since.getDate() - days)
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('profile_id', user.id)
    .gte('date', since.toISOString().split('T')[0])
    .order('date', { ascending: false })
  if (error) throw error
  return data
}

// ── My attendance for a specific month (current user) ─────────────────────────

export async function fetchMyMonthlyAttendance(
  year: number,
  month: number, // 1-indexed
): Promise<AttendanceRow[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const pad = (n: number) => String(n).padStart(2, '0')
  const from = `${year}-${pad(month)}-01`
  const last = new Date(year, month, 0).getDate()
  const to   = `${year}-${pad(month)}-${pad(last)}`
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('profile_id', user.id)
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: false })
  if (error) throw error
  return data
}

// ── Today's own record ───────────────────────────────────────────────────────

export async function fetchMyTodayAttendance(): Promise<AttendanceRow | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  // Local calendar date (matches localToday() in the UI and the check-in Edge Function),
  // NOT toISOString() which is UTC and rolls over a day early in UTC+ timezones.
  const today = new Intl.DateTimeFormat('en-CA').format(new Date())
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('profile_id', user.id)
    .eq('date', today)
    .maybeSingle()
  if (error) throw error
  return data
}

// ── All attendance (admin/HR — filtered by date) ─────────────────────────────

export async function fetchAllAttendance(date: string): Promise<AttendanceWithProfile[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('*, profiles!attendance_profile_id_fkey(name, avatar_url)')
    .eq('date', date)
    .order('created_at')
  if (error) throw error
  // as unknown: Supabase cannot infer the joined shape when multiple FKs exist on profiles
  return data as unknown as AttendanceWithProfile[]
}

// ── Admin mark attendance for any employee ────────────────────────────────────

export async function markAttendance(payload: MarkAttendancePayload): Promise<AttendanceRow> {
  const insert: TablesInsert<'attendance'> = {
    profile_id: payload.profileId,
    date: payload.date,
    status: payload.status,
    source: 'admin',
    note: payload.note,
  }
  // Only set the time when supplied so a plain status mark doesn't wipe it.
  if (payload.checkIn !== undefined)  insert.check_in  = payload.checkIn
  const { data, error } = await supabase
    .from('attendance')
    .upsert(insert, { onConflict: 'profile_id,date' })
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Admin edit an existing attendance record (by id) ─────────────────────────

export interface EditAttendancePayload {
  id: string
  status: string
  note?: string | null
  /** ISO timestamp or null to clear. Omit to leave it unchanged. */
  checkIn?: string | null
}

// Updates status/check-in/note in place without changing `source` (preserves
// whether the row was a self check-in vs system/admin). RLS: admin/super_admin/hr.
export async function updateAttendanceRecord(payload: EditAttendancePayload): Promise<AttendanceRow> {
  const update: TablesUpdate<'attendance'> = {
    status: payload.status,
    updated_at: new Date().toISOString(),
  }
  if (payload.note !== undefined)     update.note      = payload.note
  if (payload.checkIn !== undefined)  update.check_in  = payload.checkIn
  const { data, error } = await supabase
    .from('attendance')
    .update(update)
    .eq('id', payload.id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Attendance settings ───────────────────────────────────────────────────────

export async function fetchAttendanceSettings(): Promise<AttendanceSettings> {
  const { data, error } = await supabase
    .from('attendance_settings')
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function updateAttendanceSettings(
  payload: TablesUpdate<'attendance_settings'>
): Promise<AttendanceSettings> {
  const { data, error } = await supabase
    .from('attendance_settings')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('singleton', true)
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Enrolled devices ──────────────────────────────────────────────────────────

export async function fetchMyEnrolledDevices(): Promise<EnrolledDevice[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from('enrolled_devices')
    .select('*')
    .eq('profile_id', user.id)
    .order('first_seen_at', { ascending: false })
  if (error) throw error
  return data
}

export interface RegisterDeviceResult {
  status: 'approved' | 'pending'
}

// Self-service device registration (calls Edge Function). Employees/HR land in "pending"
// (an admin must approve); admins/super-admins are auto-approved.
export async function registerDevice(payload: {
  deviceFingerprint: string
  deviceName: string
  fingerprintHint?: string
}): Promise<RegisterDeviceResult> {
  const { data, error } = await supabase.functions.invoke<RegisterDeviceResult>('register-device', {
    body: {
      device_fingerprint: payload.deviceFingerprint,
      device_name: payload.deviceName,
      fingerprint_hint: payload.fingerprintHint,
    },
  })
  if (error) {
    const ctx = (error as { context?: Response }).context
    if (ctx) {
      let body: { error?: string; code?: string } | null = null
      try { body = await ctx.json() } catch { /* non-JSON body */ }
      if (body?.code) {
        const enriched = new Error(body.error ?? error.message) as Error & { code: string }
        enriched.code = body.code
        throw enriched
      }
    }
    throw error
  }
  if (!data) throw new Error('No response from register-device')
  return data
}

export async function fetchEnrolledDevices(): Promise<EnrolledDeviceWithProfile[]> {
  const { data, error } = await supabase
    .from('enrolled_devices')
    .select('*, profiles!enrolled_devices_profile_id_fkey(name, avatar_url)')
    .order('first_seen_at', { ascending: false })
  if (error) throw error
  // as unknown: Supabase cannot infer the joined shape when multiple FKs exist on profiles
  return data as unknown as EnrolledDeviceWithProfile[]
}

export async function approveDevice(deviceId: string, approvedBy: string): Promise<EnrolledDevice> {
  const { data, error } = await supabase
    .from('enrolled_devices')
    .update({
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      is_active: true,
    })
    .eq('id', deviceId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deactivateDevice(deviceId: string): Promise<EnrolledDevice> {
  const { data, error } = await supabase
    .from('enrolled_devices')
    .update({ is_active: false })
    .eq('id', deviceId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Attendance exceptions ─────────────────────────────────────────────────────

export interface FetchExceptionsFilters {
  profileId?: string
  date?: string
  status?: string
  type?: string
}

export async function fetchAttendanceExceptions(
  filters: FetchExceptionsFilters = {}
): Promise<AttendanceException[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  let q = supabase.from('attendance_exceptions').select('*').order('created_at', { ascending: false })
  // Always scope to the current user — this is the "my exceptions" function
  q = q.eq('profile_id', filters.profileId ?? user.id)
  if (filters.date)   q = q.eq('date', filters.date)
  if (filters.status) q = q.eq('status', filters.status)
  if (filters.type)   q = q.eq('exception_type', filters.type)
  const { data, error } = await q
  if (error) throw error
  return data
}

export interface RequestExceptionPayload {
  exception_type: 'late_arrival' | 'early_departure' | 'out_of_office'
  date: string
  requested_time: string
  return_time?: string
  reason: string
}

export async function requestException(payload: RequestExceptionPayload): Promise<AttendanceException> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('attendance_exceptions')
    .insert({
      profile_id: user.id,
      exception_type: payload.exception_type,
      date: payload.date,
      requested_time: payload.requested_time,
      return_time: payload.return_time ?? null,
      reason: payload.reason,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

// Employee edits their own exception request while it's still pending (RLS-gated).
export async function updateException(
  id: string,
  payload: RequestExceptionPayload,
): Promise<AttendanceException> {
  const { data, error } = await supabase
    .from('attendance_exceptions')
    .update({
      exception_type: payload.exception_type,
      date: payload.date,
      requested_time: payload.requested_time,
      return_time: payload.return_time ?? null,
      reason: payload.reason,
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function reviewException(
  id: string,
  status: 'approved' | 'rejected',
  note?: string,
): Promise<AttendanceException> {
  const { data, error } = await supabase
    .from('attendance_exceptions')
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      review_note: note ?? null,
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// Admin-only hard delete (RLS: admin/super_admin). Note: an OOO exception that already
// recorded excluded_minutes on attendance is NOT auto-reversed — the request row is removed.
export async function deleteException(id: string): Promise<void> {
  const { error } = await supabase.from('attendance_exceptions').delete().eq('id', id)
  if (error) throw error
}

// Out-of-office two-session tracking (calls Edge Function so the 10-minute grace and
// the worked-hours exclusion are enforced server-side). The function derives the
// employee's approved OOO for today from the auth context — no id needed.
export interface OooResult {
  actual_departure?: string
  actual_return?: string
  excluded_minutes?: number
}

async function invokeOoo(action: 'depart' | 'return'): Promise<OooResult> {
  const { data, error } = await supabase.functions.invoke<OooResult>('attendance-ooo', {
    body: { action },
  })
  if (error) {
    const ctx = (error as { context?: Response }).context
    if (ctx) {
      let body: { error?: string; code?: string } | null = null
      try { body = await ctx.json() } catch { /* non-JSON body */ }
      if (body?.code) {
        const enriched = new Error(body.error ?? error.message) as Error & { code: string }
        enriched.code = body.code
        throw enriched
      }
    }
    throw error
  }
  if (!data) throw new Error('No response from attendance-ooo')
  return data
}

export function oooDepart(): Promise<OooResult> {
  return invokeOoo('depart')
}

export function oooReturn(): Promise<OooResult> {
  return invokeOoo('return')
}

// ── Monthly attendance report (admin/HR) ─────────────────────────────────────

export interface MonthlyReportRow extends AttendanceWithProfile {
  profiles: { name: string; avatar_url: string | null; role: string } | null
}

export async function fetchMonthlyAttendance(
  year: number,
  month: number, // 1-indexed
): Promise<MonthlyReportRow[]> {
  const pad = (n: number) => String(n).padStart(2, '0')
  const from = `${year}-${pad(month)}-01`
  // Last day of the month
  const last = new Date(year, month, 0).getDate()
  const to   = `${year}-${pad(month)}-${pad(last)}`

  const { data, error } = await supabase
    .from('attendance')
    .select('*, profiles!attendance_profile_id_fkey(name, avatar_url, role)')
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: true })
  if (error) throw error
  return data as unknown as MonthlyReportRow[]
}

// ── Admin: exceptions with profile join ───────────────────────────────────────

export interface AttendanceExceptionWithProfile extends AttendanceException {
  profiles: { name: string; avatar_url: string | null } | null
}

export async function fetchAllAttendanceExceptions(
  filters: FetchExceptionsFilters = {}
): Promise<AttendanceExceptionWithProfile[]> {
  let q = supabase
    .from('attendance_exceptions')
    .select('*, profiles!attendance_exceptions_profile_id_fkey(name, avatar_url)')
    .order('created_at', { ascending: false })
  if (filters.profileId) q = q.eq('profile_id', filters.profileId)
  if (filters.date)      q = q.eq('date', filters.date)
  if (filters.status)    q = q.eq('status', filters.status)
  if (filters.type)      q = q.eq('exception_type', filters.type)
  const { data, error } = await q
  if (error) throw error
  // as unknown: Supabase cannot infer the joined shape when multiple FKs exist on profiles
  return data as unknown as AttendanceExceptionWithProfile[]
}

// ── Holidays ──────────────────────────────────────────────────────────────────

export async function fetchHolidays(year?: number): Promise<HolidayRow[]> {
  let q = supabase.from('holidays').select('*').order('date', { ascending: true })
  if (year) {
    q = q.gte('date', `${year}-01-01`).lte('date', `${year}-12-31`)
  }
  const { data, error } = await q
  if (error) throw error
  return data
}

export interface CreateHolidayPayload {
  date: string
  name: string
  type: 'public_holiday' | 'company_off' | 'optional'
}

export async function createHoliday(
  payload: CreateHolidayPayload,
  createdBy: string,
): Promise<HolidayRow> {
  const { data, error } = await supabase
    .from('holidays')
    .insert({ ...payload, created_by: createdBy })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function createHolidayRange(
  startDate: string,
  endDate: string,
  name: string,
  type: CreateHolidayPayload['type'],
  createdBy: string,
): Promise<HolidayRow[]> {
  const dates: string[] = []
  const cur = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate   + 'T00:00:00')
  while (cur <= end) {
    const y = cur.getFullYear()
    const m = String(cur.getMonth() + 1).padStart(2, '0')
    const d = String(cur.getDate()).padStart(2, '0')
    dates.push(`${y}-${m}-${d}`)
    cur.setDate(cur.getDate() + 1)
  }
  const rows = dates.map((date) => ({ date, name, type, created_by: createdBy }))
  const { data, error } = await supabase.from('holidays').insert(rows).select()
  if (error) throw error
  return data
}

export async function deleteHoliday(id: string): Promise<void> {
  const { error } = await supabase.from('holidays').delete().eq('id', id)
  if (error) throw error
}

// ── Working Saturdays ─────────────────────────────────────────────────────────

export type WorkingSaturday = Tables<'working_saturdays'>

export async function fetchWorkingSaturdays(year?: number): Promise<WorkingSaturday[]> {
  let q = supabase.from('working_saturdays').select('*').order('date', { ascending: true })
  if (year) q = q.gte('date', `${year}-01-01`).lte('date', `${year}-12-31`)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function addWorkingSaturday(
  date: string,
  note: string | null,
  createdBy: string,
): Promise<WorkingSaturday> {
  const { data, error } = await supabase
    .from('working_saturdays')
    .insert({ date, note, created_by: createdBy })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function removeWorkingSaturday(id: string): Promise<void> {
  const { error } = await supabase.from('working_saturdays').delete().eq('id', id)
  if (error) throw error
}

// ── Company WFH days (whole-company work-from-home) ───────────────────────────
// Declaring a day marks every eligible employee's attendance as WFH for that
// date via the trg_company_wfh_apply trigger; removing it reverts those rows.

export type CompanyWfhDay = Tables<'company_wfh_days'>

export async function fetchCompanyWfhDays(year?: number): Promise<CompanyWfhDay[]> {
  let q = supabase.from('company_wfh_days').select('*').order('date', { ascending: true })
  if (year) q = q.gte('date', `${year}-01-01`).lte('date', `${year}-12-31`)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function addCompanyWfhDay(
  date: string,
  reason: string,
  createdBy: string,
): Promise<CompanyWfhDay> {
  const { data, error } = await supabase
    .from('company_wfh_days')
    .insert({ date, reason, created_by: createdBy })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function removeCompanyWfhDay(id: string): Promise<void> {
  const { error } = await supabase.from('company_wfh_days').delete().eq('id', id)
  if (error) throw error
}

// ── Overtime requests ─────────────────────────────────────────────────────────

export interface OvertimeRequestWithProfile extends OvertimeRequest {
  profiles: { name: string; avatar_url: string | null } | null
}

export interface SubmitOvertimePayload {
  date: string
  start_time: string
  end_time: string
  hours: number
  reason: string
}

export async function submitOvertimeRequest(
  payload: SubmitOvertimePayload,
): Promise<OvertimeRequest> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('overtime_requests')
    .insert({ ...payload, profile_id: user.id })
    .select()
    .single()
  if (error) throw error
  return data
}

// Employee edits their own overtime request while it's still pending (RLS-gated).
export async function updateOvertimeRequest(
  id: string,
  payload: SubmitOvertimePayload,
): Promise<OvertimeRequest> {
  const { data, error } = await supabase
    .from('overtime_requests')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function fetchMyOvertimeRequests(): Promise<OvertimeRequest[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from('overtime_requests')
    .select('*')
    .eq('profile_id', user.id)
    .order('date', { ascending: false })
  if (error) throw error
  return data
}

export async function fetchAllOvertimeRequests(
  status?: string,
): Promise<OvertimeRequestWithProfile[]> {
  let q = supabase
    .from('overtime_requests')
    .select('*, profiles!overtime_requests_profile_id_fkey(name, avatar_url)')
    .order('date', { ascending: false })
  if (status) q = q.eq('status', status)
  const { data, error } = await q
  if (error) throw error
  return data as unknown as OvertimeRequestWithProfile[]
}

// Overtime for one member (member profile page). RLS gates it: self, governors, and
// the person's team lead (shares_team_with) — unauthorized viewers get an empty array.
export async function fetchOvertimeByProfile(profileId: string): Promise<OvertimeRequest[]> {
  const { data, error } = await supabase
    .from('overtime_requests')
    .select('*')
    .eq('profile_id', profileId)
    .order('date', { ascending: false })
  if (error) throw error
  return data
}

// Approved overtime for a whole month (all employees) — folded into the attendance report.
export async function fetchMonthlyOvertime(year: number, month: number): Promise<OvertimeRequest[]> {
  const pad = (n: number) => String(n).padStart(2, '0')
  const from = `${year}-${pad(month)}-01`
  const last = new Date(year, month, 0).getDate()
  const to   = `${year}-${pad(month)}-${pad(last)}`
  const { data, error } = await supabase
    .from('overtime_requests')
    .select('*')
    .eq('status', 'approved')
    .gte('date', from)
    .lte('date', to)
  if (error) throw error
  return data
}

export async function reviewOvertimeRequest(
  id: string,
  status: 'approved' | 'rejected',
  reviewedBy: string,
  reviewNote?: string,
): Promise<OvertimeRequest> {
  const { data, error } = await supabase
    .from('overtime_requests')
    .update({
      status,
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      review_note: reviewNote ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// Admin-only hard delete (RLS: admin/super_admin). Overtime aggregates at read time,
// so removing the row fully removes its effect.
export async function deleteOvertimeRequest(id: string): Promise<void> {
  const { error } = await supabase.from('overtime_requests').delete().eq('id', id)
  if (error) throw error
}

// ── WFH requests ──────────────────────────────────────────────────────────────

export type WfhRequest = Tables<'wfh_requests'>

export interface WfhRequestWithProfile extends WfhRequest {
  profiles: { name: string; avatar_url: string | null } | null
}

export async function submitWfhRequest(payload: { date: string; reason: string }): Promise<WfhRequest> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('wfh_requests')
    .insert({ profile_id: user.id, date: payload.date, reason: payload.reason })
    .select()
    .single()
  if (error) throw error
  return data
}

// Employee edits their own WFH request while it's still pending (RLS-gated).
export async function updateWfhRequest(
  id: string,
  payload: { date: string; reason: string },
): Promise<WfhRequest> {
  const { data, error } = await supabase
    .from('wfh_requests')
    .update({ date: payload.date, reason: payload.reason, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function fetchMyWfhRequests(): Promise<WfhRequest[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from('wfh_requests')
    .select('*')
    .eq('profile_id', user.id)
    .order('date', { ascending: false })
  if (error) throw error
  return data
}

export async function fetchAllWfhRequests(status?: string): Promise<WfhRequestWithProfile[]> {
  let q = supabase
    .from('wfh_requests')
    .select('*, profiles!wfh_requests_profile_id_fkey(name, avatar_url)')
    .order('created_at', { ascending: false })
  if (status) q = q.eq('status', status)
  const { data, error } = await q
  if (error) throw error
  // as unknown: Supabase cannot infer the joined shape when multiple FKs exist on profiles
  return data as unknown as WfhRequestWithProfile[]
}

export async function reviewWfhRequest(
  id: string,
  status: 'approved' | 'rejected',
  reviewedBy: string,
  reviewNote?: string,
): Promise<WfhRequest> {
  const { data, error } = await supabase
    .from('wfh_requests')
    .update({
      status,
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      review_note: reviewNote ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// Admin-only hard delete (RLS: admin/super_admin). The trg_wfh_sync trigger now fires on
// DELETE too, so an approved WFH's synced attendance row is removed automatically.
export async function deleteWfhRequest(id: string): Promise<void> {
  const { error } = await supabase.from('wfh_requests').delete().eq('id', id)
  if (error) throw error
}

export async function grantWfh(
  profileId: string,
  date: string,
  reason: string,
  grantedBy: string,
): Promise<WfhRequest> {
  const { data, error } = await supabase
    .from('wfh_requests')
    .insert({
      profile_id: profileId,
      date,
      reason,
      status: 'approved',
      granted_directly: true,
      reviewed_by: grantedBy,
      reviewed_at: new Date().toISOString(),
    })
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Leave types (admin-defined, with yearly quota) ────────────────────────────

export type LeaveType = Tables<'leave_types'>

export async function fetchLeaveTypes(activeOnly = false): Promise<LeaveType[]> {
  let q = supabase.from('leave_types').select('*').order('name', { ascending: true })
  if (activeOnly) q = q.eq('is_active', true)
  const { data, error } = await q
  if (error) throw error
  return data
}

export interface LeaveTypePayload {
  name: string
  days_allowed: number
  color?: string
  is_active?: boolean
}

export async function createLeaveType(payload: LeaveTypePayload, createdBy: string): Promise<LeaveType> {
  const { data, error } = await supabase
    .from('leave_types')
    .insert({ ...payload, created_by: createdBy })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateLeaveType(
  id: string,
  payload: TablesUpdate<'leave_types'>,
): Promise<LeaveType> {
  const { data, error } = await supabase
    .from('leave_types')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteLeaveType(id: string): Promise<void> {
  const { error } = await supabase.from('leave_types').delete().eq('id', id)
  if (error) throw error
}

// ── Leave requests ────────────────────────────────────────────────────────────

export type LeaveRequest = Tables<'leave_requests'>

export interface LeaveRequestWithType extends LeaveRequest {
  leave_types: { name: string; color: string } | null
}

export interface LeaveRequestWithProfile extends LeaveRequest {
  profiles: { name: string; avatar_url: string | null } | null
  leave_types: { name: string; color: string } | null
  // Set when HR/an admin entered the leave on the employee's behalf; null for self-submitted.
  entered_by_profile: { name: string } | null
}

export type LeaveDayPart = 'full' | 'first_half' | 'second_half'

export interface SubmitLeavePayload {
  leave_type_id: string
  start_date: string
  end_date: string
  reason: string
  /** Defaults to 'full'. Half-day requests must be a single day and deduct 0.5. */
  day_part?: LeaveDayPart
}

export async function submitLeaveRequest(payload: SubmitLeavePayload): Promise<LeaveRequest> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('leave_requests')
    .insert({ ...payload, profile_id: user.id })
    .select()
    .single()
  if (error) throw error
  return data
}

export interface EnterLeavePayload extends SubmitLeavePayload {
  /** The employee the leave is for. */
  profile_id: string
}

// HR/admin logs leave on an employee's behalf (e.g. backdated "old" leave), with
// entered_by = the actor. Admins/super_admins apply it directly (inserted 'approved'
// → trg_leave_sync writes attendance immediately); HR always creates it 'pending' for
// an admin to approve. RLS enforces both the status gate and the approval segregation.
export async function enterLeaveForEmployee(payload: EnterLeavePayload): Promise<LeaveRequest> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { profile_id, ...rest } = payload

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const appliesDirectly = me?.role === 'admin' || me?.role === 'super_admin'

  const { data, error } = await supabase
    .from('leave_requests')
    .insert(
      appliesDirectly
        ? { ...rest, profile_id, entered_by: user.id, status: 'approved', reviewed_by: user.id, reviewed_at: new Date().toISOString() }
        : { ...rest, profile_id, entered_by: user.id },
    )
    .select()
    .single()
  if (error) throw error
  return data
}

// Employee edits their own leave request while it's still pending (RLS-gated).
// `days` is recomputed by the trg_leave_set_days BEFORE-UPDATE trigger.
export async function updateLeaveRequest(
  id: string,
  payload: SubmitLeavePayload,
): Promise<LeaveRequest> {
  const { data, error } = await supabase
    .from('leave_requests')
    .update({
      leave_type_id: payload.leave_type_id,
      start_date: payload.start_date,
      end_date: payload.end_date,
      reason: payload.reason,
      day_part: payload.day_part ?? 'full',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function fetchMyLeaveRequests(): Promise<LeaveRequestWithType[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from('leave_requests')
    .select('*, leave_types(name, color)')
    .eq('profile_id', user.id)
    .order('start_date', { ascending: false })
  if (error) throw error
  return data as unknown as LeaveRequestWithType[]
}

// Leave for one member (member profile page). RLS gates who sees it: the person,
// governors (super_admin/admin/hr/pm), and the person's team lead (shares_team_with).
// Unauthorized viewers get an empty array.
export async function fetchLeaveByProfile(profileId: string): Promise<LeaveRequestWithType[]> {
  const { data, error } = await supabase
    .from('leave_requests')
    .select('*, leave_types(name, color)')
    .eq('profile_id', profileId)
    .order('start_date', { ascending: false })
  if (error) throw error
  return data as unknown as LeaveRequestWithType[]
}

// One member's attendance rows for a calendar month (member profile page).
// RLS gates it: self, governors, and the person's team lead (shares_team_with).
export async function fetchAttendanceByProfileMonth(
  profileId: string,
  year: number,
  month: number, // 1-indexed
): Promise<AttendanceRow[]> {
  const pad = (n: number) => String(n).padStart(2, '0')
  const from = `${year}-${pad(month)}-01`
  const last = new Date(year, month, 0).getDate()
  const to = `${year}-${pad(month)}-${pad(last)}`
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('profile_id', profileId)
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: false })
  if (error) throw error
  return data
}

// WFH for one member — same RLS gating as fetchLeaveByProfile.
export async function fetchWfhByProfile(profileId: string): Promise<WfhRequest[]> {
  const { data, error } = await supabase
    .from('wfh_requests')
    .select('*')
    .eq('profile_id', profileId)
    .order('date', { ascending: false })
  if (error) throw error
  return data
}

export async function fetchAllLeaveRequests(status?: string): Promise<LeaveRequestWithProfile[]> {
  let q = supabase
    .from('leave_requests')
    .select('*, profiles!leave_requests_profile_id_fkey(name, avatar_url), leave_types(name, color), entered_by_profile:profiles!leave_requests_entered_by_fkey(name)')
    .order('created_at', { ascending: false })
  if (status) q = q.eq('status', status)
  const { data, error } = await q
  if (error) throw error
  // as unknown: Supabase cannot infer the joined shape when multiple FKs exist on profiles
  return data as unknown as LeaveRequestWithProfile[]
}

export async function reviewLeaveRequest(
  id: string,
  status: 'approved' | 'rejected',
  reviewedBy: string,
  reviewNote?: string,
): Promise<LeaveRequest> {
  const { data, error } = await supabase
    .from('leave_requests')
    .update({
      status,
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      review_note: reviewNote ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// Admin-only hard delete (RLS: admin/super_admin). The trg_leave_sync trigger now fires on
// DELETE too, so an approved leave's synced attendance rows are removed automatically.
export async function deleteLeaveRequest(id: string): Promise<void> {
  const { error } = await supabase.from('leave_requests').delete().eq('id', id)
  if (error) throw error
}

export interface LeaveBalance {
  type: LeaveType
  used: number
  remaining: number
}

// Remaining = type allowance − approved leave days taken this calendar year.
export async function fetchMyLeaveBalances(): Promise<LeaveBalance[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const year = new Date().getFullYear()

  const [{ data: types, error: typeErr }, { data: requests, error: reqErr }] = await Promise.all([
    supabase.from('leave_types').select('*').eq('is_active', true).order('name'),
    supabase
      .from('leave_requests')
      .select('leave_type_id, days, status, start_date')
      .eq('profile_id', user.id)
      .eq('status', 'approved')
      .gte('start_date', `${year}-01-01`)
      .lte('start_date', `${year}-12-31`),
  ])
  if (typeErr) throw typeErr
  if (reqErr) throw reqErr

  return (types ?? []).map((type) => {
    const used = (requests ?? [])
      .filter((r) => r.leave_type_id === type.id)
      .reduce((sum, r) => sum + (r.days ?? 0), 0)
    return { type, used, remaining: Math.max(0, type.days_allowed - used) }
  })
}

// Leave balance for one member (member profile page). Same shape as
// fetchMyLeaveBalances but for an arbitrary profile — RLS on leave_requests scopes
// the "used" tally to what the viewer may see (empty → full allowance shown).
export async function fetchLeaveBalancesByProfile(profileId: string): Promise<LeaveBalance[]> {
  const year = new Date().getFullYear()
  const [{ data: types, error: typeErr }, { data: requests, error: reqErr }] = await Promise.all([
    supabase.from('leave_types').select('*').eq('is_active', true).order('name'),
    supabase
      .from('leave_requests')
      .select('leave_type_id, days, status, start_date')
      .eq('profile_id', profileId)
      .eq('status', 'approved')
      .gte('start_date', `${year}-01-01`)
      .lte('start_date', `${year}-12-31`),
  ])
  if (typeErr) throw typeErr
  if (reqErr) throw reqErr

  return (types ?? []).map((type) => {
    const used = (requests ?? [])
      .filter((r) => r.leave_type_id === type.id)
      .reduce((sum, r) => sum + (r.days ?? 0), 0)
    return { type, used, remaining: Math.max(0, type.days_allowed - used) }
  })
}

// ── Half-day leave dates for a month (drives report half-credit) ──────────────

export interface HalfDayLeaveDate {
  profileId: string
  date: string // YYYY-MM-DD
}

// Approved half-day (non-'full') leave is always a single day, so start_date IS
// the date. The report uses this to halve a day's expected hours even when the
// employee checked in before approval (so the attendance row stayed 'present').