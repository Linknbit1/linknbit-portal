import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchStages, createStage, updateStage, deleteStage, reorderStages,
} from '../api/stages'
import type { TablesInsert, TablesUpdate } from '../types/database'

export const STAGE_KEYS = {
  byProject: (projectId: string) => ['stages', projectId] as const,
}

export function useStages(projectId: string | undefined) {
  return useQuery({
    queryKey: STAGE_KEYS.byProject(projectId ?? ''),
    queryFn: () => fetchStages(projectId!),
    enabled: !!projectId,
    staleTime: 20_000,
  })
}

export function useCreateStage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: TablesInsert<'stages'>) => createStage(payload),
    onSuccess: (row) => qc.invalidateQueries({ queryKey: STAGE_KEYS.byProject(row.project_id) }),
  })
}

export function useUpdateStage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: TablesUpdate<'stages'> }) => updateStage(id, updates),
    onSuccess: (row) => qc.invalidateQueries({ queryKey: STAGE_KEYS.byProject(row.project_id) }),
  })
}

export function useDeleteStage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; projectId: string }) => deleteStage(id),
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: STAGE_KEYS.byProject(v.projectId) }),
  })
}

export function useReorderStages() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orderedIds }: { projectId: string; orderedIds: string[] }) => reorderStages(orderedIds),
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: STAGE_KEYS.byProject(v.projectId) }),
  })
}
