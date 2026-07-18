import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchTasks, fetchTask, createTask, updateTask, updateTaskStatus, deleteTask,
  type TaskFilters, type TaskStatus,
} from '../api/tasks'
import { PROJECT_KEYS } from './useProjects'
import type { TablesInsert, TablesUpdate } from '../types/database'

export const TASK_KEYS = {
  all: ['tasks'] as const,
  list: (filters: TaskFilters) => ['tasks', 'list', filters] as const,
  detail: (id: string) => ['tasks', id] as const,
}

export function useTasks(filters: TaskFilters = {}) {
  return useQuery({
    queryKey: TASK_KEYS.list(filters),
    queryFn: () => fetchTasks(filters),
    staleTime: 15_000,
  })
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: TASK_KEYS.detail(id ?? ''),
    queryFn: () => fetchTask(id!),
    enabled: !!id,
    staleTime: 15_000,
  })
}

/** Broadly invalidate task lists + the parent project (task counts / progress). */
function invalidateTasks(qc: ReturnType<typeof useQueryClient>, projectId?: string) {
  qc.invalidateQueries({ queryKey: TASK_KEYS.all })
  if (projectId) qc.invalidateQueries({ queryKey: PROJECT_KEYS.detail(projectId) })
  qc.invalidateQueries({ queryKey: PROJECT_KEYS.all })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: TablesInsert<'tasks'>) => createTask(payload),
    onSuccess: (row) => invalidateTasks(qc, row.project_id),
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: TablesUpdate<'tasks'> }) => updateTask(id, updates),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: TASK_KEYS.detail(row.id) })
      invalidateTasks(qc, row.project_id)
    },
  })
}

export function useUpdateTaskStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, boardOrder }: { id: string; status: TaskStatus; boardOrder?: number; projectId?: string }) =>
      updateTaskStatus(id, status, boardOrder),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: TASK_KEYS.detail(row.id) })
      invalidateTasks(qc, row.project_id)
    },
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; projectId?: string }) => deleteTask(id),
    onSuccess: (_, v) => invalidateTasks(qc, v.projectId),
  })
}
