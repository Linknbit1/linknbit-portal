import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchParticipationModules, fetchParticipationOverrides, fetchParticipationRoleDefaults,
  setParticipationOverride, setParticipationRoleDefault,
} from '../api/participation'

export const PARTICIPATION_KEYS = {
  modules:   ['participation', 'modules'] as const,
  defaults:  ['participation', 'defaults'] as const,
  overrides: ['participation', 'overrides'] as const,
}

export function useParticipationModules() {
  return useQuery({
    queryKey: PARTICIPATION_KEYS.modules,
    queryFn: fetchParticipationModules,
    // A fixed catalogue: it changes when a module is added, which is a deploy.
    staleTime: 60 * 60 * 1000,
  })
}

export function useParticipationRoleDefaults() {
  return useQuery({ queryKey: PARTICIPATION_KEYS.defaults, queryFn: fetchParticipationRoleDefaults })
}

export function useParticipationOverrides() {
  return useQuery({ queryKey: PARTICIPATION_KEYS.overrides, queryFn: fetchParticipationOverrides })
}

/**
 * Changing participation moves the legacy attendance and standup settings too,
 * through a database trigger, so the screens reading those have to be dropped
 * as well as this one.
 */
function invalidateParticipation(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: PARTICIPATION_KEYS.defaults })
  qc.invalidateQueries({ queryKey: PARTICIPATION_KEYS.overrides })
  qc.invalidateQueries({ queryKey: ['people'] })
  qc.invalidateQueries({ queryKey: ['standup'] })
  qc.invalidateQueries({ queryKey: ['attendance'] })
}

export function useSetParticipationOverride() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ moduleKey, profileId, isRequired, note }: {
      moduleKey: string; profileId: string; isRequired: boolean | null; note?: string
    }) => setParticipationOverride(moduleKey, profileId, isRequired, note),
    onSuccess: () => invalidateParticipation(qc),
  })
}

export function useSetParticipationRoleDefault() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ moduleKey, role, isRequired }: { moduleKey: string; role: string; isRequired: boolean }) =>
      setParticipationRoleDefault(moduleKey, role, isRequired),
    onSuccess: () => invalidateParticipation(qc),
  })
}
