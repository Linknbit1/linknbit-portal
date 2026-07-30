import { supabase } from '../lib/supabase'
import type { Json, Tables } from '../types/database'

export type BiometricTerminal = Tables<'biometric_terminals'>
export type BiometricPunch = Tables<'biometric_punches'>

/**
 * secret_hash is deliberately absent: every read below uses an explicit column
 * list that omits it, so the hash never reaches the browser.
 */
export type TerminalPublic = Omit<BiometricTerminal, 'secret_hash'>

export interface PunchWithProfile extends BiometricPunch {
  profiles: { name: string; avatar_url: string | null } | null
}

/** One enrolled user as reported by the device. */
export interface RosterEntry {
  zk_user_id: string
  name: string
  privilege: number
}

export interface EnrollmentLink {
  id: string
  name: string
  avatar_url: string | null
  zk_user_id: string | null
}

export interface LinkEnrollmentResult {
  adopted_punches: number
  affected_dates: string[]
}

/**
 * device_roster is stored as jsonb, so it arrives as unstructured Json. Narrow it
 * with runtime checks rather than an assertion — the terminal is an external
 * system and a firmware quirk shouldn't crash the linking screen.
 */
export function parseRoster(value: Json): RosterEntry[] {
  if (!Array.isArray(value)) return []
  const out: RosterEntry[] = []
  for (const item of value) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) continue
    const zk = item.zk_user_id
    if (typeof zk !== 'string' || zk.length === 0) continue
    out.push({
      zk_user_id: zk,
      name: typeof item.name === 'string' ? item.name : '',
      privilege: typeof item.privilege === 'number' ? item.privilege : 0,
    })
  }
  return out
}

// ── Terminals ─────────────────────────────────────────────────────────────────

export async function fetchTerminals(): Promise<TerminalPublic[]> {
  // The column list must be an inline literal: supabase-js infers the row type
  // from the string itself, and hoisting it to a const collapses the result to
  // GenericStringError[]. secret_hash is omitted here — that omission is the only
  // thing keeping the hash out of the browser, so don't switch this to '*'.
  const { data, error } = await supabase
    .from('biometric_terminals')
    .select('id,name,location,device_ip,serial_number,firmware,last_heartbeat_at,last_poll_at,device_log_count,clock_skew_sec,is_active,device_roster,roster_synced_at,created_at,updated_at')
    .order('name')

  if (error) throw error
  return data
}

export interface TerminalGate {
  /** True when this member should use the terminal AND a relay is actually live. */
  must_use_terminal: boolean
  terminal_name: string | null
  terminal_location: string | null
  last_heartbeat_at: string | null
}

const NO_GATE: TerminalGate = {
  must_use_terminal: false,
  terminal_name: null,
  terminal_location: null,
  last_heartbeat_at: null,
}

/**
 * Whether the current member must check in at a terminal right now.
 *
 * Decided server-side by the same rule attendance-checkin enforces (job-type
 * policy + terminal_stale_min), so the button the card shows always matches what
 * the edge function will accept. The underlying table is admin-only and holds
 * secret_hash, so members reach it only through this RPC.
 */
export async function fetchMyTerminalGate(): Promise<TerminalGate> {
  const { data, error } = await supabase.rpc('get_my_terminal_gate')
  if (error) throw error
  return data?.[0] ?? NO_GATE
}

export interface CreateTerminalPayload {
  name: string
  location?: string | null
  deviceIp?: string | null
  /** Plaintext; hashed server-side by the RPC and never stored client-side. */
  secret: string
}

export async function createTerminal(payload: CreateTerminalPayload): Promise<string> {
  const { data, error } = await supabase.rpc('create_biometric_terminal', {
    p_name: payload.name,
    // These SQL args are DEFAULT NULL, so they generate as optional — undefined,
    // not null, is what omits them.
    p_location: payload.location ?? undefined,
    p_device_ip: payload.deviceIp ?? undefined,
    p_secret: payload.secret,
  })

  if (error) throw error
  return data
}

export async function rotateTerminalSecret(id: string, secret: string): Promise<void> {
  const { error } = await supabase.rpc('rotate_biometric_terminal_secret', {
    p_id: id,
    p_secret: secret,
  })
  if (error) throw error
}

export async function setTerminalActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('biometric_terminals')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

// ── Punches ───────────────────────────────────────────────────────────────────

export async function fetchUnmatchedPunches(limit = 200): Promise<BiometricPunch[]> {
  const { data, error } = await supabase
    .from('biometric_punches')
    .select('*')
    .is('profile_id', null)
    .order('punched_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

export async function fetchPunchesByProfileDate(
  profileId: string,
  date: string,
): Promise<BiometricPunch[]> {
  const { data, error } = await supabase
    .from('biometric_punches')
    .select('*')
    .eq('profile_id', profileId)
    .eq('local_date', date)
    .order('punched_at')

  if (error) throw error
  return data
}

// ── Enroll-number links ───────────────────────────────────────────────────────

export async function fetchEnrollmentLinks(): Promise<EnrollmentLink[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,name,avatar_url,zk_user_id')
    .eq('is_active', true)
    .order('name')

  if (error) throw error
  return data
}

export async function linkEnrollment(
  profileId: string,
  zkUserId: string,
): Promise<LinkEnrollmentResult> {
  const { data, error } = await supabase.rpc('link_zk_enrollment', {
    p_profile_id: profileId,
    p_zk_user_id: zkUserId,
  })

  if (error) throw error
  const row = data?.[0]
  return {
    adopted_punches: row?.adopted_punches ?? 0,
    affected_dates: row?.affected_dates ?? [],
  }
}

export async function unlinkEnrollment(profileId: string): Promise<void> {
  const { error } = await supabase.rpc('unlink_zk_enrollment', { p_profile_id: profileId })
  if (error) throw error
}
