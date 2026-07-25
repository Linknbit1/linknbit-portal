import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchChannels, fetchChannel, createChannel, createDM, updateChannel, deleteChannel,
  type CreateChannelArgs,
} from '../api/channels'

export const CHANNEL_KEYS = {
  all: ['channels'] as const,
  byId: (id: string) => ['channels', id] as const,
}

export function useChannels() {
  return useQuery({
    queryKey: CHANNEL_KEYS.all,
    queryFn: fetchChannels,
    staleTime: 10_000,
  })
}

export function useChannel(id: string | undefined) {
  return useQuery({
    queryKey: CHANNEL_KEYS.byId(id ?? ''),
    queryFn: () => fetchChannel(id!),
    enabled: !!id,
    staleTime: 10_000,
  })
}

export function useCreateChannel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: CreateChannelArgs) => createChannel(args),
    onSuccess: () => { qc.invalidateQueries({ queryKey: CHANNEL_KEYS.all }) },
  })
}

export function useCreateDM() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (otherProfileId: string) => createDM(otherProfileId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: CHANNEL_KEYS.all }) },
  })
}

export function useUpdateChannel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { name?: string | null; description?: string | null; is_archived?: boolean } }) =>
      updateChannel(id, patch),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: CHANNEL_KEYS.all })
      qc.invalidateQueries({ queryKey: CHANNEL_KEYS.byId(v.id) })
    },
  })
}

export function useDeleteChannel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteChannel(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: CHANNEL_KEYS.all }) },
  })
}
