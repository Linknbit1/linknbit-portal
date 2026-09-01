import { useEffect, useMemo, useRef, useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { Skeleton } from '../ui/Skeleton'
import { MessageBubble } from './MessageBubble'
import { startsNewGroup, isOptimistic, mentionsMe, isSameDay, dayLabel } from './chatUtils'
import { groupReactions } from '../../hooks/useMessageReactions'
import type { MessageWithAuthor } from '../../api/messages'
import type { MessageAttachmentRow } from '../../api/messageAttachments'
import type { ReactionWithProfile } from '../../api/messageReactions'

interface MessageListProps {
  messages: MessageWithAuthor[]
  isLoading: boolean
  hasNextPage: boolean
  isFetchingNextPage: boolean
  onLoadOlder: () => void
  canModerate: boolean
  myProfileId: string | undefined
  attachments: MessageAttachmentRow[]
  reactions: ReactionWithProfile[]
  onDelete: (id: string) => void
  onEdit: (message: MessageWithAuthor) => void
  onToggleReaction: (messageId: string, emoji: string) => void
  onReply: (message: MessageWithAuthor) => void
  /** Everyone other than you who has read up to a given message. */
  readersOf: (message: MessageWithAuthor) => { id: string; name: string; avatar_url: string | null }[]
  /** How many people other than you are in the conversation. */
  audienceSize: number
  /** My id, my teams' ids and the @everyone sentinel: what makes a message mine. */
  myMentionIds: ReadonlySet<string>
  /** Name senders above their bubbles — channels and group DMs, not one-to-ones. */
  showAuthor: boolean
}

/**
 * The day a run of messages belongs to, said once between the days rather than
 * stamped onto every message. Pinned, so a long scroll back always names the
 * day you are in.
 *
 * The glass behind it is only worn while it is actually pinned. A divider
 * drifting up through the middle of the thread is just a divider — glazing it
 * there would blur a band across the conversation for no reason, and there is
 * no CSS selector for "stuck", so it is observed.
 */
function DayDivider({ iso, scrollRef }: { iso: string; scrollRef: React.RefObject<HTMLDivElement | null> }) {
  const ref = useRef<HTMLDivElement>(null)
  const [stuck, setStuck] = useState(false)

  useEffect(() => {
    const el = ref.current
    const root = scrollRef.current
    if (!el || !root) return

    // threshold 1 + a 1px bite out of the root's top: the callback fires exactly
    // when the element starts and stops being clipped at the top edge. The
    // boundingClientRect test then separates "clipped at the top because it is
    // pinned" from "clipped at the bottom because it is scrolling into view".
    const observer = new IntersectionObserver(
      ([entry]) => setStuck(
        !!entry.rootBounds && entry.boundingClientRect.top <= entry.rootBounds.top + 1,
      ),
      { root, threshold: [1], rootMargin: '-1px 0px 0px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [scrollRef])

  return (
    <div ref={ref} className="sticky top-0 z-20 px-3 py-2">
      {stuck && <span aria-hidden className="chat-day-glass" />}
      <span className="relative flex items-center gap-3">
        <span className="h-px min-w-4 flex-1 bg-border-default" />
        <span className="shrink-0 rounded-sm border border-border-default bg-surface-2 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-text-3">
          {dayLabel(iso)}
        </span>
        <span className="h-px min-w-4 flex-1 bg-border-default" />
      </span>
    </div>
  )
}

export function MessageList({
  messages, isLoading, hasNextPage, isFetchingNextPage, onLoadOlder,
  canModerate, myProfileId, attachments, reactions, onDelete, onEdit, onToggleReaction, onReply, readersOf,
  audienceSize, myMentionIds, showAuthor,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const lastIdRef = useRef<string | null>(null)

  /**
   * Scroll a quoted message into view and flash it.
   *
   * `location.hash` rather than scrollIntoView alone, so the `target:` style on
   * the bubble lights it up: landing on the right pixel with nothing highlighted
   * leaves you hunting for which line you were sent to.
   */
  const jumpTo = (messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    window.history.replaceState(null, '', `#msg-${messageId}`)
  }

  // The newest message of mine that has actually been sent, which is the only
  // one a read receipt is meaningful for.

  // Bucket attachments by message once, rather than filtering per bubble.
  const attachmentsByMessage = useMemo(() => {
    const map = new Map<string, MessageAttachmentRow[]>()
    for (const a of attachments) {
      if (!a.message_id) continue
      const list = map.get(a.message_id)
      if (list) list.push(a)
      else map.set(a.message_id, [a])
    }
    return map
  }, [attachments])

  // Messages bucketed into calendar days, in order. Built here rather than
  // decided per message so each day's divider and its messages share a parent,
  // which is what lets the divider stick.
  const days = useMemo(() => {
    const out: { key: string; iso: string; items: MessageWithAuthor[] }[] = []
    for (const m of messages) {
      const current = out[out.length - 1]
      if (current && isSameDay(current.iso, m.created_at)) current.items.push(m)
      else out.push({ key: m.id, iso: m.created_at, items: [m] })
    }
    return out
  }, [messages])

  // Follow the conversation only when a genuinely new message lands, so
  // loading older history doesn't yank the viewport to the bottom.
  useEffect(() => {
    const newest = messages[messages.length - 1]
    if (!newest || newest.id === lastIdRef.current) return
    lastIdRef.current = newest.id
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages])

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-6">
        <span className="size-12 rounded-full bg-surface-2 flex items-center justify-center text-text-3">
          <MessageSquare size={22} />
        </span>
        <p className="font-ui font-semibold text-[14px] text-text-1">No messages yet</p>
        <p className="font-ui text-[12px] text-text-4 max-w-sm">Say hello. This is the beginning of the conversation.</p>
      </div>
    )
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto py-3">
      {hasNextPage && (
        <div className="flex justify-center pb-3">
          <button
            onClick={onLoadOlder}
            disabled={isFetchingNextPage}
            className="font-ui text-[12px] text-text-3 hover:text-text-1 disabled:opacity-50 transition-colors"
          >
            {isFetchingNextPage ? 'Loading…' : 'Load older messages'}
          </button>
        </div>
      )}

      {days.map((day) => (
        // One section per day, so its divider stays pinned for the whole run of
        // that day's messages rather than for a single one.
        <section key={day.key}>
          <DayDivider iso={day.iso} scrollRef={scrollRef} />
          {day.items.map((m, i) => (
            <MessageBubble
              key={m.id}
              message={m}
              // Previous within the day: the first message after a divider always
              // carries its author and time, or the run reads as though it went
              // straight through the night.
              startsGroup={startsNewGroup(m, day.items[i - 1])}
              canModerate={canModerate}
              myProfileId={myProfileId}
              attachments={attachmentsByMessage.get(m.id) ?? []}
              reactions={groupReactions(reactions, m.id, myProfileId)}
              onDelete={onDelete}
              onEdit={onEdit}
              onToggleReaction={onToggleReaction}
              onReply={onReply}
              onJumpTo={jumpTo}
              tagsMe={mentionsMe(m, myMentionIds)}
              receipt={m.author_id === myProfileId && !isOptimistic(m.id) ? readersOf(m) : null}
              audience={audienceSize}
              // Already bucketed above, so the quote costs no extra lookup.
              replyAttachment={m.reply_to_id ? attachmentsByMessage.get(m.reply_to_id)?.[0] : undefined}
              showAuthor={showAuthor}
            />
          ))}
        </section>
      ))}

      <div ref={bottomRef} />
    </div>
  )
}
