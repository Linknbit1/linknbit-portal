import { supabase } from '../lib/supabase'
import type { Database, Json } from '../types/database'

/**
 * Backlog reporting and the timesheet.
 *
 * Every figure here comes back from a SECURITY DEFINER RPC that has already
 * applied the visibility rule — management sees everyone, leads and PMs see
 * their team, everyone else sees themselves. Nothing is filtered client-side,
 * so a screen cannot leak a row by forgetting a `where`.
 *
 * ── The two clocks ───────────────────────────────────────────────────────────
 * `timer_minutes` and `standup_minutes` measure the same day by different means
 * and routinely disagree. They are never added. `variance_minutes` is
 * standup − timer: positive means more was claimed than tracked, negative means
 * work happened that the standup did not mention.
 */

export type ActiveTimer = Database['public']['Functions']['active_timers']['Returns'][number]
export type TimesheetSegment = Database['public']['Functions']['timesheet_segments']['Returns'][number]
type TimesheetRosterRow = Database['public']['Functions']['timesheet_roster']['Returns'][number]
export type ProjectBacklogRow = Database['public']['Functions']['report_project_backlog']['Returns'][number]
export type EmployeeBacklogRow = Database['public']['Functions']['report_employee_backlog']['Returns'][number]
export type ProjectDetailRow = Database['public']['Functions']['report_project_detail']['Returns'][number]
export type EmployeeDetailRow = Database['public']['Functions']['report_employee_detail']['Returns'][number]
export type ProjectTaskRow = Database['public']['Functions']['report_project_tasks']['Returns'][number]
export type EmployeeTaskRow = Database['public']['Functions']['report_employee_tasks']['Returns'][number]

/** Timers running this instant. */
export async function fetchActiveTimers(): Promise<ActiveTimer[]> {
  const { data, error } = await supabase.rpc('active_timers')
  if (error) throw error
  return data ?? []
}

/**
 * The people on the timesheet, timer or no timer.
 *
 * `timesheet_segments` only knows about people who pressed start, so a roster
 * built from it silently drops everybody who worked without tracking, everybody
 * on leave and everybody who never turned up — the three cases a lead most
 * needs to tell apart. This is the row list; the segments are the bars drawn on
 * it, joined by `profile_id`.
 */
export async function fetchTimesheetRoster(date: string): Promise<TimesheetPerson[]> {
  const { data, error } = await supabase.rpc('timesheet_roster', { p_date: date })
  if (error) throw error
  return (data ?? []).map((row) => ({ ...row, exceptions: parseExceptions(row.exceptions) }))
}

/** One day of tracked segments — the bars on the timesheet. */
export async function fetchTimesheetSegments(
  date: string, profileId?: string,
): Promise<TimesheetSegment[]> {
  const { data, error } = await supabase.rpc('timesheet_segments', {
    p_date: date,
    p_profile: profileId ?? undefined,
  })
  if (error) throw error
  return data ?? []
}

export async function fetchProjectBacklog(from: string, to: string): Promise<ProjectBacklogRow[]> {
  const { data, error } = await supabase.rpc('report_project_backlog', { p_from: from, p_to: to })
  if (error) throw error
  return data ?? []
}

export async function fetchEmployeeBacklog(from: string, to: string): Promise<EmployeeBacklogRow[]> {
  const { data, error } = await supabase.rpc('report_employee_backlog', { p_from: from, p_to: to })
  if (error) throw error
  return data ?? []
}

/** One project, broken down by the people who worked on it. */
export async function fetchProjectDetail(
  projectId: string, from: string, to: string,
): Promise<ProjectDetailRow[]> {
  const { data, error } = await supabase.rpc('report_project_detail', {
    p_project: projectId, p_from: from, p_to: to,
  })
  if (error) throw error
  return data ?? []
}

/** One person, broken down by the projects they worked on. */
export async function fetchEmployeeDetail(
  profileId: string, from: string, to: string,
): Promise<EmployeeDetailRow[]> {
  const { data, error } = await supabase.rpc('report_employee_detail', {
    p_profile: profileId, p_from: from, p_to: to,
  })
  if (error) throw error
  return data ?? []
}


/* ── Attendance exceptions, out of the jsonb the RPC aggregates them into ─────
 * They arrive as `Json` because they are built with jsonb_agg, so they are
 * parsed rather than asserted: a row with a shape nobody planned for is dropped
 * instead of crashing a chart three components down.
 */

const EXCEPTION_TYPES = ['late_arrival', 'early_departure', 'out_of_office'] as const
export type TimesheetExceptionType = (typeof EXCEPTION_TYPES)[number]

export interface TimesheetException {
  type: TimesheetExceptionType
  /** Rejected exceptions never reach the client — they changed nothing. */
  status: 'pending' | 'approved'
  /** 'HH:MM' in the office timezone: when they left, or the late arrival time. */
  requested_time: string | null
  return_time: string | null
  actual_departure: string | null
  actual_return: string | null
  reason: string
}

/** A roster row with its exceptions parsed out of the raw jsonb. */
export interface TimesheetPerson extends Omit<TimesheetRosterRow, 'exceptions'> {
  exceptions: TimesheetException[]
}

const asString = (value: Json | undefined): string | null =>
  typeof value === 'string' ? value : null

function isExceptionType(value: Json | undefined): value is TimesheetExceptionType {
  return typeof value === 'string' && EXCEPTION_TYPES.some((type) => type === value)
}

function parseExceptions(value: Json): TimesheetException[] {
  if (!Array.isArray(value)) return []

  const parsed: TimesheetException[] = []
  for (const item of value) {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) continue
    if (!isExceptionType(item.type)) continue
    parsed.push({
      type: item.type,
      status: item.status === 'approved' ? 'approved' : 'pending',
      requested_time: asString(item.requested_time),
      return_time: asString(item.return_time),
      actual_departure: asString(item.actual_departure),
      actual_return: asString(item.actual_return),
      reason: asString(item.reason) ?? '',
    })
  }
  return parsed
}


/**
 * One project, task by task — the level below `fetchProjectDetail`.
 *
 * Returns more than the tasks that recorded time: still-open tasks with nothing
 * against them come back with `had_activity = false`, because "open three weeks,
 * no time logged" is the finding a lead opens this for. Soft-deleted tasks that
 * still carry time are included and flagged rather than dropped — the parent
 * report counts their minutes, so hiding them here would make the breakdown
 * disagree with the total printed above it.
 */
export async function fetchProjectTasks(
  projectId: string, from: string, to: string,
): Promise<ProjectTaskRow[]> {
  const { data, error } = await supabase.rpc('report_project_tasks', {
    p_project: projectId, p_from: from, p_to: to,
  })
  if (error) throw error
  return data ?? []
}

/** One person, task by task, grouped by the project each task sits under. */
export async function fetchEmployeeTasks(
  profileId: string, from: string, to: string,
): Promise<EmployeeTaskRow[]> {
  const { data, error } = await supabase.rpc('report_employee_tasks', {
    p_profile: profileId, p_from: from, p_to: to,
  })
  if (error) throw error
  return data ?? []
}
