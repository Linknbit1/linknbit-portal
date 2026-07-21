import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchRoleFlags, updateRoleFlag, type RoleFeatureFlagRow } from '../api/roleFlags'
import { useAuthContext } from '../context/AuthContext'

export const ROLE_FLAG_KEYS = {
  all: ['role_feature_flags'] as const,
}

export function useRoleFlags() {
  const { accessToken } = useAuthContext()
  return useQuery({
    queryKey: ROLE_FLAG_KEYS.all,
    queryFn: fetchRoleFlags,
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Capability check for the signed-in user. Mirrors the SQL `has_feature()` helper,
 * including its `super_admin` short-circuit, so UI and RLS never disagree.
 *
 * Returns false while flags are still loading — fine for hiding a button, but NOT
 * for gating navigation or a route (that would flash/redirect). Use
 * `useFeatureAccess` there so you can wait on `isLoading`.
 */
export function useCanAccess(featureKey: string): boolean {
  return useFeatureAccess(featureKey).allowed
}

export interface FeatureAccess {
  allowed: boolean
  /** True until the flag matrix has loaded. Guards should render a spinner, not redirect. */
  isLoading: boolean
}

export function useFeatureAccess(featureKey: string): FeatureAccess {
  const { profile } = useAuthContext()
  const { data: flags, isLoading } = useRoleFlags()

  if (profile?.role === 'super_admin') return { allowed: true, isLoading: false }
  if (!profile || !flags) return { allowed: false, isLoading }

  const flag = flags.find((f) => f.role === profile.role && f.feature_key === featureKey)
  return { allowed: flag?.enabled ?? false, isLoading: false }
}

// ── Named capability hooks ────────────────────────────────────────────────────
// These replace the hardcoded role arrays that used to live in src/lib/*Access.ts.
// Each mirrors the SQL helper of the same name, so UI and RLS agree by construction.

export const useCanManagePeople = () => useCanAccess('can_manage_people')
export const useCanManageClients = () => useCanAccess('can_manage_clients')
export const useCanManageAttendance = () => useCanAccess('can_manage_attendance')
export const useCanApproveRequests = () => useCanAccess('can_approve_requests')
export const useCanApproveTasks = () => useCanAccess('can_approve_tasks')
export const useCanDeleteProjects = () => useCanAccess('can_delete_projects')
export const useCanGovernGamification = () => useCanAccess('can_govern_gamification')
export const useCanRecognize = () => useCanAccess('can_recognize')

/** Finance may mark cash payouts fulfilled, in addition to gamification governors. */
export function useCanFulfillPayouts(): boolean {
  const { profile } = useAuthContext()
  const governs = useCanGovernGamification()
  return governs || profile?.role === 'finance'
}

export function useUpdateRoleFlag() {
  const queryClient = useQueryClient()
  const { profile } = useAuthContext()
  return useMutation({
    mutationFn: ({ role, featureKey, enabled }: { role: string; featureKey: string; enabled: boolean }) =>
      updateRoleFlag(role, featureKey, enabled, profile?.id ?? ''),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ROLE_FLAG_KEYS.all })
      const prev = queryClient.getQueryData(ROLE_FLAG_KEYS.all)
      queryClient.setQueryData(
        ROLE_FLAG_KEYS.all,
        (old: RoleFeatureFlagRow[] | undefined) =>
          old?.map((f) =>
            f.role === variables.role && f.feature_key === variables.featureKey
              ? { ...f, enabled: variables.enabled }
              : f,
          ) ?? [],
      )
      return { prev }
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(ROLE_FLAG_KEYS.all, context.prev)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ROLE_FLAG_KEYS.all })
    },
  })
}
