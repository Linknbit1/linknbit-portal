import { Check, CheckCheck, Clock } from 'lucide-react'
import { cn } from '../../lib/cn'
import { receiptLabel, type ReceiptState } from './chatUtils'

interface ReadTicksProps {
  state: ReceiptState
  /** People in the conversation other than you — only used to word the tooltip. */
  audience: number
  /** Who has read it, when the surface knows their names. */
  readerNames?: string[]
  /**
   * `list` is the tighter build used in the conversation list, where the tick
   * sits in a 13px preview line rather than beside a message.
   */
  size?: 'message' | 'list'
  className?: string
}

/**
 * Read ticks, the way a messaging app does them: a clock while the message is
 * in flight, one grey tick once the server has it, two grey when some of a
 * channel has read it, two coloured when the whole audience has.
 *
 * Drawn only on your own messages. Ticks on somebody else's message would be
 * telling them something they cannot act on, and would double the noise in a
 * busy channel.
 *
 * The names sit in the title rather than on screen. "Seen by" spelled out under
 * every message is a wall of text in a channel, and in a DM it says what one
 * coloured tick already said.
 */
export function ReadTicks({ state, audience, readerNames, size = 'message', className }: ReadTicksProps) {
  const label = receiptLabel(state, audience, readerNames)
  const compact = size === 'list'
  const px = compact ? 12 : 13

  return (
    <span
      title={label}
      aria-label={label}
      // A fixed slot: the tick keeps the same spot as it changes state, so a run
      // of your own messages has one straight edge of ticks instead of icons
      // that shuffle sideways as they resolve.
      className={cn(
        'inline-flex shrink-0 items-center justify-end leading-none transition-colors duration-300',
        compact ? 'w-3.5' : 'mb-0.5 w-4',
        state === 'all' ? 'text-info' : 'text-text-4',
        className,
      )}
    >
      {/* Keyed on the state so each transition replays the settle, rather than
          swapping the glyph in with no acknowledgement that anything changed. */}
      <span key={state} className="animate-tick inline-flex">
        {state === 'sending'
          ? <Clock size={px - 1} />
          : state === 'sent'
            ? <Check size={px} />
            : <CheckCheck size={px} />}
      </span>
    </span>
  )
}
