import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchPeople, inviteUser, updatePersonRole, updatePersonDetails, uploadPersonAvatar, setPersonActive, deletePerson,
  resendInvite, setUserPassword, fetchSalary, upsertSalary,
  fetchPerson, fetchPersonTeams, fetchPersonProjects,
  type InvitePayload, type RoleUpdatePayload,
} from '../api/people'

export const PEOPLE_KEYS = {
  all: ['people'] as const,
  person: (id: string) => ['people', 'person', id] as const,
  personTeams: (id: string) => ['people', 'person', id, 'teams'] as const,
  personProjects: (id: string) => ['people', 'person', id, 'projects'] as const,
  salary: (profileId: string) => ['salary', profileId] as const,
}

/**
 * Everyone still with the company. Deactivated people have left, so they must not
 * turn up in a picker, a roster, a filter dropdown or an @-mention anywhere.
 *
 * Filtering here rather than in `fetchPeople` keeps it to one choke point for the
 * ~15 callers while `useAllPeople` still reads the same cache entry — `select`
 * transforms the result per-hook without a second request.
 */
export function usePeople() {
  return useQuery({
    queryKey: PEOPLE_KEYS.all,
    queryFn: fetchPeople,
    staleTime: 5 * 60 * 1000,
    select: (people) => people.filter((p) => p.is_active),
  })
}

/**
 * Active AND departed. Only for the two places that must show people who have
 * left: the People page's Inactive tab, and the audit log's actor filter (you
 * still need to investigate what someone did before they left).
 */
export function useAllPeople() {
  return useQuery({ queryKey: PEOPLE_KEYS.all, queryFn: fetchPeople, staleTime: 5 * 60 * 1000 })
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
    mutationFn: (payload: RoleUpdatePayload) => updatePersonRole(payload),
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
    staleTime: 5 * 60 * 1000,
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
