import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchChannels, fetchChannel, createChannel, createDM, updateChannel, deleteChannel, hideChannel,
  type CreateChannelArgs, setChannelPostPolicy, setChannelManager,
} from '../api/channels'
import { CHAT_UNREAD_KEYS } from './useChatUnreadCount'
import { CHANNEL_MEMBER_KEYS } from './useChannelMembers'

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

export function useHideChannel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (channelId: string) => hideChannel(channelId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CHANNEL_KEYS.all })
      qc.invalidateQueries({ queryKey: CHAT_UNREAD_KEYS.all })
    },
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

/** Who may post. Invalidates the channel so the composer locks or unlocks. */
export function useSetChannelPostPolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ channelId, policy }: { channelId: string; policy: 'everyone' | 'managers' }) =>
      setChannelPostPolicy(channelId, policy),
    onSuccess: () => qc.invalidateQueries({ queryKey: CHANNEL_KEYS.all }),
  })
}

/** Grants or removes the right to change a channel. */
export function useSetChannelManager() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ channelId, profileId, canManage }: {
      channelId: string; profileId: string; canManage: boolean
    }) => setChannelManager(channelId, profileId, canManage),
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: CHANNEL_KEYS.all })
      qc.invalidateQueries({ queryKey: CHANNEL_MEMBER_KEYS.byChannel(v.channelId) })
    },
  })
}
