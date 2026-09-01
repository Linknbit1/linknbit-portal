import { useRef, useState, type CSSProperties } from 'react'
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
import { isOptimistic, receiptState, replyPreviewText } from './chatUtils'
import { ReplyThumbnail } from './ReplyThumbnail'
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
  /** The first file on the message being answered, so the quote can show it. */
  replyAttachment?: MessageAttachmentRow | null
  /**
   * Name the sender above their bubble. True in channels and group DMs, false
   * in a one-to-one — there, the side the bubble sits on already says who.
   */
  showAuthor?: boolean
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

/**
 * Time, an "edited" note, and — on your own messages — the read ticks.
 *
 * Lives at the bottom-right of the bubble either way, but is rendered before
 * the text and floated when there is text: that is what keeps a short message's
 * time on its own line ("perfect  3:13 PM") instead of pushing it to a line of
 * its own, and lets a paragraph wrap around it into the corner.
 */
function MessageStamp({ message, mine, receipt, audience, pending, className }: {
  message: MessageWithAuthor
  mine: boolean
  receipt: { id: string; name: string }[] | null
  audience: number
  pending: boolean
  className?: string
}) {
  return (
    <span className={cn('flex items-center justify-end gap-1', className)}>
      {message.edited_at && <span className="font-mono text-[9.5px] italic text-text-4">edited</span>}
      <span
        title={timeOf(message.created_at)}
        className="whitespace-nowrap font-mono text-[10px] text-text-4"
      >
        {clockOf(message.created_at)}
      </span>
      {mine && (
        <ReadTicks
          state={receiptState(receipt?.length ?? 0, audience, pending)}
          audience={audience}
          readerNames={receipt?.map((r) => r.name)}
        />
      )}
    </span>
  )
}

