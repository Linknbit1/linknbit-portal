import { supabase } from '../lib/supabase'
import type { Database, Tables, TablesInsert, TablesUpdate } from '../types/database'

export type TaskAllocationRow = Tables<'task_allocations'>

type ScheduleRosterRow = Database['public']['Functions']['schedule_roster']['Returns'][number]

/** One booking on one day, as the roster hands it back. */
export interface Allocation {
  id: string
  task_id: string
  task_title: string
  project_id: string | null
  project_name: string | null
  status: string
  planned_minutes: number
  start_time: string | null
  end_time: string | null
  note: string | null
}

/**
 * One person on one day: what the day holds, what is booked into it, and what the
 * clock actually recorded.
 *
 * The three are deliberately separate numbers and are never added together.
 * `available` is capacity, `planned` is intent, `tracked` is measurement — the
 * useful reading is the gap between them.
 */
export interface ScheduleDay {
  profileId: string
  profileName: string
  avatarUrl: string | null
  jobTitle: string | null
  teamNames: string[]
  day: string
  availableMinutes: number
  plannedMinutes: number
  trackedMinutes: number
  allocations: Allocation[]
}

/** The jsonb column arrives as `Json`; this narrows it without an `as`. */
function parseAllocations(value: ScheduleRosterRow['allocations']): Allocation[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return []
    if (!('id' in item) || !('task_id' in item)) return []
    const row = item as Record<string, unknown>
    return [{
      id: String(row.id),
      task_id: String(row.task_id),
      task_title: String(row.task_title ?? 'Untitled task'),
      project_id: row.project_id == null ? null : String(row.project_id),
      project_name: row.project_name == null ? null : String(row.project_name),
      status: String(row.status ?? ''),
      planned_minutes: Number(row.planned_minutes ?? 0),
      start_time: row.start_time == null ? null : String(row.start_time),
      end_time: row.end_time == null ? null : String(row.end_time),
      note: row.note == null ? null : String(row.note),
    }]
  })
}

/**
 * Capacity, plan and actual for everybody this person may plan, over a range.
 *
 * One call per grid rather than one per person: the RPC already carries the day's
 * allocations, so a week for twenty people is a single round trip.
 */
export async function fetchScheduleRoster(
  from: string,
  to: string,
  profileId?: string,
): Promise<ScheduleDay[]> {
  const { data, error } = await supabase.rpc('schedule_roster', {
    p_from: from,
    p_to: to,
    p_profile: profileId ?? undefined,
  })
  if (error) throw error
  return (data ?? []).map((row) => ({
    profileId: row.profile_id,
    profileName: row.profile_name,
    avatarUrl: row.avatar_url,
    jobTitle: row.job_title,
    teamNames: row.team_names ?? [],
    day: row.day,
    availableMinutes: row.available_minutes,
    plannedMinutes: row.planned_minutes,
    trackedMinutes: row.tracked_minutes,
    allocations: parseAllocations(row.allocations),
  }))
}

export interface AllocationInput {
  taskId: string
  profileId: string
  day: string
  plannedMinutes: number
  startTime?: string | null
  endTime?: string | null
  note?: string | null
}

/**
 * Books time, or adds to a booking that is already there.
 *
 * The table is unique on (task, person, day), so scheduling the same task twice
 * on one day is one row growing rather than two rows the reader has to add up.
 */
export async function upsertAllocation(input: AllocationInput): Promise<TaskAllocationRow> {
  const payload: TablesInsert<'task_allocations'> = {
    task_id: input.taskId,
    profile_id: input.profileId,
    day: input.day,
    planned_minutes: input.plannedMinutes,
    start_time: input.startTime ?? null,
    end_time: input.endTime ?? null,
    note: input.note ?? null,
  }
  const { data, error } = await supabase
    .from('task_allocations')
    .upsert(payload, { onConflict: 'task_id,profile_id,day' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateAllocation(
  id: string,
  updates: TablesUpdate<'task_allocations'>,
): Promise<TaskAllocationRow> {
  const { data, error } = await supabase
    .from('task_allocations')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Moves a booking to another day, keeping everything else about it. */
export function moveAllocation(id: string, day: string): Promise<TaskAllocationRow> {
  return updateAllocation(id, { day })
}

export async function deleteAllocation(id: string): Promise<void> {
  const { error } = await supabase.from('task_allocations').delete().eq('id', id)
  if (error) throw error
}
