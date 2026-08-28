import { useEffect, useMemo, useRef } from 'react'
import { MessageSquare } from 'lucide-react'
import { Skeleton } from '../ui/Skeleton'
import { MessageBubble } from './MessageBubble'
import { startsNewGroup, isOptimistic, mentionsMe } from './chatUtils'
import { Avatar } from '../ui/Avatar'
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
  /** Everyone who has read up to a given message, for the seen-by line. */
  readersOf: (message: MessageWithAuthor) => { id: string; name: string; avatar_url: string | null }[]
  /** My id, my teams' ids and the @everyone sentinel: what makes a message mine. */
  myMentionIds: ReadonlySet<string>
}

export function MessageList({
  messages, isLoading, hasNextPage, isFetchingNextPage, onLoadOlder,
  canModerate, myProfileId, attachments, reactions, onDelete, onEdit, onToggleReaction, onReply, readersOf,
  myMentionIds,
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
  const lastOwn = useMemo(
    () => [...messages].reverse().find((m) => m.author_id === myProfileId && !m.deleted_at && !isOptimistic(m.id)),
    [messages, myProfileId],
  )

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

      {messages.map((m, i) => (
        <MessageBubble
          key={m.id}
          message={m}
          startsGroup={startsNewGroup(m, messages[i - 1])}
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
        />
      ))}

      {/* Seen-by, once, under the last message you sent. Repeating it on every
          message of yours would be a wall of avatars saying the same thing. */}
      {lastOwn && (
        <SeenBy readers={readersOf(lastOwn)} />
      )}
      <div ref={bottomRef} />
    </div>
  )
}

/**
 * "Seen by" under your last message.
 *
 * Read state is derived, not stored: channel_members.last_read_at already says
 * how far each person has read, so this needs no new writes and no per-message
 * receipt rows. Nothing is shown when nobody has caught up yet, rather than an
 * empty row implying they have.
 */
function SeenBy({ readers }: { readers: { id: string; name: string; avatar_url: string | null }[] }) {
  if (readers.length === 0) return null

  return (
    <div className="flex items-center justify-end gap-1.5 px-4 pt-1 pb-2">
      <span className="font-mono text-[10px] text-text-4">
        Seen by {readers.length === 1 ? readers[0].name : readers.length}
      </span>
      <span className="flex -space-x-1.5">
        {readers.slice(0, 5).map((r) => (
          <Avatar key={r.id} name={r.name} src={r.avatar_url ?? undefined} size="xs" personId={r.id} />
        ))}
      </span>
    </div>
  )
}
