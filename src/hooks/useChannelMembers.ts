import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchChannelMembers, addChannelMembers, removeChannelMember, leaveChannel, setChannelMuted,
} from '../api/channelMembers'
import { CHANNEL_KEYS } from './useChannels'

export const CHANNEL_MEMBER_KEYS = {
  byChannel: (channelId: string) => ['channel-members', channelId] as const,
}

export function useChannelMembers(channelId: string | undefined) {
  return useQuery({
    queryKey: CHANNEL_MEMBER_KEYS.byChannel(channelId ?? ''),
    queryFn: () => fetchChannelMembers(channelId!),
    enabled: !!channelId,
    staleTime: 30_000,
  })
}

export function useAddChannelMembers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ channelId, profileIds }: { channelId: string; profileIds: string[] }) =>
      addChannelMembers(channelId, profileIds),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: CHANNEL_MEMBER_KEYS.byChannel(v.channelId) })
      qc.invalidateQueries({ queryKey: CHANNEL_KEYS.all })
    },
  })
}

export function useRemoveChannelMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ channelId, profileId }: { channelId: string; profileId: string }) =>
      removeChannelMember(channelId, profileId),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: CHANNEL_MEMBER_KEYS.byChannel(v.channelId) })
      qc.invalidateQueries({ queryKey: CHANNEL_KEYS.all })
    },
  })
}

export function useLeaveChannel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (channelId: string) => leaveChannel(channelId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: CHANNEL_KEYS.all }) },
  })
}

export function useSetChannelMuted() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ channelId, muted }: { channelId: string; muted: boolean }) =>
      setChannelMuted(channelId, muted),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: CHANNEL_MEMBER_KEYS.byChannel(v.channelId) })
    },
  })
}
