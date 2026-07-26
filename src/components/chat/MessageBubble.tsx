import { useRef, useState } from 'react'
import { Trash2, Pencil, SmilePlus } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { RichRenderer } from '../editor/RichRenderer'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { MessageAttachment } from './MessageAttachment'
import { ReactionBar } from './ReactionBar'
import { EmojiPicker } from './EmojiPicker'
import { UserProfileCard } from './UserProfileCard'
import { cn } from '../../lib/cn'
import { fromDbDoc } from '../../lib/richText'
import { isOptimistic } from './chatUtils'
import type { MessageWithAuthor } from '../../api/messages'
import type { MessageAttachmentRow } from '../../api/messageAttachments'
import type { ReactionGroup } from '../../hooks/useMessageReactions'

interface MessageBubbleProps {
  message: MessageWithAuthor
  startsGroup: boolean
  canModerate: boolean
  myProfileId: string | undefined
  attachments: MessageAttachmentRow[]
  reactions: ReactionGroup[]
  onDelete: (id: string) => void
  onEdit: (message: MessageWithAuthor) => void
  onToggleReaction: (messageId: string, emoji: string) => void
}

/**
 * Time with am/pm, plus a date once the message isn't from today — "2:45 PM"
 * for today, "Yesterday 2:45 PM", then "12 Jul, 2:45 PM" (with the year when
 * it isn't the current one).
 */
function timeOf(iso: string): string {
  const date = new Date(iso)
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfMessageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const daysApart = Math.round((startOfToday.getTime() - startOfMessageDay.getTime()) / 86_400_000)

  if (daysApart === 0) return time
  if (daysApart === 1) return `Yesterday ${time}`

  const day = date.toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
  })
  return `${day}, ${time}`
}

export function MessageBubble({
  message, startsGroup, canModerate, myProfileId, attachments, reactions, onDelete, onEdit, onToggleReaction,
}: MessageBubbleProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [reactOpen, setReactOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const reactBtnRef = useRef<HTMLButtonElement>(null)
  const authorRef = useRef<HTMLButtonElement>(null)
  const mine = message.author_id === myProfileId
  const pending = isOptimistic(message.id)

  if (message.deleted_at) {
    return (
      <div className={cn('flex gap-3 px-4 py-1', startsGroup && 'mt-4')}>
        <span className="w-10 shrink-0" />
        <p className="flex items-baseline gap-1.5 font-ui text-[13.5px] italic text-text-4">
          This message was deleted
          {/* The deletion time, not created_at — that's the moment that matters here. */}
          <span className="font-mono text-[10px] not-italic">{timeOf(message.deleted_at)}</span>
        </p>
      </div>
    )
  }

  return (
    <div className={cn('group flex gap-3 px-4 py-0.5 hover:bg-surface-1/40', startsGroup && 'mt-4')}>
      {startsGroup ? (
        // Opens the mini profile rather than navigating away, so you don't lose
        // your place in the conversation.
        <button
          ref={authorRef}
          onClick={() => message.author && setProfileOpen((v) => !v)}
          aria-label={message.author ? `View ${message.author.name}'s profile` : undefined}
          className="shrink-0 rounded-full transition-opacity hover:opacity-90"
        >
          <Avatar name={message.author?.name ?? '?'} src={message.author?.avatar_url ?? undefined} size="lg" />
        </button>
      ) : (
        <span className="flex w-10 shrink-0 items-start justify-end pt-1">
          <span className="font-mono text-[10px] text-text-4 opacity-0 transition-opacity group-hover:opacity-100">
            {timeOf(message.created_at)}
          </span>
        </span>
      )}

      <div className="min-w-0 flex-1">
        {startsGroup && (
          <div className="flex flex-wrap items-baseline gap-2">
            <button
              onClick={() => message.author && setProfileOpen((v) => !v)}
              className="font-ui text-[14.5px] font-semibold text-text-1 transition-colors hover:underline"
            >
              {message.author?.name ?? 'Unknown'}
            </button>
            <span className="font-mono text-[11px] text-text-4">{timeOf(message.created_at)}</span>
            {message.edited_at && <span className="font-mono text-[11px] text-text-4">(edited)</span>}
          </div>
        )}
        <div className={cn('font-ui text-[15px] leading-relaxed text-text-2', pending && 'opacity-60')}>
          {message.body_text || message.body_doc ? (
            message.body_doc
              ? <RichRenderer doc={fromDbDoc(message.body_doc)} />
              : <p className="whitespace-pre-wrap">{message.body_text}</p>
          ) : null}
        </div>

        {attachments.map((a) => <MessageAttachment key={a.id} attachment={a} />)}

        <ReactionBar groups={reactions} onToggle={(emoji) => onToggleReaction(message.id, emoji)} />
      </div>

      {!pending && (
        <div className="shrink-0 flex items-start gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <button
            ref={reactBtnRef}
            onClick={() => setReactOpen((v) => !v)}
            aria-label="Add reaction"
            className="size-7 rounded-sm flex items-center justify-center text-text-3 hover:text-text-1 hover:bg-surface-3"
          >
            <SmilePlus size={13} />
          </button>
          {mine && (
            <button
              onClick={() => onEdit(message)}
              aria-label="Edit message"
              className="size-7 rounded-sm flex items-center justify-center text-text-3 hover:text-text-1 hover:bg-surface-3"
            >
              <Pencil size={13} />
            </button>
          )}
          {(mine || canModerate) && (
            <button
              onClick={() => setConfirmOpen(true)}
              aria-label="Delete message"
              className="size-7 rounded-sm flex items-center justify-center text-text-3 hover:text-error hover:bg-surface-3"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      )}

      <EmojiPicker
        open={reactOpen}
        onClose={() => setReactOpen(false)}
        anchorRef={reactBtnRef}
        onPick={(emoji) => onToggleReaction(message.id, emoji)}
      />

      {message.author && (
        <UserProfileCard
          profileId={message.author.id}
          name={message.author.name}
          avatarUrl={message.author.avatar_url}
          open={profileOpen}
          onClose={() => setProfileOpen(false)}
          anchorRef={authorRef}
        />
      )}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => { onDelete(message.id); setConfirmOpen(false) }}
        title="Delete message"
        message="This removes the message for everyone in the conversation."
        confirmLabel="Delete"
        danger
      />
    </div>
  )
}
