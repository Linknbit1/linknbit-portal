import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchProjects, fetchProject, createProject, updateProject, updateProjectStatus,
  setProjectManagers,
  type ProjectFilters, type ProjectStatus, type NewProjectService,
} from '../api/projects'
import { deleteProjectCascade, fetchProjectDeleteImpact } from '../api/deleteCascade'
import { TASK_KEYS } from './useTasks'
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
    mutationFn: ({ payload, services }: { payload: TablesInsert<'projects'>; services: NewProjectService[] }) =>
      createProject(payload, services),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PROJECT_KEYS.all })
      qc.invalidateQueries({ queryKey: ['project_services'] })
      // A template fills the new services with stages and tasks.
      qc.invalidateQueries({ queryKey: ['stages'] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
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

/**
 * Sets who manages a project. Invalidates tasks too: managing a project is what
 * decides whether its work is visible at all, so the caller's task lists change
 * the moment this lands.
 */
export function useSetProjectManagers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, profileIds }: { projectId: string; profileIds: string[] }) =>
      setProjectManagers(projectId, profileIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PROJECT_KEYS.all })
      qc.invalidateQueries({ queryKey: TASK_KEYS.all })
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
