import { useQueryClient, useQuery } from '@tanstack/react-query'
import { useCallback } from 'react'
import { fetchAuditLog, fetchAuditNewCount, getAuditLastSeen, markAuditSeen } from '../api/auditLog'
import type { AuditLogFilters } from '../types'
import { useAuthContext } from '../context/AuthContext'
import { useFeatureAccess } from './useRoleFlags'

export const AUDIT_KEYS = {
  all: ['audit_log'] as const,
  list: (filters: AuditLogFilters) => ['audit_log', 'list', filters] as const,
  newCount: ['audit_log', 'new_count'] as const,
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

/** Count of entries since the admin last opened the log — the sidebar badge. */
export function useAuditNewCount() {
  const { accessToken } = useAuthContext()
  const { allowed } = useFeatureAccess('can_view_audit_log')
  return useQuery({
    queryKey: AUDIT_KEYS.newCount,
    queryFn: () => fetchAuditNewCount(getAuditLastSeen()),
    enabled: !!accessToken && allowed,
    staleTime: 15_000,
  })
}

/** Marks everything up to now as seen and resets the badge to zero. */
export function useMarkAuditSeen() {
  const qc = useQueryClient()
  return useCallback(() => {
    markAuditSeen()
    qc.setQueryData(AUDIT_KEYS.newCount, 0)
  }, [qc])
}
