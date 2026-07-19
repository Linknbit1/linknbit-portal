import { forwardRef, useEffect, useImperativeHandle, useState, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Avatar } from '../ui/Avatar'
import { SUGGESTION_MENU_CLASS, type SuggestionListRef } from './suggestionUtils'

export interface SuggestionItem {
  id?: string
  label: string
  hint?: string
  avatar?: { name: string; url?: string | null }
  icon?: ReactNode
  // Slash-command items carry an action; passed straight back via command(item).
  [key: string]: unknown
}

interface SuggestionListProps {
  items: SuggestionItem[]
  command: (item: SuggestionItem) => void
}

/** Keyboard-navigable list rendered inside suggestion popups (@mentions, #files, / commands). */
export const SuggestionList = forwardRef<SuggestionListRef, SuggestionListProps>(({ items, command }, ref) => {
  const [index, setIndex] = useState(0)
  useEffect(() => setIndex(0), [items])

  const pick = (i: number) => { const it = items[i]; if (it) command(it) }

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (!items.length) return false
      if (event.key === 'ArrowUp') { setIndex((i) => (i + items.length - 1) % items.length); return true }
      if (event.key === 'ArrowDown') { setIndex((i) => (i + 1) % items.length); return true }
      if (event.key === 'Enter') { pick(index); return true }
      return false
    },
  }))

  if (!items.length) return <div className={SUGGESTION_MENU_CLASS}><div className="px-2 py-1.5 text-[12px] text-text-4">No matches</div></div>

  return (
    <div className={SUGGESTION_MENU_CLASS}>
      {items.map((item, i) => (
        <button
          key={item.id ?? item.label}
          type="button"
          onMouseEnter={() => setIndex(i)}
          onClick={() => pick(i)}
          className={cn(
            'w-full flex items-center gap-2.5 px-2 py-1.5 rounded-sm text-left text-[13px] font-ui text-text-1 transition-colors',
            i === index ? 'bg-surface-3' : 'hover:bg-surface-3/60',
          )}
        >
          {item.avatar && <Avatar name={item.avatar.name} src={item.avatar.url ?? undefined} size="xs" />}
          {item.icon && <span className="text-text-3 shrink-0 flex items-center">{item.icon}</span>}
          <span className="flex-1 min-w-0 truncate">{item.label}</span>
          {item.hint && <span className="text-[11px] text-text-4 shrink-0">{item.hint}</span>}
        </button>
      ))}
    </div>
  )
})

SuggestionList.displayName = 'SuggestionList'
