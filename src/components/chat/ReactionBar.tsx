import { useRef, useState } from 'react'
import { SmilePlus } from 'lucide-react'
import { EmojiPicker } from './EmojiPicker'
import { Popover } from '../ui/Popover'
import { Avatar } from '../ui/Avatar'
import { cn } from '../../lib/cn'
import type { ReactionGroup } from '../../hooks/useMessageReactions'

interface ReactionBarProps {
  groups: ReactionGroup[]
  onToggle: (emoji: string) => void
}

/** How long a finger must rest on a pill before the list of people opens. */
const LONG_PRESS_MS = 400

/**
 * Who picked this one. A pill only has room for a count, and "3" does not
 * answer the question anybody actually has about a reaction.
 *
 * Opens on hover for a mouse and on a long press for a finger, because a pill's
 * tap already means "react" and cannot mean two things.
 */
function ReactionPeople({ group, mine, anchorRef, open, onClose }: {
  group: ReactionGroup
  mine: boolean
  anchorRef: React.RefObject<HTMLButtonElement | null>
  open: boolean
  onClose: () => void
}) {
  return (
    <Popover
      anchorRef={anchorRef}
      open={open}
      onClose={onClose}
      className="w-52 overflow-hidden rounded-lg border border-border-default bg-surface-2 shadow-2xl"
    >
      <div className="flex items-center gap-2 border-b border-border-subtle px-3 py-2">
        <span className="text-[16px] leading-none">{group.emoji}</span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-text-4">
          {group.count} {group.count === 1 ? 'reaction' : 'reactions'}
        </span>
      </div>
      <ul className="max-h-56 overflow-y-auto py-1">
        {group.people.map((p) => (
          <li key={p.id} className="flex items-center gap-2 px-3 py-1.5">
            <Avatar name={p.name} src={p.avatarUrl ?? undefined} size="xs" personId={p.id} />
            <span className="min-w-0 flex-1 truncate font-ui text-[12.5px] text-text-2">{p.name}</span>
          </li>
        ))}
      </ul>
      {mine && (
        <p className="border-t border-border-subtle px-3 py-1.5 font-ui text-[11px] text-text-4">
          Press the pill to take yours off
        </p>
      )}
    </Popover>
  )
}

function ReactionPill({ group, onToggle }: { group: ReactionGroup; onToggle: (emoji: string) => void }) {
  const ref = useRef<HTMLButtonElement>(null)
  const [peopleOpen, setPeopleOpen] = useState(false)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current)
    pressTimer.current = null
  }

  return (
    <>
      <button
        ref={ref}
        onClick={() => onToggle(group.emoji)}
        // Mouse only: a finger's "enter" fires on tap, which would open the list
        // every time somebody reacts.
        onPointerEnter={(e) => { if (e.pointerType === 'mouse') setPeopleOpen(true) }}
        onPointerLeave={(e) => { if (e.pointerType === 'mouse') setPeopleOpen(false); cancelPress() }}
        onPointerDown={(e) => {
          if (e.pointerType === 'mouse') return
          pressTimer.current = setTimeout(() => setPeopleOpen(true), LONG_PRESS_MS)
        }}
        onPointerUp={cancelPress}
        onPointerCancel={cancelPress}
        onFocus={() => setPeopleOpen(true)}
        onBlur={() => setPeopleOpen(false)}
        className={cn(
          'flex h-6 items-center gap-1 rounded-sm border px-1.5 transition-colors',
          group.mine
            ? 'border-brand-red/40 bg-brand-red/13 text-text-1'
            : 'border-border-default bg-surface-2 text-text-2 hover:border-border-strong',
        )}
      >
        <span className="text-[13px] leading-none">{group.emoji}</span>
        <span className="font-mono text-[10.5px] tabular-nums">{group.count}</span>
      </button>

      <ReactionPeople
        group={group}
        mine={group.mine}
        anchorRef={ref}
        open={peopleOpen}
        onClose={() => setPeopleOpen(false)}
      />
    </>
  )
}

/**
 * A message's reactions. One per person, so picking a second emoji moves your
 * reaction rather than adding another — which is why the add button stays put
 * even after you have reacted.
 */
export function ReactionBar({ groups, onToggle }: ReactionBarProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const addRef = useRef<HTMLButtonElement>(null)

  if (groups.length === 0) return null

  const mine = groups.find((g) => g.mine)

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1">
      {groups.map((g) => <ReactionPill key={g.emoji} group={g} onToggle={onToggle} />)}

      <button
        ref={addRef}
        onClick={() => setPickerOpen((v) => !v)}
        aria-label={mine ? `Change your reaction, currently ${mine.emoji}` : 'Add reaction'}
        title={mine ? 'Change your reaction' : 'Add reaction'}
        className="flex size-6 items-center justify-center rounded-full border border-border-default bg-surface-2 text-text-3 transition-colors hover:border-border-strong hover:text-text-1"
      >
        <SmilePlus size={12} />
      </button>

      <EmojiPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        anchorRef={addRef}
        onPick={(emoji) => { setPickerOpen(false); onToggle(emoji) }}
      />
    </div>
  )
}
