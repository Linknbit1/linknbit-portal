import { useEffect, useMemo, useRef } from 'react'
import { MessageSquare } from 'lucide-react'
import { Skeleton } from '../ui/Skeleton'
import { MessageBubble } from './MessageBubble'
import { startsNewGroup } from './chatUtils'
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
}

export function MessageList({
  messages, isLoading, hasNextPage, isFetchingNextPage, onLoadOlder,
  canModerate, myProfileId, attachments, reactions, onDelete, onEdit, onToggleReaction,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const lastIdRef = useRef<string | null>(null)

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
        <p className="font-ui text-[12px] text-text-4 max-w-sm">Say hello — this is the beginning of the conversation.</p>
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
        />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
