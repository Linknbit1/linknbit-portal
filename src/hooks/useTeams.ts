import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchTeams, createTeam, updateTeam } from '../api/teams'
import type { TeamInsert, TeamUpdate } from '../api/teams'

export const TEAM_KEYS = {
  all: ['teams'] as const,
}

export function useTeams() {
  return useQuery({
    queryKey: TEAM_KEYS.all,
    queryFn: fetchTeams,
  })
}

export function useCreateTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: TeamInsert) => createTeam(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: TEAM_KEYS.all }),
  })
}

export function useUpdateTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TeamUpdate }) =>
      updateTeam(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: TEAM_KEYS.all }),
  })
}
