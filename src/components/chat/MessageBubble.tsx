import { useRef, useState } from 'react'
import { Trash2, Pencil, SmilePlus } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { RichRenderer } from '../editor/RichRenderer'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { MessageAttachment } from './MessageAttachment'
import { ReactionBar } from './ReactionBar'
import { EmojiPicker } from './EmojiPicker'
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

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function MessageBubble({
  message, startsGroup, canModerate, myProfileId, attachments, reactions, onDelete, onEdit, onToggleReaction,
}: MessageBubbleProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [reactOpen, setReactOpen] = useState(false)
  const reactBtnRef = useRef<HTMLButtonElement>(null)
  const mine = message.author_id === myProfileId
  const pending = isOptimistic(message.id)

  if (message.deleted_at) {
    return (
      <div className={cn('px-4 py-1 flex gap-3', startsGroup && 'mt-3')}>
        <span className="w-8 shrink-0" />
        <p className="font-ui text-[12.5px] italic text-text-4">This message was deleted</p>
      </div>
    )
  }

  return (
    <div className={cn('group px-4 py-0.5 flex gap-3 hover:bg-surface-1/40', startsGroup && 'mt-3')}>
      {startsGroup ? (
        <Avatar name={message.author?.name ?? '?'} src={message.author?.avatar_url ?? undefined} size="sm" personId={message.author?.id} />
      ) : (
        <span className="w-8 shrink-0 flex items-start justify-end pt-1">
          <span className="font-mono text-[9px] text-text-4 opacity-0 group-hover:opacity-100 transition-opacity">
            {timeOf(message.created_at)}
          </span>
        </span>
      )}

      <div className="flex-1 min-w-0">
        {startsGroup && (
          <div className="flex items-baseline gap-2">
            <span className="font-ui font-semibold text-[13px] text-text-1">{message.author?.name ?? 'Unknown'}</span>
            <span className="font-mono text-[10px] text-text-4">{timeOf(message.created_at)}</span>
            {message.edited_at && <span className="font-mono text-[10px] text-text-4">(edited)</span>}
          </div>
        )}
        <div className={cn('font-ui text-[13.5px] text-text-2', pending && 'opacity-60')}>
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
