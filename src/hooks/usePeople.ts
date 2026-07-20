import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchPeople, inviteUser, updatePersonRole, updatePersonDetails, uploadPersonAvatar, setPersonActive, deletePerson,
  resendInvite, setUserPassword, fetchSalary, upsertSalary,
  fetchPerson, fetchPersonTeams, fetchPersonProjects,
  type InvitePayload,
} from '../api/people'

export const PEOPLE_KEYS = {
  all: ['people'] as const,
  person: (id: string) => ['people', 'person', id] as const,
  personTeams: (id: string) => ['people', 'person', id, 'teams'] as const,
  personProjects: (id: string) => ['people', 'person', id, 'projects'] as const,
  salary: (profileId: string) => ['salary', profileId] as const,
}

export function usePeople() {
  return useQuery({ queryKey: PEOPLE_KEYS.all, queryFn: fetchPeople, staleTime: 30_000 })
}

export function usePerson(id: string | undefined) {
  return useQuery({
    queryKey: PEOPLE_KEYS.person(id ?? ''),
    queryFn: () => fetchPerson(id ?? ''),
    enabled: !!id,
  })
}

export function usePersonTeams(id: string | undefined) {
  return useQuery({
    queryKey: PEOPLE_KEYS.personTeams(id ?? ''),
    queryFn: () => fetchPersonTeams(id ?? ''),
    enabled: !!id,
  })
}

export function usePersonProjects(id: string | undefined) {
  return useQuery({
    queryKey: PEOPLE_KEYS.personProjects(id ?? ''),
    queryFn: () => fetchPersonProjects(id ?? ''),
    enabled: !!id,
  })
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
    mutationFn: ({ profileId, role, designationId, jobType, allowedCheckIn, attendanceExcluded }: { profileId: string; role: string; designationId: string | null; jobType: string; allowedCheckIn: string; attendanceExcluded: boolean }) =>
      updatePersonRole(profileId, role, designationId, jobType, allowedCheckIn, attendanceExcluded),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PEOPLE_KEYS.all })
      qc.invalidateQueries({ queryKey: ['teams'] })
    },
  })
}

export function useUpdatePersonDetails() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ profileId, name, avatarUrl, avatarFile }: { profileId: string; name: string; avatarUrl: string | null; avatarFile?: File | null }) => {
      const nextAvatarUrl = avatarFile ? await uploadPersonAvatar(profileId, avatarFile) : avatarUrl
      return updatePersonDetails(profileId, name, nextAvatarUrl)
    },
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

export function useDeletePerson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ profileId }: { profileId: string }) => deletePerson(profileId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PEOPLE_KEYS.all })
      qc.invalidateQueries({ queryKey: ['teams'] })
    },
  })
}

export function useResendInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ profileId }: { profileId: string }) => resendInvite(profileId),
    onSuccess: () => qc.invalidateQueries({ queryKey: PEOPLE_KEYS.all }),
  })
}

export function useSetUserPassword() {
  return useMutation({
    mutationFn: ({ profileId, password }: { profileId: string; password: string }) =>
      setUserPassword(profileId, password),
  })
}

export function useSalary(profileId: string | undefined) {
  return useQuery({
    queryKey: PEOPLE_KEYS.salary(profileId ?? ''),
    queryFn: () => fetchSalary(profileId!),
    enabled: !!profileId,
    staleTime: 30_000,
  })
}

export function useUpsertSalary() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ profileId, amount, currency }: { profileId: string; amount: number; currency: string }) =>
      upsertSalary(profileId, amount, currency),
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: PEOPLE_KEYS.salary(v.profileId) }),
  })
}
