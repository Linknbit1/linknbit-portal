import { useState, useRef, useEffect, useMemo, type KeyboardEvent } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Popover } from './Popover'
import { Avatar } from './Avatar'
import { DepartedBadge } from './DepartedBadge'
import { SEARCHABLE_BY_DEFAULT, matchesQuery, shouldAutoFocusSearch } from './optionSearch'

export interface SelectOption {
  value: string
  label: string
  dot?: string
  /** Optional avatar shown before the label (employee pickers). Falls back to initials. */
  avatar?: { name: string; url?: string | null }
  /**
   * Someone who has left the company but is still what this field holds. Mirrors
   * MultiSelectPeople: only ever listed while selected, so the field reads as
   * "needs reassigning" rather than silently falling back to the placeholder.
   */
  departed?: boolean
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  label?: string
  className?: string
  size?: 'sm' | 'md'
  /** Opt a picker out of the search box; on everywhere by default. */
  searchable?: boolean
}

interface SelectMenuProps {
  options: SelectOption[]
  value: string
  searchable: boolean
  onPick: (value: string) => void
  onClose: () => void
}

/**
 * The open menu. Split out so its query and highlight live only while it is
 * open — reopening a dropdown always starts from an empty search rather than
 * whatever was typed last time.
 */
function SelectMenu({ options, value, searchable, onPick, onClose }: SelectMenuProps) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(() => Math.max(0, options.findIndex((o) => o.value === value)))
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Matches the avatar name too: a person's option label is sometimes their role
  // or email, and people search by the name they can see.
  const filtered = useMemo(
    () => options.filter((o) => matchesQuery(query, o.label, o.avatar?.name)),
    [options, query],
  )

  // Filtering can strand the highlight past the end of the shorter list.
  const activeIndex = Math.min(active, Math.max(filtered.length - 1, 0))

  // Typing is the whole point — the field takes focus as the menu opens.
  useEffect(() => { if (shouldAutoFocusSearch()) inputRef.current?.focus() }, [])

  // Keep the highlighted row visible without scrollIntoView, which would also
  // scroll whatever sits behind the portal.
  useEffect(() => {
    const list = listRef.current
    const row = list?.children[activeIndex]
    if (!list || !(row instanceof HTMLElement)) return
    if (row.offsetTop < list.scrollTop) list.scrollTop = row.offsetTop
    else if (row.offsetTop + row.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = row.offsetTop + row.offsetHeight - list.clientHeight
    }
  }, [activeIndex])

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive(Math.min(activeIndex + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(Math.max(activeIndex - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const opt = filtered[activeIndex]
      if (opt) onPick(opt.value)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  return (
    <div onKeyDown={onKeyDown}>
      {searchable && (
        <div className="border-b border-border-default p-1.5">
          <div className="flex items-center gap-2 rounded-sm border border-border-default bg-surface-inset px-2">
            <Search size={12} className="shrink-0 text-text-4" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActive(0) }}
              placeholder="Search…"
              aria-label="Search options"
              className="min-w-0 flex-1 bg-transparent py-1.5 font-ui text-[12.5px] text-text-1 outline-none placeholder:text-text-4"
            />
          </div>
        </div>
      )}

      <div ref={listRef} className="max-h-[min(60vh,18rem)] overflow-y-auto">
        {filtered.map((opt, i) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onPick(opt.value)}
            onMouseEnter={() => setActive(i)}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 text-left text-[13px] font-ui font-medium text-text-1 transition-colors',
              i === activeIndex && 'bg-surface-3',
            )}
          >
            {opt.avatar && (
              <Avatar name={opt.avatar.name} src={opt.avatar.url ?? undefined} size="xs" />
            )}
            {opt.dot && (
              <span className="size-2 rounded-full shrink-0" style={{ background: opt.dot }} />
            )}
            <span className={cn('min-w-0 flex-1 truncate', opt.departed && 'text-text-3')}>{opt.label}</span>
            {opt.departed && <DepartedBadge />}
            {opt.value === value && <Check size={13} className="shrink-0 text-brand-red" />}
          </button>
        ))}

        {filtered.length === 0 && (
          <p className="px-3 py-4 text-center font-ui text-[12px] text-text-4">No matches</p>
        )}
      </div>
    </div>
  )
}

export function Select({
  value, onChange, options, placeholder, label, className, size = 'md', searchable,
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const selected = options.find((o) => o.value === value)
  const withSearch = searchable ?? SEARCHABLE_BY_DEFAULT
  // A leaver stays listed only while still selected, so they can be replaced —
  // never as a fresh choice.
  const choosable = options.filter((o) => !o.departed || o.value === value)

  return (
    <div className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'w-full flex items-center gap-2 bg-surface-inset border border-border-default rounded-sm text-text-1 cursor-pointer whitespace-nowrap hover:bg-surface-2 transition-colors',
          size === 'sm' ? 'h-8 px-2.5 text-[11.5px]' : 'h-9 px-3 text-[13px]',
          open && 'border-border-focus',
        )}
      >
        {label && <span className="text-text-3 font-ui font-medium">{label}</span>}
        {selected?.avatar && (
          <Avatar name={selected.avatar.name} src={selected.avatar.url ?? undefined} size="xs" />
        )}
        {selected?.dot && (
          <span className="size-2 rounded-full shrink-0" style={{ background: selected.dot }} />
        )}
        <span className={cn('font-ui font-semibold flex-1 min-w-0 truncate text-left', !selected && 'text-text-3 font-medium')}>
          {selected?.label ?? placeholder ?? 'Select'}
        </span>
        {selected?.departed && <DepartedBadge label="Reassign" />}
        <ChevronDown size={12} className="text-text-3 shrink-0" />
      </button>

      <Popover
        anchorRef={triggerRef}
        open={open}
        onClose={() => setOpen(false)}
        matchAnchorWidth
        className="max-w-[calc(100vw-2rem)] bg-surface-2 border border-border-strong rounded-md shadow-lg overflow-hidden"
      >
<SelectMenu
          options={choosable}
          value={value}
          searchable={withSearch}
          onPick={(v) => { onChange(v); setOpen(false) }}
          onClose={() => setOpen(false)}
        />
      </Popover>
    </div>
  )
}
