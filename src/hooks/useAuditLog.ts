import { useQuery } from '@tanstack/react-query'
import { fetchAuditLog, fetchAuditDangerCount, fetchTaskActivity } from '../api/auditLog'
import type { AuditLogFilters } from '../types'
import { useAuthContext } from '../context/AuthContext'
import { useFeatureAccess } from './useRoleFlags'

export const AUDIT_KEYS = {
  all: ['audit_log'] as const,
  list: (filters: AuditLogFilters) => ['audit_log', 'list', filters] as const,
  dangerCount: ['audit_log', 'danger_count'] as const,
  task: (taskId: string) => ['audit_log', 'task', taskId] as const,
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

/** Activity for a single task — visible to anyone who can open that task. */
export function useTaskActivity(taskId: string | undefined) {
  const { accessToken } = useAuthContext()
  return useQuery({
    queryKey: AUDIT_KEYS.task(taskId ?? ''),
    queryFn: () => fetchTaskActivity(taskId!),
    enabled: !!accessToken && !!taskId,
    staleTime: 15_000,
  })
}
