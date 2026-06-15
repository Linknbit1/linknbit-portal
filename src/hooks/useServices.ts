import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchServices, createService, updateService, deleteService, fetchServiceUsage,
} from '../api/services'

export const SERVICE_KEYS = {
  all: ['services'] as const,
  usage: (slug: string) => ['services', 'usage', slug] as const,
}

export function useServices() {
  return useQuery({ queryKey: SERVICE_KEYS.all, queryFn: fetchServices, staleTime: 5 * 60_000 })
}

export function useServiceUsage(slug: string, enabled: boolean) {
  return useQuery({
    queryKey: SERVICE_KEYS.usage(slug),
    queryFn: () => fetchServiceUsage(slug),
    enabled,
  })
}

export function useCreateService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string; color: string }) => createService(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: SERVICE_KEYS.all }),
  })
}

export function useUpdateService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { name?: string; color?: string; is_active?: boolean } }) =>
      updateService(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: SERVICE_KEYS.all }),
  })
}

export function useDeleteService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteService(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: SERVICE_KEYS.all }),
  })
}
