import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchPeople, inviteUser, updatePersonRole, updatePersonDetails, setPersonActive,
  type InvitePayload,
} from '../api/people'

export const PEOPLE_KEYS = {
  all: ['people'] as const,
}

export function usePeople() {
  return useQuery({ queryKey: PEOPLE_KEYS.all, queryFn: fetchPeople, staleTime: 30_000 })
}

export function useInviteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: InvitePayload) => inviteUser(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: PEOPLE_KEYS.all }),
  })
}

export function useUpdatePersonRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ profileId, role, teamId, serviceType }: { profileId: string; role: string; teamId: string | null; serviceType: string | null }) =>
      updatePersonRole(profileId, role, teamId, serviceType),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PEOPLE_KEYS.all })
      qc.invalidateQueries({ queryKey: ['teams'] })
    },
  })
}

export function useUpdatePersonDetails() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ profileId, name, avatarUrl }: { profileId: string; name: string; avatarUrl: string | null }) =>
      updatePersonDetails(profileId, name, avatarUrl),
    onSuccess: () => qc.invalidateQueries({ queryKey: PEOPLE_KEYS.all }),
  })
}

export function useSetPersonActive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ profileId, active }: { profileId: string; active: boolean }) =>
      setPersonActive(profileId, active),
    onSuccess: () => qc.invalidateQueries({ queryKey: PEOPLE_KEYS.all }),
  })
}
