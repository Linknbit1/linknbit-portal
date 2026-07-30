import { useMemo, useState, type RefObject } from 'react'
import { Search } from 'lucide-react'
import { Popover } from '../ui/Popover'
import { cn } from '../../lib/cn'
import { EMOJI_CATEGORIES, searchEmoji, type EmojiEntry } from './emojiData'
import { useRecentEmoji } from '../../hooks/useRecentEmoji'

interface EmojiPickerProps {
  open: boolean
  onClose: () => void
  anchorRef: RefObject<HTMLElement | null>
  onPick: (char: string) => void
}

export function EmojiPicker({ open, onClose, anchorRef, onPick }: EmojiPickerProps) {
  const { recent, pushRecent } = useRecentEmoji()
  const [category, setCategory] = useState(EMOJI_CATEGORIES[0].id)
  const [search, setSearch] = useState('')

  const results = useMemo(() => searchEmoji(search), [search])
  const shown: EmojiEntry[] = search.trim()
    ? results
    : EMOJI_CATEGORIES.find((c) => c.id === category)?.emoji ?? []

  const pick = (char: string) => {
    pushRecent(char)
    onPick(char)
    onClose()
  }

  return (
    <Popover anchorRef={anchorRef} open={open} onClose={onClose}>
      {/* Never wider than the viewport allows — the popover clamps its x position,
          but a fixed width would still overflow a narrow phone. */}
      <div className="w-[min(312px,calc(100vw-24px))] overflow-hidden rounded-md border border-border-strong bg-surface-2 shadow-lg">
        <div className="p-2 border-b border-border-default">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-4 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search emoji"
              aria-label="Search emoji"
              autoFocus
              className="w-full h-8 bg-surface-inset border border-border-default rounded-sm pl-8 pr-2 font-ui text-[12.5px] text-text-1 placeholder:text-text-4 focus:outline-none focus:border-border-focus"
            />
          </div>
        </div>

        {!search.trim() && (
          <>
            <div className="px-2 pt-2">
              <p className="font-mono text-[10px] uppercase tracking-wider text-text-4 mb-1">Frequently used</p>
              <div className="grid grid-cols-8 gap-0.5">
                {recent.slice(0, 8).map((char) => (
                  <button
                    key={`recent-${char}`}
                    onClick={() => pick(char)}
                    className="size-8 rounded-sm text-[18px] leading-none flex items-center justify-center hover:bg-surface-3 transition-colors"
                  >
                    {char}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1 px-2 pt-2">
              {EMOJI_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={cn(
                    'px-2 h-6 rounded-sm font-ui text-[11px] transition-colors',
                    category === c.id ? 'bg-surface-3 text-text-1' : 'text-text-3 hover:text-text-1',
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="max-h-56 overflow-y-auto p-2">
          {shown.length === 0 ? (
            <p className="font-ui text-[12px] text-text-4 text-center py-6">No emoji match "{search}"</p>
          ) : (
            <div className="grid grid-cols-8 gap-0.5">
              {shown.map((e, i) => (
                <button
                  key={`${e.char}-${i}`}
                  onClick={() => pick(e.char)}
                  title={e.name}
                  aria-label={e.name}
                  className="size-8 rounded-sm text-[18px] leading-none flex items-center justify-center hover:bg-surface-3 transition-colors"
                >
                  {e.char}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Popover>
  )
}
