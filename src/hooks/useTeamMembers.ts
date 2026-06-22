import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchTeamMembers, addTeamMember, removeTeamMember, setProfileTeams,
} from '../api/teamMembers'

export const TEAM_MEMBER_KEYS = {
  all: ['team_members'] as const,
}

export function useTeamMembers() {
  return useQuery({ queryKey: TEAM_MEMBER_KEYS.all, queryFn: fetchTeamMembers, staleTime: 30_000 })
}

export function useAddTeamMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ teamId, profileId }: { teamId: string; profileId: string }) =>
      addTeamMember(teamId, profileId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TEAM_MEMBER_KEYS.all })
      qc.invalidateQueries({ queryKey: ['people'] })
    },
  })
}

export function useRemoveTeamMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ teamId, profileId }: { teamId: string; profileId: string }) =>
      removeTeamMember(teamId, profileId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TEAM_MEMBER_KEYS.all })
      qc.invalidateQueries({ queryKey: ['people'] })
    },
  })
}

export function useSetProfileTeams() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ profileId, teamIds }: { profileId: string; teamIds: string[] }) =>
      setProfileTeams(profileId, teamIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TEAM_MEMBER_KEYS.all })
      qc.invalidateQueries({ queryKey: ['people'] })
    },
  })
}
