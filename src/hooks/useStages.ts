import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchStages, fetchServiceStages, createStage, updateStage, deleteStage, reorderStages,
} from '../api/stages'
import type { TablesInsert, TablesUpdate } from '../types/database'

export const STAGE_KEYS = {
  byProject: (projectId: string) => ['stages', projectId] as const,
  byService: (projectServiceId: string) => ['stages', 'service', projectServiceId] as const,
}

export function useStages(projectId: string | undefined) {
  return useQuery({
    queryKey: STAGE_KEYS.byProject(projectId ?? ''),
    queryFn: () => fetchStages(projectId!),
    enabled: !!projectId,
    staleTime: 20_000,
  })
}

/** Stages of a single service block. */
export function useServiceStages(projectServiceId: string | undefined) {
  return useQuery({
    queryKey: STAGE_KEYS.byService(projectServiceId ?? ''),
    queryFn: () => fetchServiceStages(projectServiceId!),
    enabled: !!projectServiceId,
    staleTime: 20_000,
  })
}

export function useCreateStage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: TablesInsert<'stages'>) => createStage(payload),
    // Prefix invalidation: a stage shows up in both the project and the service list.
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stages'] }),
  })
}

export function useUpdateStage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: TablesUpdate<'stages'> }) => updateStage(id, updates),
    // Prefix invalidation: a stage shows up in both the project and the service list.
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stages'] }),
  })
}

export function useDeleteStage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; projectId: string }) => deleteStage(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stages'] }),
  })
}

export function useReorderStages() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orderedIds }: { projectId: string; orderedIds: string[] }) => reorderStages(orderedIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stages'] }),
  })
}
