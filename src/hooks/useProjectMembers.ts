import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchProjectMembers, addProjectMember, removeProjectMember } from '../api/projectMembers'
import { PROJECT_KEYS } from './useProjects'

export const PROJECT_MEMBER_KEYS = {
  byProject: (projectId: string) => ['project_members', projectId] as const,
}

export function useProjectMembers(projectId: string | undefined) {
  return useQuery({
    queryKey: PROJECT_MEMBER_KEYS.byProject(projectId ?? ''),
    queryFn: () => fetchProjectMembers(projectId!),
    enabled: !!projectId,
    staleTime: 20_000,
  })
}

export function useAddProjectMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, profileId }: { projectId: string; profileId: string }) =>
      addProjectMember(projectId, profileId),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: PROJECT_MEMBER_KEYS.byProject(v.projectId) })
      qc.invalidateQueries({ queryKey: PROJECT_KEYS.detail(v.projectId) })
      qc.invalidateQueries({ queryKey: PROJECT_KEYS.all })
    },
  })
}

export function useRemoveProjectMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, profileId }: { projectId: string; profileId: string }) =>
      removeProjectMember(projectId, profileId),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: PROJECT_MEMBER_KEYS.byProject(v.projectId) })
      qc.invalidateQueries({ queryKey: PROJECT_KEYS.detail(v.projectId) })
      qc.invalidateQueries({ queryKey: PROJECT_KEYS.all })
    },
  })
}
