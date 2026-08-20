import { useQuery } from '@tanstack/react-query'
import {
  fetchActiveTimers, fetchTimesheetSegments, fetchProjectBacklog, fetchEmployeeBacklog,
  fetchProjectDetail, fetchEmployeeDetail,
} from '../api/reports'

export const REPORT_KEYS = {
  activeTimers: ['reports', 'active-timers'] as const,
  timesheet: (date: string, profileId?: string) =>
    ['reports', 'timesheet', date, profileId ?? 'all'] as const,
  projectBacklog: (from: string, to: string) => ['reports', 'project-backlog', from, to] as const,
  employeeBacklog: (from: string, to: string) => ['reports', 'employee-backlog', from, to] as const,
  projectDetail: (id: string, from: string, to: string) =>
    ['reports', 'project-detail', id, from, to] as const,
  employeeDetail: (id: string, from: string, to: string) =>
    ['reports', 'employee-detail', id, from, to] as const,
}

/**
 * Drill-downs, fetched only once a row is opened.
 *
 * `enabled` is what keeps a table of forty projects from firing forty extra
 * queries on mount — nobody expands more than one or two.
 */
export function useProjectDetail(projectId: string | null, from: string, to: string) {
  return useQuery({
    queryKey: REPORT_KEYS.projectDetail(projectId ?? '', from, to),
    queryFn: () => fetchProjectDetail(projectId!, from, to),
    enabled: !!projectId,
    staleTime: 60_000,
  })
}

export function useEmployeeDetail(profileId: string | null, from: string, to: string) {
  return useQuery({
    queryKey: REPORT_KEYS.employeeDetail(profileId ?? '', from, to),
    queryFn: () => fetchEmployeeDetail(profileId!, from, to),
    enabled: !!profileId,
    staleTime: 60_000,
  })
}

/**
 * Who is working on what, right now.
 *
 * Polled rather than left to staleTime: this is the one screen whose whole
 * value is being current, and a lead looking at it wants the running time to
 * move without them reloading.
 */
export function useActiveTimers(enabled = true) {
  return useQuery({
    queryKey: REPORT_KEYS.activeTimers,
    queryFn: fetchActiveTimers,
    enabled,
    refetchInterval: 30_000,
    staleTime: 15_000,
  })
}

export function useTimesheetSegments(date: string, profileId?: string, enabled = true) {
  return useQuery({
    queryKey: REPORT_KEYS.timesheet(date, profileId),
    queryFn: () => fetchTimesheetSegments(date, profileId),
    enabled,
    // Today's bar keeps growing while a timer runs; a past day never changes.
    refetchInterval: date === new Date().toISOString().slice(0, 10) ? 60_000 : false,
    staleTime: 30_000,
  })
}

export function useProjectBacklog(from: string, to: string, enabled = true) {
  return useQuery({
    queryKey: REPORT_KEYS.projectBacklog(from, to),
    queryFn: () => fetchProjectBacklog(from, to),
    enabled,
    staleTime: 60_000,
  })
}

export function useEmployeeBacklog(from: string, to: string, enabled = true) {
  return useQuery({
    queryKey: REPORT_KEYS.employeeBacklog(from, to),
    queryFn: () => fetchEmployeeBacklog(from, to),
    enabled,
    staleTime: 60_000,
  })
}
