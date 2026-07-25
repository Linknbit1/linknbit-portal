import { useQuery } from '@tanstack/react-query'
import { fetchAuditLog, fetchAuditDangerCount } from '../api/auditLog'
import type { AuditLogFilters } from '../types'
import { useAuthContext } from '../context/AuthContext'
import { useFeatureAccess } from './useRoleFlags'

export const AUDIT_KEYS = {
  all: ['audit_log'] as const,
  list: (filters: AuditLogFilters) => ['audit_log', 'list', filters] as const,
  dangerCount: ['audit_log', 'danger_count'] as const,
}

/** The audit trail, filtered. Only runs for users who pass can_view_audit_log. */
export function useAuditLog(filters: AuditLogFilters) {
  const { accessToken } = useAuthContext()
  const { allowed } = useFeatureAccess('can_view_audit_log')
  return useQuery({
    queryKey: AUDIT_KEYS.list(filters),
    queryFn: () => fetchAuditLog(filters),
    enabled: !!accessToken && allowed,
    staleTime: 15_000,
  })
}

/** Recent danger count for the sidebar badge. */
export function useAuditDangerCount() {
  const { accessToken } = useAuthContext()
  const { allowed } = useFeatureAccess('can_view_audit_log')
  return useQuery({
    queryKey: AUDIT_KEYS.dangerCount,
    queryFn: fetchAuditDangerCount,
    enabled: !!accessToken && allowed,
    staleTime: 15_000,
  })
}
