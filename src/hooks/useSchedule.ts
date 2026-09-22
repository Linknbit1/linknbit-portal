import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchScheduleRoster,
  upsertAllocation,
  updateAllocation,
  moveAllocation,
  deleteAllocation,
  type AllocationInput,
} from '../api/schedule'
import type { TablesUpdate } from '../types/database'

export const SCHEDULE_KEYS = {
  all: ['schedule'] as const,
  roster: (from: string, to: string, profileId?: string) =>
    ['schedule', 'roster', from, to, profileId ?? 'everyone'] as const,
}

/**
 * The grid. Short stale time because a lead planning next week is usually doing
 * it alongside somebody else doing the same thing, and a booking that has already
 * been made must not be invisible while they make a conflicting one.
 */
export function useScheduleRoster(from: string, to: string, profileId?: string) {
  return useQuery({
    queryKey: SCHEDULE_KEYS.roster(from, to, profileId),
    queryFn: () => fetchScheduleRoster(from, to, profileId),
    staleTime: 30_000,
  })
}

/** Every mutation below invalidates the whole schedule tree — a booking moves totals on two days. */
function useScheduleMutation<TArgs>(fn: (args: TArgs) => Promise<unknown>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: SCHEDULE_KEYS.all }),
  })
}

export function useBookTime() {
  return useScheduleMutation((input: AllocationInput) => upsertAllocation(input))
}

export function useUpdateAllocation() {
  return useScheduleMutation(
    ({ id, updates }: { id: string; updates: TablesUpdate<'task_allocations'> }) =>
      updateAllocation(id, updates),
  )
}

export function useMoveAllocation() {
  return useScheduleMutation(({ id, day }: { id: string; day: string }) => moveAllocation(id, day))
}

export function useDeleteAllocation() {
  return useScheduleMutation((id: string) => deleteAllocation(id))
}
