import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchChannelRoles, addChannelRole, removeChannelRole } from '../api/channelRoles'
import { CHANNEL_MEMBER_KEYS } from './useChannelMembers'
import { CHANNEL_KEYS } from './useChannels'

export const CHANNEL_ROLE_KEYS = {
  byChannel: (channelId: string) => ['channel-roles', channelId] as const,
}

export function useChannelRoles(channelId: string | undefined) {
  return useQuery({
    queryKey: CHANNEL_ROLE_KEYS.byChannel(channelId ?? ''),
    queryFn: () => fetchChannelRoles(channelId!),
    enabled: !!channelId,
  })
}

/** Granting or revoking a role changes the member list too, so both refresh. */
function useRoleMutation(fn: (channelId: string, role: string) => Promise<void>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ channelId, role }: { channelId: string; role: string }) => fn(channelId, role),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: CHANNEL_ROLE_KEYS.byChannel(v.channelId) })
      qc.invalidateQueries({ queryKey: CHANNEL_MEMBER_KEYS.byChannel(v.channelId) })
      qc.invalidateQueries({ queryKey: CHANNEL_KEYS.all })
    },
  })
}

export function useAddChannelRole() {
  return useRoleMutation(addChannelRole)
}

export function useRemoveChannelRole() {
  return useRoleMutation(removeChannelRole)
}
