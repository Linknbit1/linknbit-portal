import { useRef, useState } from 'react'
import { Trash2, Pencil, SmilePlus, Reply, CornerUpLeft } from 'lucide-react'
import { useSwipeToReply } from '../../hooks/useSwipeToReply'
import { Avatar } from '../ui/Avatar'
import { PersonLink } from '../shared/PersonLink'
import { RichRenderer } from '../editor/RichRenderer'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { MessageAttachment } from './MessageAttachment'
import { ReactionBar } from './ReactionBar'
import { EmojiPicker } from './EmojiPicker'
import { cn } from '../../lib/cn'
import { fromDbDoc } from '../../lib/richText'
import { ReadTicks } from './ReadTicks'
import { isOptimistic, receiptState } from './chatUtils'
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
  onReply: (message: MessageWithAuthor) => void
  /** Scrolls the thread to the quoted message and flashes it. */
  onJumpTo: (messageId: string) => void
  /** Tags me by name, tags a team I am on, or carries an @everyone. */
  tagsMe: boolean
  /**
   * Who else has read this. Null on other people's messages and on one still
   * sending — a message in flight has no receipts yet, and shows a clock.
   * Whether ticks are drawn at all is decided by whose message it is.
   */
  receipt: { id: string; name: string }[] | null
  /** People in the conversation other than you, so "everyone" can be tested. */
  audience: number
}

/**
 * Just the clock. The day is said once, on the divider above the run, so a
 * message repeating it would be noise — and "Yesterday 2:45 PM" does not fit
 * the 40px gutter, which is what made it wrap onto two lines.
 */
function clockOf(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
}

