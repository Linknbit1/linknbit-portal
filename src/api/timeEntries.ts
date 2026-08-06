import { supabase } from '../lib/supabase'
import type { Tables, TablesUpdate } from '../types/database'
import type { PersonMini } from './projects'

export type TimeEntryRow = Tables<'task_time_entries'>

export interface TimeEntry extends TimeEntryRow {
  profile: PersonMini | null
}

export interface RunningTimeEntry extends TimeEntryRow {
  task: { id: string; title: string; project: { id: string; name: string } | null } | null
}

export interface TimeEntryDetail extends TimeEntryRow {
  profile: PersonMini | null
  task: {
    id: string
    title: string
    status: string
    project: { id: string; name: string } | null
  } | null
}

const SELECT = '*, profile:profiles(id,name,avatar_url)'
/** The floating timer names what is being worked on, so it needs task + project. */
const RUNNING_SELECT = '*, task:tasks(id, title, project:projects(id, name))'
/** The backlog needs who, which task, and which project on every segment. */
const DETAIL_SELECT =
  '*, profile:profiles(id,name,avatar_url), task:tasks!inner(id, title, status, project_id, project:projects(id, name))'

/**
 * Every time segment the caller may see, newest first — the raw material for the
 * backlog. One row per start→stop, so a task paused and resumed three times
 * yields three rows; the grouping in lib/timeBacklog turns that into a history.
 *
 * RLS scopes this to your own time, your team's, and everything for management,
 * so two people can legitimately see different backlogs for the same project.
 */
export async function fetchTimeEntries(filters: { projectId?: string } = {}): Promise<TimeEntryDetail[]> {
  let query = supabase
    .from('task_time_entries')
    .select(DETAIL_SELECT)
    .order('started_at', { ascending: false })
    .limit(500)

  // !inner on the task embed makes this drop non-matching rows rather than
  // returning them with a null task.
  if (filters.projectId) query = query.eq('task.project_id', filters.projectId)

  const { data, error } = await query
  if (error) throw error
  return data
}

/** Entries on one task, newest first. RLS decides whose are visible. */
export async function fetchTaskTimeEntries(taskId: string): Promise<TimeEntry[]> {
  const { data, error } = await supabase
    .from('task_time_entries')
    .select(SELECT)
    .eq('task_id', taskId)
    .order('started_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * The caller's running timer, if any — one per person is enforced by a partial
 * unique index, so this is at most a single row.
 */
export async function fetchRunningTimeEntry(): Promise<RunningTimeEntry | null> {
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth.user?.id
  if (!userId) return null

  const { data, error } = await supabase
    .from('task_time_entries')
    .select(RUNNING_SELECT)
    .eq('profile_id', userId)
    .is('ended_at', null)
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Starts a timer on a task. Any timer already running for this person is stopped
 * first, which both matches ClickUp's one-timer rule and keeps the partial unique
 * index from rejecting the insert.
 */
export async function startTimer(taskId: string): Promise<TimeEntryRow> {
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth.user?.id
  if (!userId) throw new Error('Not signed in')

  await stopRunningTimer()

  const { data, error } = await supabase
    .from('task_time_entries')
    .insert({ task_id: taskId, profile_id: userId, started_at: new Date().toISOString() })
    .select()
    .single()

  if (error) throw error
  return data
}

/** Stops the caller's running timer. No-op when nothing is running. */
export async function stopRunningTimer(): Promise<TimeEntryRow | null> {
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth.user?.id
  if (!userId) return null

  const now = new Date()
  const { data: running, error: findError } = await supabase
    .from('task_time_entries')
    .select('id, started_at')
    .eq('profile_id', userId)
    .is('ended_at', null)
    .maybeSingle()

  if (findError) throw findError
  if (!running) return null

  // The CHECK constraint requires ended_at > started_at, so a timer stopped
  // within the same second is nudged to a one-second entry rather than failing.
  const startedAt = new Date(running.started_at)
  const endedAt = now > startedAt ? now : new Date(startedAt.getTime() + 1000)

  const { data, error } = await supabase
    .from('task_time_entries')
    .update({ ended_at: endedAt.toISOString() })
    .eq('id', running.id)
    .select()
    .single()

  if (error) throw error
  return data
}

export interface LogTimeInput {
  taskId: string
  /** Whole minutes of work to record. */
  minutes: number
  /** When the work ended; defaults to now, so the entry lands on today. */
  endedAt?: Date
  note?: string | null
  billable?: boolean
}

/** Records a completed stretch of work without running a timer. */
export async function logTime({ taskId, minutes, endedAt, note, billable }: LogTimeInput): Promise<TimeEntryRow> {
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth.user?.id
  if (!userId) throw new Error('Not signed in')

  const end = endedAt ?? new Date()
  const start = new Date(end.getTime() - minutes * 60_000)

  const { data, error } = await supabase
    .from('task_time_entries')
    .insert({
      task_id: taskId,
      profile_id: userId,
      started_at: start.toISOString(),
      ended_at: end.toISOString(),
      note: note ?? null,
      billable: billable ?? false,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateTimeEntry(id: string, updates: TablesUpdate<'task_time_entries'>): Promise<TimeEntryRow> {
  const { data, error } = await supabase
    .from('task_time_entries')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteTimeEntry(id: string): Promise<void> {
  const { error } = await supabase.from('task_time_entries').delete().eq('id', id)
  if (error) throw error
}
