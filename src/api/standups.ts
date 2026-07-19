import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'

export type StandupRow = Tables<'standups'>
export type StandupEntryRow = Tables<'standup_entries'>

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

/** Submits today's standup. The RPC enforces the time window server-side. */
export async function submitStandup(entries: StandupEntryInput[], notes?: string): Promise<string> {
  const { data, error } = await supabase.rpc('submit_standup', {
    p_entries: entries.map((e) => ({
      project_id: e.project_id,
      task_id: e.task_id ?? '',
      work_done: e.work_done,
      minutes_spent: e.minutes_spent,
      blocker: e.blocker ?? '',
    })),
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

/** Who was expected to submit on a date + whether they did (management only). */
export async function fetchStandupRoster(date: string): Promise<StandupRosterRow[]> {
  const { data, error } = await supabase.rpc('standup_roster', { p_date: date })
  if (error) throw error
  return data ?? []
}