/**
 * Time with am/pm, plus a date once the message isn't from today — "2:45 PM"
 * for today, "Yesterday 2:45 PM", then "12 Jul, 2:45 PM" (with the year when
 * it isn't the current one). Kept for the places that stand apart from the
 * day dividers: the deletion note, and the tooltip on a message's own time.
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
  onReply, onJumpTo, tagsMe, receipt, audience,
}: MessageBubbleProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [reactOpen, setReactOpen] = useState(false)
  const reactBtnRef = useRef<HTMLButtonElement>(null)
  const mine = message.author_id === myProfileId
  const pending = isOptimistic(message.id)
  // Drag right to reply, as in WhatsApp — finger or mouse. Off while a message
  // is still sending: it has no server id yet, so nothing could be quoted
  // against it.
  const swipe = useSwipeToReply(() => onReply(message), !pending)

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
    // The outer element stays put and holds the gesture; only the inner row
    // slides, so the reply arrow is revealed from underneath rather than being
    // dragged along with it.
    <div className="relative overflow-hidden" {...swipe.handlers}>
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-y-0 left-2 flex items-center transition-colors',
          swipe.armed ? 'text-brand-red' : 'text-text-4',
        )}
        // Fades in with the drag, so a gesture abandoned early leaves no trace.
        style={{ opacity: Math.min(1, swipe.offset / 40) }}
      >
        <Reply size={16} />
      </span>

    <div
      id={`msg-${message.id}`}
      style={swipe.offset ? { transform: `translateX(${swipe.offset}px)` } : undefined}
      className={cn(
        // touch-pan-y: the browser keeps vertical scrolling, we take the
        // horizontal gesture. Without it the swipe never reaches our handlers.
        'group relative flex touch-pan-y gap-3 px-4 py-0.5 target:bg-brand-red/10',
        // Only while the drag is live, so text stays selectable the rest of the
        // time — a mouse drag cannot be a selection and a swipe at once.
        swipe.dragging ? 'select-none' : 'transition-transform duration-200',
        // A message aimed at you keeps a warning-tinted band and a left edge, so
        // it is findable when scrolling back through a busy channel rather than
        // only at the moment the notification arrives.
        tagsMe
          ? 'border-l-2 border-warning bg-warning/8 hover:bg-warning/12'
          : 'hover:bg-surface-1/40',
        startsGroup && 'mt-4',
      )}
    >
      {startsGroup ? (
        // PersonLink opens the shared profile card, so chat behaves like every
        // other place a person is shown.
        <Avatar
          name={message.author?.name ?? '?'}
          src={message.author?.avatar_url ?? undefined}
          size="lg"
          personId={message.author?.id}
        />
      ) : (
        <span className="flex w-10 shrink-0 items-start justify-end pt-1">
          {/* nowrap: the gutter is the avatar's width, and "11:56 AM" is a shade
              wider than that — it used to break onto a second line rather than
              overhang into the row's own padding, which is empty anyway. */}
          <span
            title={timeOf(message.created_at)}
            className="whitespace-nowrap font-mono text-[10px] text-text-4 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100"
          >
            {clockOf(message.created_at)}
          </span>
        </span>
      )}

      <div className="min-w-0 flex-1">
        {startsGroup && (
          <div className="flex flex-wrap items-baseline gap-2">
            <PersonLink personId={message.author?.id} className="font-ui text-[14.5px] font-semibold text-text-1">
              {message.author?.name ?? 'Unknown'}
            </PersonLink>
            <span title={timeOf(message.created_at)} className="whitespace-nowrap font-mono text-[11px] text-text-4">
              {clockOf(message.created_at)}
            </span>
            {message.edited_at && <span className="font-mono text-[11px] text-text-4">(edited)</span>}
          </div>
        )}
        {/* What this message answers. A reply whose original was deleted keeps
            the quote as a tombstone rather than silently losing the thread. */}
        {message.reply_to_id && (
          <button
            type="button"
            onClick={() => message.reply_to && onJumpTo(message.reply_to.id)}
            disabled={!message.reply_to || !!message.reply_to.deleted_at}
            className={cn(
              'mb-1 flex w-full max-w-lg items-center gap-1.5 rounded-sm border-l-2 border-border-strong',
              'bg-surface-2/60 px-2 py-1 text-left transition-colors',
              message.reply_to && !message.reply_to.deleted_at && 'hover:border-brand-red hover:bg-surface-2',
            )}
          >
            <CornerUpLeft size={11} className="shrink-0 text-text-4" />
            {message.reply_to && !message.reply_to.deleted_at ? (
              <>
                <span className="shrink-0 font-ui text-[11.5px] font-semibold text-text-3">
                  {message.reply_to.author?.name ?? 'Unknown'}
                </span>
                <span className="truncate font-ui text-[11.5px] text-text-4">
                  {message.reply_to.body_text || 'Attachment'}
                </span>
              </>
            ) : (
              <span className="font-ui text-[11.5px] italic text-text-4">
                The message this replies to was deleted
              </span>
            )}
          </button>
        )}

        {/* The ticks ride the bottom-right corner of the message, level with its
            last line, the way every messaging app places them — they used to sit
            on a line of their own underneath, left-aligned, which read as a
            stray icon rather than as part of the message. */}
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            {/* break-words stops an unbroken URL or long token from forcing the
                whole thread to scroll sideways on a narrow screen. */}
            <div className={cn('font-ui text-[15px] leading-relaxed wrap-break-word text-text-2', pending && 'opacity-60')}>
              {message.body_text || message.body_doc ? (
                message.body_doc
                  ? <RichRenderer doc={fromDbDoc(message.body_doc)} />
                  : <p className="whitespace-pre-wrap">{message.body_text}</p>
              ) : null}
            </div>

            {attachments.map((a) => <MessageAttachment key={a.id} attachment={a} />)}
          </div>

          {mine && (
            <ReadTicks
              state={receiptState(receipt?.length ?? 0, audience, pending)}
              audience={audience}
              readerNames={receipt?.map((r) => r.name)}
            />
          )}
        </div>

        <ReactionBar groups={reactions} onToggle={(emoji) => onToggleReaction(message.id, emoji)} />
      </div>

      {!pending && (
        <div className="flex shrink-0 items-start gap-1 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:focus-within:opacity-100">
          <button
            onClick={() => onReply(message)}
            aria-label="Reply to message"
            className="size-7 rounded-sm flex items-center justify-center text-text-3 hover:text-text-1 hover:bg-surface-3"
          >
            <Reply size={13} />
          </button>
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
    </div>
  )
}
