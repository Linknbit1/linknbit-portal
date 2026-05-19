import { useQuery } from '@tanstack/react-query'
import { fetchRoleFlags } from '../api/roleFlags'
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
