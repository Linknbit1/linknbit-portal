import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  deleteTimeEntry,
  fetchRunningTimeEntry,
  fetchTaskTimeEntries,
  fetchTimeEntries,
  logTime,
  startTimer,
  stopRunningTimer,
  updateTimeEntry,
  type LogTimeInput,
} from '../api/timeEntries'
import { AUDIT_KEYS } from './useAuditLog'
import type { TablesUpdate } from '../types/database'

export const TIME_ENTRY_KEYS = {
  all: ['time-entries'] as const,
  byTask: (taskId: string) => ['time-entries', taskId] as const,
  /** Cross-task backlog; undefined projectId means "everything visible". */
  backlog: (projectId?: string) => ['time-entries', 'backlog', projectId ?? 'all'] as const,
  /** The caller's own running timer — at most one across the whole workspace. */
  running: ['time-entries', 'running'] as const,
}

export function useTaskTimeEntries(taskId: string | null | undefined) {
  return useQuery({
    queryKey: TIME_ENTRY_KEYS.byTask(taskId ?? ''),
    queryFn: () => fetchTaskTimeEntries(taskId ?? ''),
    enabled: !!taskId,
  })
}

/**
 * Every visible time segment, optionally narrowed to one project — the backlog's
 * data source. Kept out of TIME_ENTRY_KEYS.byTask so a task drawer and a backlog
 * view don't fight over the same cache entry.
 */
export function useTimeEntries(filters: { projectId?: string } = {}) {
  return useQuery({
    queryKey: TIME_ENTRY_KEYS.backlog(filters.projectId),
    queryFn: () => fetchTimeEntries(filters),
  })
}

export function useRunningTimeEntry() {
  return useQuery({
    queryKey: TIME_ENTRY_KEYS.running,
    queryFn: fetchRunningTimeEntry,
  })
}

/**
 * Invalidates every view of time — this task, any task a timer was moved off,
 * and the running timer — plus the activity feed, since each of these writes an
 * audit row that the feed renders.
 */
function useInvalidateTime() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: TIME_ENTRY_KEYS.all })
    // Broad on purpose: stopping a timer can touch a task other than the one on
    // screen, and at most a couple of activity queries are ever mounted.
    qc.invalidateQueries({ queryKey: AUDIT_KEYS.all })
  }
}

export function useStartTimer() {
  const invalidate = useInvalidateTime()
  return useMutation({
    mutationFn: (taskId: string) => startTimer(taskId),
    onSuccess: invalidate,
  })
}

export function useStopTimer() {
  const invalidate = useInvalidateTime()
  return useMutation({
    mutationFn: stopRunningTimer,
    onSuccess: invalidate,
  })
}

export function useLogTime() {
  const invalidate = useInvalidateTime()
  return useMutation({
    mutationFn: (input: LogTimeInput) => logTime(input),
    onSuccess: invalidate,
  })
}

export function useUpdateTimeEntry() {
  const invalidate = useInvalidateTime()
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: TablesUpdate<'task_time_entries'> }) =>
      updateTimeEntry(id, updates),
    onSuccess: invalidate,
  })
}

export function useDeleteTimeEntry() {
  const invalidate = useInvalidateTime()
  return useMutation({
    mutationFn: (id: string) => deleteTimeEntry(id),
    onSuccess: invalidate,
  })
}
