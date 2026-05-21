import { supabase } from '../lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '../types/database'

export type AttendanceRow = Tables<'attendance'>
export type AttendanceSettings = Tables<'attendance_settings'>
export type EnrolledDevice = Tables<'enrolled_devices'>
export type AttendanceException = Tables<'attendance_exceptions'>

export interface CheckInResult {
  status: 'present' | 'late'
  check_in: string
  device_flagged: boolean
}

export interface AttendanceWithProfile extends AttendanceRow {
  profiles: { name: string; avatar_url: string | null } | null
}

export interface EnrolledDeviceWithProfile extends EnrolledDevice {
  profiles: { name: string } | null
}

export interface MarkAttendancePayload {
  profileId: string
  date: string
  status: string
  note?: string
}

// ── Employee self check-in (calls Edge Function) ──────────────────────────────

export async function checkIn(payload: {
  deviceFingerprint: string
  deviceName: string
}): Promise<CheckInResult> {
  const { data, error } = await supabase.functions.invoke<CheckInResult>('attendance-checkin', {
    body: {
      device_fingerprint: payload.deviceFingerprint,
      device_name: payload.deviceName,
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

// ── Employee self check-out (via Edge Function for time validation) ───────────

export async function checkOut(attendanceId: string): Promise<AttendanceRow> {
  const { data, error } = await supabase.functions.invoke<{ check_out: string; date: string }>(
    'attendance-checkout',
    { body: { attendance_id: attendanceId } },
  )
  if (error) {
    const ctx = (error as { context?: Response }).context
    if (ctx) {
      let body: { error?: string; code?: string } | null = null
      try { body = await ctx.json() } catch { /* non-JSON */ }
      if (body?.code) {
        const enriched = new Error(body.error ?? error.message) as Error & { code: string }
        enriched.code = body.code
        throw enriched
      }
    }
    throw error
  }
  if (!data) throw new Error('No response from attendance-checkout')
  // Re-fetch the full row so callers get the typed AttendanceRow shape
  const { data: row, error: fetchErr } = await supabase
    .from('attendance')
    .select('*')
    .eq('id', attendanceId)
    .single()
  if (fetchErr) throw fetchErr
  return row
}

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

// ── Today's own record ───────────────────────────────────────────────────────

export async function fetchMyTodayAttendance(): Promise<AttendanceRow | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const today = new Date().toISOString().split('T')[0]
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
  const { data, error } = await supabase
    .from('attendance')
    .upsert(insert, { onConflict: 'profile_id,date' })
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Admin checkout on behalf of employee ─────────────────────────────────────

export async function adminCheckOut(attendanceId: string, checkOutTime?: string): Promise<AttendanceRow> {
  const payload: TablesUpdate<'attendance'> = {
    check_out: checkOutTime ?? new Date().toISOString(),
  }
  const { data, error } = await supabase
    .from('attendance')
    .update(payload)
    .eq('id', attendanceId)
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

export async function fetchEnrolledDevices(): Promise<EnrolledDeviceWithProfile[]> {
  const { data, error } = await supabase
    .from('enrolled_devices')
    .select('*, profiles!enrolled_devices_profile_id_fkey(name)')
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

export async function logOooDeparture(id: string): Promise<AttendanceException> {
  const { data, error } = await supabase
    .from('attendance_exceptions')
    .update({ actual_departure: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function logOooReturn(id: string): Promise<AttendanceException> {
  const { data, error } = await supabase
    .from('attendance_exceptions')
    .update({ actual_return: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
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
