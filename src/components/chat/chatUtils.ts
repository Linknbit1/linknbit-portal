import { extractMentionIds, fromDbDoc } from '../../lib/richText'
import type { Json } from '../../types/database'
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

/**
 * Was this message aimed at me?
 *
 * True when it tags me by name, tags a team I am on, or carries an @everyone.
 * Read straight out of the stored doc rather than from a flag on the row: the
 * mention ids are already in the body, and a denormalised "mentions" column
 * would be one more thing to keep true.
 */
export function mentionsMe(
  message: { body_doc: Json | null; author_id: string | null },
  myMentionIds: ReadonlySet<string>,
): boolean {
  // Your own message tagging your own team is not a message aimed at you.
  if (message.author_id && myMentionIds.has(message.author_id)) return false
  return extractMentionIds(fromDbDoc(message.body_doc)).some((id) => myMentionIds.has(id))
}
