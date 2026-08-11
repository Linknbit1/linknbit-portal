import { useQueryClient, useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { useCallback } from 'react'
import { fetchAuditLog, fetchAuditNewCount, getAuditLastSeen, markAuditSeen, fetchTaskActivity } from '../api/auditLog'
import type { AuditLogFilters } from '../types'
import { useAuthContext } from '../context/AuthContext'
import { useFeatureAccess } from './useRoleFlags'

export const AUDIT_KEYS = {
  all: ['audit_log'] as const,
  list: (filters: AuditLogFilters) => ['audit_log', 'list', filters] as const,
  newCount: ['audit_log', 'new_count'] as const,
  task: (taskId: string) => ['audit_log', 'task', taskId] as const,
}

/**
 * The audit trail, filtered and paged newest-first. Only runs for users who pass
 * can_view_audit_log.
 *
 * The exact match count rides on the first page, so once it is known the "load
 * more" affordance is driven by rows-loaded vs total rather than by guessing
 * from a full page — no trailing empty fetch when the total lands on a page
 * boundary. `hasMore` is the fallback for the (unexpected) case of no count.
 */
export function useAuditLog(filters: AuditLogFilters) {
  const { accessToken } = useAuthContext()
  const { allowed } = useFeatureAccess('can_view_audit_log')
  return useInfiniteQuery({
    queryKey: AUDIT_KEYS.list(filters),
    queryFn: ({ pageParam }) => fetchAuditLog(filters, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const total = allPages[0]?.total
      if (total === null || total === undefined) return lastPage.hasMore ? allPages.length : undefined
      const loaded = allPages.reduce((n, p) => n + p.rows.length, 0)
      return loaded < total ? allPages.length : undefined
    },
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
