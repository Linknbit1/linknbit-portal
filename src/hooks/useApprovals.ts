import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchApprovals, requestApproval, reviewApproval,
  type ApprovalFilters, type ApprovalStatus,
} from '../api/approvals'
import { PROJECT_KEYS } from './useProjects'
import { STAGE_KEYS } from './useStages'
import type { TablesInsert } from '../types/database'

export const APPROVAL_KEYS = {
  all: ['approvals'] as const,
  list: (filters: ApprovalFilters) => ['approvals', 'list', filters] as const,
}

export function useApprovals(filters: ApprovalFilters = {}) {
  return useQuery({
    queryKey: APPROVAL_KEYS.list(filters),
    queryFn: () => fetchApprovals(filters),
    staleTime: 15_000,
  })
}

export function useRequestApproval() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: TablesInsert<'approvals'>) => requestApproval(payload),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: APPROVAL_KEYS.all })
      qc.invalidateQueries({ queryKey: STAGE_KEYS.byProject(row.project_id) })
    },
  })
}

export function useReviewApproval() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, message }: { id: string; status: ApprovalStatus; message?: string; projectId?: string }) =>
      reviewApproval(id, status, message),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: APPROVAL_KEYS.all })
      qc.invalidateQueries({ queryKey: STAGE_KEYS.byProject(row.project_id) })
      qc.invalidateQueries({ queryKey: PROJECT_KEYS.detail(row.project_id) })
    },
  })
}
