import type { NotificationRow } from '../api/notifications'

/**
 * Types worth collapsing. Chat is the noisy one: five messages from one person
 * arrive as five rows, which buries everything else in the list.
 *
 * Deliberately narrow — a task assignment or an approval is a single event that
 * should never be folded into a count.
 */
const GROUPED_TYPES = new Set(['chat_message', 'chat_mention'])

/** A list row: either one notification, or a run of related ones shown as a count. */
export interface NotificationGroup {
  /** Stable React key. */
  key: string
  /** Newest member — supplies the icon, link, body preview and timestamp. */
  latest: NotificationRow
  /** Every id in the group, so opening it can clear them all in one write. */
  ids: string[]
  count: number
  unreadCount: number
}

/**
 * Collapses related notifications into one row each, anchored at the position of
 * the newest member so the timeline order is preserved.
 *
 * Grouping key is type + resource + title. Title already carries the sender and
 * the room ("Yahya Khan", "Yahya Khan in #general"), so this naturally separates
 * per-person and per-channel runs without needing an actor column.
 */
export function groupNotifications(rows: NotificationRow[]): NotificationGroup[] {
  const groups: NotificationGroup[] = []
  const byKey = new Map<string, NotificationGroup>()

  for (const row of rows) {
    // Ungrouped types get a unique key so they always stand alone.
    const key = GROUPED_TYPES.has(row.type)
      ? `${row.type}|${row.resource_type ?? ''}|${row.resource_id ?? ''}|${row.title}`
      : `single|${row.id}`

    const existing = byKey.get(key)
    if (existing) {
      existing.ids.push(row.id)
      existing.count += 1
      if (!row.read) existing.unreadCount += 1
      continue
    }

    const group: NotificationGroup = {
      key,
      latest: row,
      ids: [row.id],
      count: 1,
      unreadCount: row.read ? 0 : 1,
    }
    byKey.set(key, group)
    groups.push(group)
  }

  return groups
}

/** Headline for a group — the plain title until there is more than one to fold. */
export function groupTitle(group: NotificationGroup): string {
  if (group.count === 1) return group.latest.title

  const noun = group.latest.type === 'chat_mention' ? 'mention' : 'message'
  return `${group.count} ${noun}${group.count === 1 ? '' : 's'} from ${group.latest.title}`
}
