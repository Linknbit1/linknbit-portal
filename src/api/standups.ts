import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'

export type StandupRow = Tables<'standups'>
export type StandupEntryRow = Tables<'standup_entries'>
export type StandupRoleSettingRow = Tables<'standup_role_settings'>
export type StandupParticipantRow = Tables<'standup_participants'>

/** Per-person answer to "must submit a standup"; `inherit` = follow the role default. */
export type ParticipationMode = 'inherit' | 'required' | 'excluded'

/** Server-authoritative submission window (never trust the client clock). */
export interface StandupWindow {
  server_now: string
  standup_date: string
  opens_at: string
  closes_at: string
  /** On-time cutoff — submit by this to earn 5 XP; after it's late (no points). */
  on_time_until: string
  is_open: boolean
  is_working_day: boolean
  is_required: boolean
  already_done: boolean
  /** Today's standup, once submitted — the row `update_standup` corrects. */
  my_standup_id: string | null
  /** Corrections stay open for as long as the window itself is. */
  can_edit: boolean
  work_end_time: string
  timezone: string
}

export interface StandupEntryInput {
  project_id: string
  task_id?: string | null
  work_done: string
  minutes_spent: number
  blocker?: string | null
}

export interface StandupEntryDetail extends StandupEntryRow {
  project: { id: string; name: string; service_type: string } | null
  task: { id: string; title: string } | null
}

export interface StandupDetail extends StandupRow {
  profile: { id: string; name: string; avatar_url: string | null } | null
  entries: StandupEntryDetail[]
}

export interface StandupRosterRow {
  profile_id: string
  name: string
  avatar_url: string | null
  role: string
  standup_id: string | null
  submitted_at: string | null
  is_late: boolean | null
  on_leave: boolean
}

export async function fetchStandupWindow(): Promise<StandupWindow> {
  const { data, error } = await supabase.rpc('standup_window')
  if (error) throw error
  const row = data?.[0]
  if (!row) throw new Error('Could not read the standup window')
  return row
}

/** Wire shape for the RPCs — nulls travel as empty strings through jsonb. */
const toRpcEntries = (entries: StandupEntryInput[]) =>
  entries.map((e) => ({
    project_id: e.project_id,
    task_id: e.task_id ?? '',
    work_done: e.work_done,
    minutes_spent: e.minutes_spent,
    blocker: e.blocker ?? '',
  }))

/** Submits today's standup. The RPC enforces the time window server-side. */
export async function submitStandup(entries: StandupEntryInput[], notes?: string): Promise<string> {
  const { data, error } = await supabase.rpc('submit_standup', {
    p_entries: toRpcEntries(entries),
    p_notes: notes ?? undefined,
  })
  if (error) throw error
  return data
}

/**
 * Corrects an already-submitted standup. Entries are replaced wholesale. The RPC
 * refuses anyone but the owner and locks once the window closes; `is_late` and any
 * XP already earned are left alone.
 */
export async function updateStandup(
  standupId: string, entries: StandupEntryInput[], notes?: string,
): Promise<string> {
  const { data, error } = await supabase.rpc('update_standup', {
    p_standup_id: standupId,
    p_entries: toRpcEntries(entries),
    p_notes: notes ?? undefined,
  })
  if (error) throw error
  return data
}

const STANDUP_SELECT =
  '*, profile:profiles(id,name,avatar_url), entries:standup_entries(*, project:projects(id,name,service_type), task:tasks(id,title))'

/** Standups submitted on a date (management sees all; staff see their own). */
export async function fetchStandupsByDate(date: string): Promise<StandupDetail[]> {
  const { data, error } = await supabase
    .from('standups')
    .select(STANDUP_SELECT)
    .eq('standup_date', date)
    .order('submitted_at', { ascending: true })
  if (error) throw error
  return data
}

/** The signed-in user's own recent standups. */
export async function fetchMyStandups(profileId: string, limit = 14): Promise<StandupDetail[]> {
  const { data, error } = await supabase
    .from('standups')
    .select(STANDUP_SELECT)
    .eq('profile_id', profileId)
    .order('standup_date', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

/** One day of the signed-in user's own standup, for prefilling the edit form. */
export async function fetchMyStandup(profileId: string, date: string): Promise<StandupDetail | null> {
  const { data, error } = await supabase
    .from('standups')
    .select(STANDUP_SELECT)
    .eq('profile_id', profileId)
    .eq('standup_date', date)
    .maybeSingle()
  if (error) throw error
  return data
}

/** Who was expected to submit on a date + whether they did (team-scoped by the RPC). */
export async function fetchStandupRoster(date: string): Promise<StandupRosterRow[]> {
  const { data, error } = await supabase.rpc('standup_roster', { p_date: date })
  if (error) throw error
  return data ?? []
}

/* ── Participation settings ─────────────────────────────────────────────────── */

export async function fetchStandupRoleSettings(): Promise<StandupRoleSettingRow[]> {
  const { data, error } = await supabase.from('standup_role_settings').select('*').order('role')
  if (error) throw error
  return data
}

export async function fetchStandupParticipants(): Promise<StandupParticipantRow[]> {
  const { data, error } = await supabase.from('standup_participants').select('*')
  if (error) throw error
  return data
}

/** Turns a role's default on or off. Gated on can_manage_standups inside the RPC. */
export async function setStandupRoleRequirement(role: string, required: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_standup_role_requirement', { p_role: role, p_required: required })
  if (error) throw error
}

/** Sets one person's override; `inherit` removes it. */
export async function setStandupParticipation(
  profileId: string, mode: ParticipationMode, note?: string,
): Promise<void> {
  const { error } = await supabase.rpc('set_standup_participation', {
    p_profile: profileId,
    p_mode: mode,
    p_note: note ?? undefined,
  })
  if (error) throw error
}
