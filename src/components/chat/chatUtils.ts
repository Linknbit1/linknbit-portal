import type { ChannelListItem } from '../../api/channels'
import type { PersonMini } from '../../api/projects'

/** DMs have no stored name — they're labelled by whoever the other person is. */
export function channelTitle(channel: ChannelListItem, myProfileId: string | undefined): string {
  if (channel.kind === 'channel') return channel.name ?? 'Untitled channel'
  const others = channel.members.filter((m) => m.id !== myProfileId)
  if (channel.kind === 'group_dm') {
    return channel.name ?? (others.length > 0 ? others.map((m) => m.name).join(', ') : 'Group')
  }
  return others[0]?.name ?? 'Direct message'
}

/** The person a DM row should show an avatar for. */
export function dmCounterpart(channel: ChannelListItem, myProfileId: string | undefined): PersonMini | null {
  if (channel.kind === 'channel') return null
  return channel.members.find((m) => m.id !== myProfileId) ?? null
}

/**
 * Consecutive messages from the same author inside this window render as one
 * visual group (avatar + name shown once), the Slack/Discord convention.
 */
export const GROUPING_WINDOW_MS = 5 * 60 * 1000

export function startsNewGroup(
  current: { author_id: string | null; created_at: string },
  previous: { author_id: string | null; created_at: string } | undefined,
): boolean {
  if (!previous) return true
  if (previous.author_id !== current.author_id) return true
  return new Date(current.created_at).getTime() - new Date(previous.created_at).getTime() > GROUPING_WINDOW_MS
}

export function isOptimistic(id: string): boolean {
  return id.startsWith('optimistic-')
}
