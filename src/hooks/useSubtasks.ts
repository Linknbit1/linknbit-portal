import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchSubtasks, createSubtask, toggleSubtask, updateSubtask, deleteSubtask,
} from '../api/subtasks'
import { TASK_KEYS } from './useTasks'
import type { TablesUpdate } from '../types/database'

export const SUBTASK_KEYS = {
  byTask: (taskId: string) => ['subtasks', taskId] as const,
}

export function useSubtasks(taskId: string | undefined) {
  return useQuery({
    queryKey: SUBTASK_KEYS.byTask(taskId ?? ''),
    queryFn: () => fetchSubtasks(taskId!),
    enabled: !!taskId,
    staleTime: 15_000,
  })
}

export function useCreateSubtask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, title, assigneeId }: { taskId: string; title: string; assigneeId?: string }) =>
      createSubtask(taskId, title, assigneeId),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: SUBTASK_KEYS.byTask(row.task_id) })
      qc.invalidateQueries({ queryKey: TASK_KEYS.all })
    },
  })
}

export function useToggleSubtask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean; taskId: string }) => toggleSubtask(id, completed),
    onSuccess: (row) => qc.invalidateQueries({ queryKey: SUBTASK_KEYS.byTask(row.task_id) }),
  })
}

export function useUpdateSubtask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: TablesUpdate<'subtasks'>; taskId: string }) =>
      updateSubtask(id, updates),
    onSuccess: (row) => qc.invalidateQueries({ queryKey: SUBTASK_KEYS.byTask(row.task_id) }),
  })
}

export function useDeleteSubtask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; taskId: string }) => deleteSubtask(id),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: SUBTASK_KEYS.byTask(v.taskId) })
      qc.invalidateQueries({ queryKey: TASK_KEYS.all })
    },
  })
}
