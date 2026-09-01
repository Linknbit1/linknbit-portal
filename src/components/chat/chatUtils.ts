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

/**
 * How far a message of your own has got.
 *
 * Four states, so a message never jumps straight from nothing to read:
 *
 *   sending  still in flight, no row on the server yet
 *   sent     the server has it and nobody has caught up
 *   partial  some of a channel has read it
 *   all      the whole audience has
 *
 * A direct message has an audience of one, so it steps sending → sent → all.
 * The middle `partial` only ever appears in a group, where "three of eight have
 * read this" is real information rather than a hedge.
 *
 * Shared by the message ticks and the conversation list so the two surfaces
 * can never disagree about what a tick means.
 */
export type ReceiptState = 'sending' | 'sent' | 'partial' | 'all'

export function receiptState(seen: number, audience: number, pending = false): ReceiptState {
  if (pending) return 'sending'
  if (seen === 0) return 'sent'
  return audience > 0 && seen >= audience ? 'all' : 'partial'
}

/**
 * What a tick says on hover. Names are given when we have them — the list rows
 * only know how many people have read, not which.
 */
export function receiptLabel(state: ReceiptState, audience: number, readerNames?: string[]): string {
  if (state === 'sending') return 'Sending'
  if (state === 'sent') return 'Sent'

  const names = readerNames?.join(', ')
  if (state === 'all') {
    return audience === 1 && names ? `Read by ${names}` : 'Read by everyone'
  }
  const count = readerNames?.length ?? 0
  return names ? `Read by ${names} (${count} of ${audience})` : `Read by ${count} of ${audience}`
}

/** Midnight of the day an ISO timestamp falls on, in the reader's timezone. */
function startOfDay(iso: string): number {
  const d = new Date(iso)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** Do two messages belong to the same calendar day? Drives the date dividers. */
export function isSameDay(a: string, b: string): boolean {
  return startOfDay(a) === startOfDay(b)
}

/**
 * The label on a date divider: "Today", "Yesterday", a weekday within the last
 * week, then the date itself, carrying a year only once it isn't this one.
 *
 * This is where the date belongs. Stamping it onto every message repeats what
 * the run of messages above already established, and the eye has to read each
 * one to find where a day starts — which is why both WhatsApp and Discord say
 * it once, between the days.
 */
export function dayLabel(iso: string): string {
  const day = startOfDay(iso)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const daysApart = Math.round((today - day) / 86_400_000)

  if (daysApart === 0) return 'Today'
  if (daysApart === 1) return 'Yesterday'

  const date = new Date(iso)
  if (daysApart > 1 && daysApart < 7) return date.toLocaleDateString([], { weekday: 'long' })

  return date.toLocaleDateString([], {
    day: 'numeric',
    month: 'long',
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
  })
}
