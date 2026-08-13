import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchStatusLabels, saveStatusLabel, resetStatusLabel,
  type StatusLabelPatch, type StatusScope,
} from '../api/statusLabels'

export const STATUS_LABEL_KEYS = {
  all: ['status-labels'] as const,
}

/**
 * Status name/colour overrides. Every chip on every screen reads this, so it is
 * cached hard: the set changes only when an admin edits it in Settings, and the
 * mutations below invalidate it when they do.
 */
export function useStatusLabels() {
  return useQuery({
    queryKey: STATUS_LABEL_KEYS.all,
    queryFn: fetchStatusLabels,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  })
}

export interface StatusMeta {
  label: string
  color: string
}

/**
 * Looks up one scope's overrides as a plain map, so callers can merge them over
 * their built-in defaults without caring how they are stored.
 */
export function useStatusOverrides(scope: StatusScope): Record<string, StatusMeta> {
  const { data = [] } = useStatusLabels()
  const out: Record<string, StatusMeta> = {}
  for (const row of data) {
    if (row.scope === scope) out[row.key] = { label: row.label, color: row.color }
  }
  return out
}

export function useSaveStatusLabel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: StatusLabelPatch) => saveStatusLabel(patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: STATUS_LABEL_KEYS.all }),
  })
}

export function useResetStatusLabel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ scope, key }: { scope: StatusScope; key: string }) => resetStatusLabel(scope, key),
    onSuccess: () => qc.invalidateQueries({ queryKey: STATUS_LABEL_KEYS.all }),
  })
}
