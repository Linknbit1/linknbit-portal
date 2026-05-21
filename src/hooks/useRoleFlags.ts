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

export function useCanAccess(featureKey: string): boolean {
  const { profile } = useAuthContext()
  const { data: flags } = useRoleFlags()
  if (!profile || !flags) return false
  const flag = flags.find((f) => f.role === profile.role && f.feature_key === featureKey)
  return flag?.enabled ?? false
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
