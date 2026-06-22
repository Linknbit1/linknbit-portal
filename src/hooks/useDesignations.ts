import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchDesignations, createDesignation, updateDesignation, deleteDesignation, fetchDesignationUsage,
} from '../api/designations'

export const DESIGNATION_KEYS = {
  all: ['designations'] as const,
  usage: (id: string) => ['designations', 'usage', id] as const,
}

export function useDesignations() {
  return useQuery({ queryKey: DESIGNATION_KEYS.all, queryFn: fetchDesignations, staleTime: 5 * 60_000 })
}

export function useDesignationUsage(id: string, enabled: boolean) {
  return useQuery({
    queryKey: DESIGNATION_KEYS.usage(id),
    queryFn: () => fetchDesignationUsage(id),
    enabled,
  })
}

export function useCreateDesignation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string }) => createDesignation(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: DESIGNATION_KEYS.all }),
  })
}

export function useUpdateDesignation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { name?: string; is_active?: boolean } }) =>
      updateDesignation(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: DESIGNATION_KEYS.all }),
  })
}

export function useDeleteDesignation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteDesignation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: DESIGNATION_KEYS.all }),
  })
}
