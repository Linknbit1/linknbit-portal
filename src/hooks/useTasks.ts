import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchTasks, fetchTask, createTask, updateTask, updateTaskStatus,
  moveTask,
  type TaskFilters, type TaskStatus, type MoveTaskArgs,
} from '../api/tasks'
import { deleteTaskCascade, fetchTaskDeleteImpact } from '../api/deleteCascade'
import { PROJECT_KEYS } from './useProjects'
import { AUDIT_KEYS } from './useAuditLog'
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
      // Every audited field edit adds a line to the task's activity feed.
      qc.invalidateQueries({ queryKey: AUDIT_KEYS.task(row.id) })
      invalidateTasks(qc, row.project_id)
    },
  })
}

/**
 * Re-homes a task under another project/service. Both the old and the new
 * project's lists have to be refreshed — the task leaves one and joins the
 * other — and the files panel follows, since attachments were re-pointed too.
 */
export function useMoveTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: MoveTaskArgs & { fromProjectId?: string }) => moveTask(args),
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: TASK_KEYS.detail(v.taskId) })
      qc.invalidateQueries({ queryKey: AUDIT_KEYS.task(v.taskId) })
      // Broad: the files moved project, so both projects' panels are stale.
      qc.invalidateQueries({ queryKey: ['attachments'] })
      invalidateTasks(qc, v.fromProjectId)
      invalidateTasks(qc)
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
      qc.invalidateQueries({ queryKey: AUDIT_KEYS.task(row.id) })
      invalidateTasks(qc, row.project_id)
    },
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; projectId?: string }) => deleteTaskCascade(id),
    onSuccess: (_, v) => {
      invalidateTasks(qc, v.projectId)
      qc.invalidateQueries({ queryKey: ['comments'] })
      qc.invalidateQueries({ queryKey: ['attachments'] })
      qc.invalidateQueries({ queryKey: ['subtasks'] })
    },
  })
}

export function useTaskDeleteImpact(id: string | undefined) {
  return useQuery({
    queryKey: ['tasks', id ?? '', 'delete-impact'],
    queryFn: () => fetchTaskDeleteImpact(id!),
    enabled: !!id,
    staleTime: 0,
  })
}
