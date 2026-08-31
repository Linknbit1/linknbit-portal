import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchProjectServices, fetchProjectServicesFor, addProjectService, removeProjectService,
  fetchProjectServiceMembers, addServiceMembers,
  fetchServiceMemberTaskLoad, unstaffServiceMember,
} from '../api/projectServices'
import { PROJECT_KEYS } from './useProjects'
import { TASK_KEYS } from './useTasks'

export const PROJECT_SERVICE_KEYS = {
  all: ['project_services'] as const,
  byProject: (projectId: string) => ['project_services', projectId] as const,
  forProjects: (projectIds: string[]) => ['project_services', 'bulk', [...projectIds].sort().join(',')] as const,
  members: (projectId: string) => ['service_members', projectId] as const,
}

export function useProjectServices(projectId: string | undefined) {
  return useQuery({
    queryKey: PROJECT_SERVICE_KEYS.byProject(projectId ?? ''),
    queryFn: () => fetchProjectServices(projectId!),
    enabled: !!projectId,
    staleTime: 30_000,
  })
}

/** Service chips for a list of projects, fetched in one round-trip. */
export function useProjectServicesFor(projectIds: string[]) {
  return useQuery({
    queryKey: PROJECT_SERVICE_KEYS.forProjects(projectIds),
    queryFn: () => fetchProjectServicesFor(projectIds),
    enabled: projectIds.length > 0,
    staleTime: 30_000,
  })
}

/** Everyone staffed on the project, across all of its services. */
export function useProjectServiceMembers(projectId: string | undefined) {
  return useQuery({
    queryKey: PROJECT_SERVICE_KEYS.members(projectId ?? ''),
    queryFn: () => fetchProjectServiceMembers(projectId!),
    enabled: !!projectId,
    staleTime: 20_000,
  })
}

/** Adding or removing a service changes what the project page can show at every level. */
function useProjectInvalidation() {
  const qc = useQueryClient()
  return (projectId: string) => {
    qc.invalidateQueries({ queryKey: PROJECT_SERVICE_KEYS.all })
    qc.invalidateQueries({ queryKey: PROJECT_SERVICE_KEYS.members(projectId) })
    qc.invalidateQueries({ queryKey: PROJECT_KEYS.detail(projectId) })
    qc.invalidateQueries({ queryKey: PROJECT_KEYS.all })
  }
}

export function useAddProjectService() {
  const invalidate = useProjectInvalidation()
  return useMutation({
    mutationFn: ({ projectId, serviceId }: { projectId: string; serviceId: string }) =>
      addProjectService(projectId, serviceId),
    onSuccess: (_, v) => invalidate(v.projectId),
  })
}

export function useRemoveProjectService() {
  const invalidate = useProjectInvalidation()
  return useMutation({
    mutationFn: ({ projectServiceId }: { projectId: string; projectServiceId: string }) =>
      removeProjectService(projectServiceId),
    onSuccess: (_, v) => invalidate(v.projectId),
  })
}

export function useAddServiceMembers() {
  const invalidate = useProjectInvalidation()
  return useMutation({
    mutationFn: ({ projectServiceId, profileIds }: { projectId: string; projectServiceId: string; profileIds: string[] }) =>
      addServiceMembers(projectServiceId, profileIds),
    onSuccess: (_, v) => invalidate(v.projectId),
  })
}

/**
 * What removing this person would take with it. Only fetched while the
 * confirmation is open — it is a question asked once, at the moment of asking.
 */
export function useServiceMemberTaskLoad(
  projectServiceId: string | undefined,
  profileId: string | undefined,
) {
  return useQuery({
    queryKey: ['service_members', 'task_load', projectServiceId ?? '', profileId ?? ''],
    queryFn: () => fetchServiceMemberTaskLoad(projectServiceId!, profileId!),
    enabled: !!projectServiceId && !!profileId,
  })
}

/** Removes them from the block and from its tasks. See unstaffServiceMember. */
export function useUnstaffServiceMember() {
  const qc = useQueryClient()
  const invalidate = useProjectInvalidation()
  return useMutation({
    mutationFn: ({ projectServiceId, profileId }: { projectId: string; projectServiceId: string; profileId: string }) =>
      unstaffServiceMember(projectServiceId, profileId),
    onSuccess: (_, v) => {
      invalidate(v.projectId)
      // The roster is not the only thing that moved: every board and list
      // showing those tasks is now holding an assignee who is no longer on them.
      qc.invalidateQueries({ queryKey: TASK_KEYS.all })
    },
  })
}