export function MessageBubble({
  message, startsGroup, canModerate, myProfileId, attachments, reactions, onDelete, onEdit, onToggleReaction,
  onReply, onJumpTo, tagsMe, receipt, audience, replyAttachment, showAuthor,
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

  const hasBody = !!(message.body_text || message.body_doc)
  const stamp = { message, mine, receipt, audience, pending }
  // What the corner stamp will occupy, so the last line can leave room for it.
  // Measured in the pieces it is built from rather than by reading the DOM: the
  // parts are fixed-width (tabular time, a 16px tick slot) and a layout effect
  // to measure them would cost a second paint on every message in the thread.
  const stampWidth = 46 + (mine ? 20 : 0) + (message.edited_at ? 34 : 0)

  if (message.deleted_at) {
    return (
      <div className={cn('flex px-3 py-0.5', mine && 'justify-end', startsGroup && 'mt-3')}>
        <p className={cn(
          'flex max-w-[78%] items-baseline gap-1.5 rounded-bubble border border-border-subtle',
          'bg-surface-1/60 px-3 py-1.5 font-ui text-[13px] italic text-text-4',
          !mine && 'ml-10',
        )}>
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
          // items-start, not items-end: the avatar belongs level with the top of
          // the run it labels. Aligned to the bottom it drifted down the side of
          // a long first message and ended up beside text the person had not
          // even started saying yet.
          'group relative flex touch-pan-y items-start gap-2 px-3 py-0.5',
          // Your own messages run down the right, everyone else's down the left —
          // which side a message sits on is the fastest "who said this" there is,
          // faster than reading a name.
          mine && 'flex-row-reverse',
          swipe.dragging ? 'select-none' : 'transition-transform duration-200',
          startsGroup && 'mt-3',
        )}
      >
        {/* Only for other people, and only once per run: your own avatar tells
            you nothing, and repeating theirs on every line is noise. The spacer
            keeps a run's bubbles on one edge. */}
        {mine ? null : startsGroup ? (
          // PersonLink opens the shared profile card, so chat behaves like every
          // other place a person is shown.
          <Avatar
            name={message.author?.name ?? '?'}
            src={message.author?.avatar_url ?? undefined}
            size="md"
            personId={message.author?.id}
          />
        ) : (
          <span className="w-8 shrink-0" />
        )}

        <div className={cn('flex min-w-0 max-w-[80%] flex-col sm:max-w-[70%] lg:max-w-[62%]', mine && 'items-end')}>
          <div
            className={cn(
              'relative min-w-0 rounded-bubble border transition-colors',
              // The corner facing the sender is squared off on the first bubble
              // of a run — the flat edge points at the avatar the way a tail
              // would, and the rest of the run stays fully rounded so a burst of
              // messages reads as one block.
              startsGroup && (mine ? 'rounded-tr-none' : 'rounded-tl-none'),
              // Tighter around a picture: padding around an image is a frame
              // nobody asked for.
              hasBody ? 'px-3 py-2' : 'p-1.5',
              mine
                ? 'border-chat-out-border bg-chat-out'
                : 'border-border-default bg-surface-2',
              // A message aimed at you is ringed rather than tinted, so it stays
              // findable when scrolling back without losing which side it is on.
              tagsMe && 'border-warning/60 ring-1 ring-warning/35',
              pending && 'opacity-70',
            )}
          >
            {/* Their name, once per run, and only where there is more than one
                person it could be. */}
            {showAuthor && startsGroup && !mine && (
              <PersonLink
                personId={message.author?.id}
                className="mb-0.5 block font-ui text-[12.5px] font-semibold text-brand-red"
              >
                {message.author?.name ?? 'Unknown'}
              </PersonLink>
            )}

            {/* What this message answers. A reply whose original was deleted keeps
                the quote as a tombstone rather than silently losing the thread. */}
            {message.reply_to_id && (
              <button
                type="button"
                onClick={() => message.reply_to && onJumpTo(message.reply_to.id)}
                disabled={!message.reply_to || !!message.reply_to.deleted_at}
                className={cn(
                  'mb-1.5 flex w-full items-center gap-1.5 rounded-sm border-l-2 border-brand-red/60',
                  'bg-surface-inset/70 px-2 py-1 text-left transition-colors',
                  message.reply_to && !message.reply_to.deleted_at && 'hover:bg-surface-inset',
                )}
              >
                <CornerUpLeft size={11} className="shrink-0 text-text-4" />
                {message.reply_to && !message.reply_to.deleted_at ? (
                  <>
                    <ReplyThumbnail attachment={replyAttachment} />
                    <span className="shrink-0 font-ui text-[11.5px] font-semibold text-text-3">
                      {message.reply_to.author?.name ?? 'Unknown'}
                    </span>
                    <span className="truncate font-ui text-[11.5px] text-text-4">
                      {replyPreviewText(message.reply_to.body_text, replyAttachment)}
                    </span>
                  </>
                ) : (
                  <span className="font-ui text-[11.5px] italic text-text-4">
                    The message this replies to was deleted
                  </span>
                )}
              </button>
            )}

            {/* Files first: a picture sent with a line of text IS the message,
                and the text is its caption — a caption above the picture reads
                as a separate thought that happens to have an image under it.
                Every messaging app stacks them this way round. */}
            {attachments.map((a) => <MessageAttachment key={a.id} attachment={a} />)}

            {/* break-words stops an unbroken URL or long token from forcing the
                whole thread to scroll sideways on a narrow screen.

                chat-stamp-gap opens a hole at the end of the last line, which is
                where the absolutely-placed stamp below then sits — so the time
                lands beside a short message and in the corner under a long one,
                exactly as it does in WhatsApp. */}
            {hasBody && (
              <div
                className="chat-stamp-gap font-ui text-[14.5px] leading-relaxed wrap-break-word text-text-1"
                style={{ '--stamp-w': `${stampWidth}px` } as CSSProperties}
              >
                {message.body_doc
                  ? <RichRenderer doc={fromDbDoc(message.body_doc)} />
                  : <p className="whitespace-pre-wrap">{message.body_text}</p>}
              </div>
            )}

            {hasBody && <MessageStamp {...stamp} className="absolute bottom-1.5 right-2.5" />}

            {/* A picture has no text to flow around, so its stamp is a plain
                row beneath it instead. */}
            {!hasBody && <MessageStamp {...stamp} className="px-1 pb-0.5 pt-1" />}
          </div>

          <ReactionBar groups={reactions} onToggle={(emoji) => onToggleReaction(message.id, emoji)} />
        </div>

        {!pending && (
          <div
            className={cn(
              'flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity',
              'lg:opacity-0 lg:group-hover:opacity-100 lg:focus-within:opacity-100',
              // Invisible is not the same as absent. On your own messages the row
              // is reversed, so this block sits to the LEFT of the bubble —
              // exactly where a drag-to-reply starts — and while it was merely
              // transparent it still took the pointer, so the gesture saw a
              // button and stood down. Hidden means untouchable.
              'lg:pointer-events-none lg:group-hover:pointer-events-auto lg:focus-within:pointer-events-auto',
            )}
          >
            <button
              onClick={() => onReply(message)}
              aria-label="Reply to message"
              className="flex size-7 items-center justify-center rounded-sm text-text-3 hover:bg-surface-3 hover:text-text-1"
            >
              <Reply size={13} />
            </button>
            <button
              ref={reactBtnRef}
              onClick={() => setReactOpen((v) => !v)}
              aria-label="Add reaction"
              className="flex size-7 items-center justify-center rounded-sm text-text-3 hover:bg-surface-3 hover:text-text-1"
            >
              <SmilePlus size={13} />
            </button>
            {mine && (
              <button
                onClick={() => onEdit(message)}
                aria-label="Edit message"
                className="flex size-7 items-center justify-center rounded-sm text-text-3 hover:bg-surface-3 hover:text-text-1"
              >
                <Pencil size={13} />
              </button>
            )}
            {(mine || canModerate) && (
              <button
                onClick={() => setConfirmOpen(true)}
                aria-label="Delete message"
                className="flex size-7 items-center justify-center rounded-sm text-text-3 hover:bg-surface-3 hover:text-error"
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
