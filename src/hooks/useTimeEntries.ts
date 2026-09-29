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
  type StartTimerInput,
  type TimeEntry,
} from '../api/timeEntries'
import { AUDIT_KEYS } from './useAuditLog'
import { useAuthContext } from '../context/AuthContext'
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
    mutationFn: (input: StartTimerInput) => startTimer(input),
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

/**
 * Logs a stretch of work, showing it in the list straight away.
 *
 * The optimistic row carries a temporary id and is replaced when the refetch in
 * onSettled lands. Logging time is a form submit, so waiting on the round-trip
 * before anything appears makes a fast write feel slow.
 */
export function useLogTime() {
  const qc = useQueryClient()
  const invalidate = useInvalidateTime()
  const { profile } = useAuthContext()

  return useMutation({
    mutationFn: (input: LogTimeInput) => logTime(input),

    onMutate: async (input) => {
      if (!profile) return undefined
      const key = TIME_ENTRY_KEYS.byTask(input.taskId)
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<TimeEntry[]>(key)

      const end = input.endedAt ?? new Date()
      const start = input.startedAt ?? new Date(end.getTime() - input.minutes * 60_000)
      const optimistic: TimeEntry = {
        // Prefixed so a stray reference to it is obvious rather than mistaken
        // for a real row id.
        id: `optimistic:${crypto.randomUUID()}`,
        task_id: input.taskId,
        profile_id: profile.id,
        started_at: start.toISOString(),
        ended_at: end.toISOString(),
        // Log time is always hand-entered; the server will say the same.
        source: 'manual',
        note: input.note.trim(),
        billable: input.billable ?? false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        profile: { id: profile.id, name: profile.name, avatar_url: profile.avatar_url },
      }

      // Newest first, matching the server ordering.
      qc.setQueryData<TimeEntry[]>(key, (old) => [optimistic, ...(old ?? [])])
      return { previous, key }
    },

    onError: (_error, _input, context) => {
      if (context?.previous) qc.setQueryData(context.key, context.previous)
    },

    onSettled: invalidate,
  })
}

/** Applies the correction to the row on screen before the write returns. */
export function useUpdateTimeEntry() {
  const qc = useQueryClient()
  const invalidate = useInvalidateTime()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: TablesUpdate<'task_time_entries'>; taskId?: string }) =>
      updateTimeEntry(id, updates),

    onMutate: async ({ id, updates, taskId }) => {
      if (!taskId) return undefined
      const key = TIME_ENTRY_KEYS.byTask(taskId)
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<TimeEntry[]>(key)
      qc.setQueryData<TimeEntry[]>(key, (old) =>
        old?.map((e) => (e.id === id ? { ...e, ...updates } : e)) ?? old)
      return { previous, key }
    },

    onError: (_error, _vars, context) => {
      if (context?.previous) qc.setQueryData(context.key, context.previous)
    },

    onSettled: invalidate,
  })
}

/** Drops the row immediately — a deleted entry lingering reads as a failed click. */
export function useDeleteTimeEntry() {
  const qc = useQueryClient()
  const invalidate = useInvalidateTime()

  return useMutation({
    mutationFn: ({ id }: { id: string; taskId?: string }) => deleteTimeEntry(id),

    onMutate: async ({ id, taskId }) => {
      if (!taskId) return undefined
      const key = TIME_ENTRY_KEYS.byTask(taskId)
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<TimeEntry[]>(key)
      qc.setQueryData<TimeEntry[]>(key, (old) => old?.filter((e) => e.id !== id) ?? old)
      return { previous, key }
    },

    onError: (_error, _vars, context) => {
      if (context?.previous) qc.setQueryData(context.key, context.previous)
    },

    onSettled: invalidate,
  })
}
