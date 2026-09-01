import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchChannelReactions, toggleReaction, type ReactionWithProfile } from '../api/messageReactions'

export const REACTION_KEYS = {
  byChannel: (channelId: string) => ['message-reactions', channelId] as const,
}

export function useChannelReactions(channelId: string | undefined) {
  return useQuery({
    queryKey: REACTION_KEYS.byChannel(channelId ?? ''),
    queryFn: () => fetchChannelReactions(channelId!),
    enabled: !!channelId,
    staleTime: 10_000,
  })
}

export function useToggleReaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string; channelId: string }) =>
      toggleReaction(messageId, emoji),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: REACTION_KEYS.byChannel(v.channelId) })
    },
  })
}

export interface ReactionPerson {
  id: string
  name: string
  avatarUrl: string | null
}

export interface ReactionGroup {
  emoji: string
  count: number
  /** Everyone who picked this one, in the order they did. */
  people: ReactionPerson[]
  mine: boolean
}

/** Groups a message's reactions into the pills shown under the bubble. */
export function groupReactions(
  reactions: ReactionWithProfile[],
  messageId: string,
  myProfileId: string | undefined,
): ReactionGroup[] {
  const byEmoji = new Map<string, ReactionGroup>()
  for (const r of reactions) {
    if (r.message_id !== messageId) continue
    const group = byEmoji.get(r.emoji) ?? { emoji: r.emoji, count: 0, people: [], mine: false }
    group.count += 1
    if (r.profile) {
      group.people.push({ id: r.profile.id, name: r.profile.name, avatarUrl: r.profile.avatar_url })
    }
    if (r.profile_id === myProfileId) group.mine = true
    byEmoji.set(r.emoji, group)
  }
  return [...byEmoji.values()].sort((a, b) => b.count - a.count)
}
