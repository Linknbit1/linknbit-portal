import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchTaskStatuses, createTaskStatus, updateTaskStatus, deleteTaskStatus, setReviewStatus,
} from '../api/taskStatuses'
import type { TablesInsert, TablesUpdate } from '../types/database'
import { TASK_KEYS } from './useTasks'

export const TASK_STATUS_KEYS = { all: ['task_statuses'] as const }

/**
 * The board's columns. Cached hard: these change when somebody edits them on
 * the Statuses screen, which invalidates below, and otherwise never.
 */
export function useTaskStatuses() {
  return useQuery({
    queryKey: TASK_STATUS_KEYS.all,
    queryFn: fetchTaskStatuses,
    staleTime: 10 * 60 * 1000,
  })
}

function useStatusMutation<T>(fn: (v: T) => Promise<unknown>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TASK_STATUS_KEYS.all })
      // Board columns and card colours come from these, so the lists redraw.
      qc.invalidateQueries({ queryKey: TASK_KEYS.all })
    },
  })
}

export const useCreateTaskStatus = () =>
  useStatusMutation((payload: TablesInsert<'task_statuses'>) => createTaskStatus(payload))

export const useUpdateTaskStatus = () =>
  useStatusMutation(({ key, updates }: { key: string; updates: TablesUpdate<'task_statuses'> }) =>
    updateTaskStatus(key, updates))

export const useDeleteTaskStatus = () =>
  useStatusMutation((key: string) => deleteTaskStatus(key))

export const useSetReviewStatus = () =>
  useStatusMutation((key: string | null) => setReviewStatus(key))
