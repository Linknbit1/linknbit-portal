import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchProjects, fetchProject, createProject, updateProject, updateProjectStatus,
  type ProjectFilters, type ProjectStatus,
} from '../api/projects'
import { deleteProjectCascade, fetchProjectDeleteImpact } from '../api/deleteCascade'
import type { TablesInsert, TablesUpdate } from '../types/database'

export const PROJECT_KEYS = {
  all: ['projects'] as const,
  list: (filters: ProjectFilters) => ['projects', 'list', filters] as const,
  detail: (id: string) => ['projects', id] as const,
}

export function useProjects(filters: ProjectFilters = {}) {
  return useQuery({
    queryKey: PROJECT_KEYS.list(filters),
    queryFn: () => fetchProjects(filters),
    staleTime: 20_000,
  })
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: PROJECT_KEYS.detail(id ?? ''),
    queryFn: () => fetchProject(id!),
    enabled: !!id,
    staleTime: 20_000,
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: TablesInsert<'projects'>) => createProject(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PROJECT_KEYS.all })
      qc.invalidateQueries({ queryKey: ['clients'] })
    },
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: TablesUpdate<'projects'> }) => updateProject(id, updates),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: PROJECT_KEYS.all })
      qc.invalidateQueries({ queryKey: PROJECT_KEYS.detail(v.id) })
    },
  })
}

export function useUpdateProjectStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ProjectStatus }) => updateProjectStatus(id, status),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: PROJECT_KEYS.all })
      qc.invalidateQueries({ queryKey: PROJECT_KEYS.detail(v.id) })
    },
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteProjectCascade(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PROJECT_KEYS.all })
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['stages'] })
      qc.invalidateQueries({ queryKey: ['attachments'] })
      qc.invalidateQueries({ queryKey: ['clients'] })
    },
  })
}

export function useProjectDeleteImpact(id: string | undefined) {
  return useQuery({
    queryKey: ['projects', id ?? '', 'delete-impact'],
    queryFn: () => fetchProjectDeleteImpact(id!),
    enabled: !!id,
    staleTime: 0,
  })
}
