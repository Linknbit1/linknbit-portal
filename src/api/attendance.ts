import { supabase } from '../lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '../types/database'

export type AttendanceRow = Tables<'attendance'>
export type AttendanceSettings = Tables<'attendance_settings'>
export type EnrolledDevice = Tables<'enrolled_devices'>

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
  if (error) throw error
  if (!data) throw new Error('No response from attendance-checkin')
  return data
}

// ── Employee self check-out ───────────────────────────────────────────────────

export async function checkOut(attendanceId: string): Promise<AttendanceRow> {
  const { data, error } = await supabase
    .from('attendance')
    .update({ check_out: new Date().toISOString() })
    .eq('id', attendanceId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ── My attendance history (last 30 days for current user) ────────────────────

export async function fetchMyAttendance(days = 30): Promise<AttendanceRow[]> {
  const since = new Date()
  since.setDate(since.getDate() - days)
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .gte('date', since.toISOString().split('T')[0])
    .order('date', { ascending: false })
  if (error) throw error
  return data
}

// ── Today's own record ───────────────────────────────────────────────────────

export async function fetchMyTodayAttendance(): Promise<AttendanceRow | null> {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('date', today)
    .maybeSingle()
  if (error) throw error
  return data
}

// ── All attendance (admin/HR — filtered by date) ─────────────────────────────

export async function fetchAllAttendance(date: string): Promise<AttendanceWithProfile[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('*, profiles(name, avatar_url)')
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
    .select('*, profiles(name)')
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
