import { supabase } from '../lib/supabase'
import type { Database } from '../types/database'

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
export type ProjectBacklogRow = Database['public']['Functions']['report_project_backlog']['Returns'][number]
export type EmployeeBacklogRow = Database['public']['Functions']['report_employee_backlog']['Returns'][number]
export type ProjectDetailRow = Database['public']['Functions']['report_project_detail']['Returns'][number]
export type EmployeeDetailRow = Database['public']['Functions']['report_employee_detail']['Returns'][number]

/** Timers running this instant. */
export async function fetchActiveTimers(): Promise<ActiveTimer[]> {
  const { data, error } = await supabase.rpc('active_timers')
  if (error) throw error
  return data ?? []
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
