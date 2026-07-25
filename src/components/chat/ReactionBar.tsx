import { useRef, useState } from 'react'
import { SmilePlus } from 'lucide-react'
import { EmojiPicker } from './EmojiPicker'
import { cn } from '../../lib/cn'
import type { ReactionGroup } from '../../hooks/useMessageReactions'

interface ReactionBarProps {
  groups: ReactionGroup[]
  onToggle: (emoji: string) => void
}

export function ReactionBar({ groups, onToggle }: ReactionBarProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const addRef = useRef<HTMLButtonElement>(null)

  if (groups.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1 mt-1.5">
      {groups.map((g) => (
        <button
          key={g.emoji}
          onClick={() => onToggle(g.emoji)}
          title={g.names.join(', ')}
          className={cn(
            'h-6 px-1.5 rounded-full border flex items-center gap-1 transition-colors',
            g.mine
              ? 'bg-brand-red/13 border-brand-red/40 text-text-1'
              : 'bg-surface-2 border-border-default text-text-2 hover:border-border-strong',
          )}
        >
          <span className="text-[13px] leading-none">{g.emoji}</span>
          <span className="font-mono text-[10.5px] tabular-nums">{g.count}</span>
        </button>
      ))}

      <button
        ref={addRef}
        onClick={() => setPickerOpen((v) => !v)}
        aria-label="Add reaction"
        className="size-6 rounded-full border border-border-default bg-surface-2 text-text-3 hover:text-text-1 hover:border-border-strong flex items-center justify-center transition-colors"
      >
        <SmilePlus size={12} />
      </button>

      <EmojiPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        anchorRef={addRef}
        onPick={onToggle}
      />
    </div>
  )
}
