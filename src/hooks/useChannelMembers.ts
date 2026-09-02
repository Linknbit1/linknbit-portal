import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchChannelMembers, addChannelMembers, removeChannelMember, leaveChannel, setChannelMuted,
} from '../api/channelMembers'
import { CHANNEL_KEYS } from './useChannels'

export const CHANNEL_MEMBER_KEYS = {
  byChannel: (channelId: string) => ['channel-members', channelId] as const,
}

/**
 * `live` is for the open conversation, where these rows are not a roster but a
 * set of read receipts: every member's `last_read_at` lives here, and it is what
 * turns the sender's ticks. Realtime already invalidates them, but a receipt
 * that silently misses its event reads as "the ticks are broken", so the open
 * thread also refreshes on a slow interval as a floor. Paused in a background
 * tab — nobody is looking at ticks they cannot see.
 */
export function useChannelMembers(channelId: string | undefined, options?: { live?: boolean }) {
  const live = options?.live ?? false
  return useQuery({
    queryKey: CHANNEL_MEMBER_KEYS.byChannel(channelId ?? ''),
    queryFn: () => fetchChannelMembers(channelId!),
    enabled: !!channelId,
    staleTime: live ? 5_000 : 30_000,
    refetchInterval: live ? 20_000 : false,
    refetchIntervalInBackground: false,
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
