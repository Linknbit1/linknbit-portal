import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchClients, fetchClient, createClient, updateClient, deleteClient,
} from '../api/clients'
import type { TablesInsert, TablesUpdate } from '../types/database'

export const CLIENT_KEYS = {
  all: ['clients'] as const,
  detail: (id: string) => ['clients', id] as const,
}

export function useClients() {
  return useQuery({ queryKey: CLIENT_KEYS.all, queryFn: fetchClients, staleTime: 30_000 })
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: CLIENT_KEYS.detail(id ?? ''),
    queryFn: () => fetchClient(id!),
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useCreateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: TablesInsert<'clients'>) => createClient(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: CLIENT_KEYS.all }),
  })
}

export function useUpdateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: TablesUpdate<'clients'> }) => updateClient(id, updates),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: CLIENT_KEYS.all })
      qc.invalidateQueries({ queryKey: CLIENT_KEYS.detail(v.id) })
    },
  })
}

export function useDeleteClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteClient(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: CLIENT_KEYS.all }),
  })
}
