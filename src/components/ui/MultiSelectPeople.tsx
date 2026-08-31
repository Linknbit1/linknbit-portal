import { Fragment, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { ChevronDown, Check, Search } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Popover } from './Popover'
import { Avatar, AvatarGroup } from './Avatar'
import { DepartedBadge } from './DepartedBadge'
import { OptionGroupHeading } from './OptionGroupHeading'
import { SEARCHABLE_BY_DEFAULT, matchesQuery, shouldAutoFocusSearch } from './optionSearch'

export interface PersonOption {
  id: string
  name: string
  avatar_url?: string | null
  /**
   * Someone who has left the company but is still attached to this record. They
   * are never offered as a new choice — only shown, flagged, when already
   * selected, so the work reads as needing reassignment instead of quietly
   * looking unassigned.
   */
  departed?: boolean
  /**
   * Heading this person sits under. Drawn whenever the group changes, so people
   * sharing a group must be adjacent in the array — the caller's order decides
   * which group comes first, and nothing is re-sorted here.
   */
  group?: string
}

interface MultiSelectPeopleProps {
  value: string[]
  onChange: (ids: string[]) => void
  options: PersonOption[]
  placeholder?: string
  size?: 'sm' | 'md'
  /**
   * Dismiss the popover after each pick. On for assigning a task, where it is
   * usually one person and the open list covered the row it had just changed.
   * Off by default — the bulk pickers (channel members, project staffing, role
   * assignment) exist precisely to choose several people in one pass.
   */
  closeOnSelect?: boolean
  /** Opt a picker out of the search box; on everywhere by default. */
  searchable?: boolean
  className?: string
}

interface PeopleMenuProps {
  options: PersonOption[]
  value: string[]
  searchable: boolean
  onToggle: (id: string) => void
  onClose: () => void
}

/**
 * The open list. Split out so the query only lives while the menu is open, and
 * every reopen starts from a clean search.
 */
function PeopleMenu({ options, value, searchable, onToggle, onClose }: PeopleMenuProps) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(
    () => options.filter((o) => matchesQuery(query, o.name)),
    [options, query],
  )
  const activeIndex = Math.min(active, Math.max(filtered.length - 1, 0))

  useEffect(() => { if (shouldAutoFocusSearch()) inputRef.current?.focus() }, [])

  // Keep the highlighted row visible without scrollIntoView, which would also
  // scroll whatever sits behind the portal.
  useEffect(() => {
    const list = listRef.current
    // Queried rather than indexed into children: group headings share the
    // scroller with the rows, so position no longer equals option index.
    const row = list?.querySelector(`[data-index="${activeIndex}"]`)
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
      if (opt) onToggle(opt.id)
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
              placeholder="Search people…"
              aria-label="Search people"
              className="min-w-0 flex-1 bg-transparent py-1.5 font-ui text-[12.5px] text-text-1 outline-none placeholder:text-text-4"
            />
          </div>
        </div>
      )}

      <div ref={listRef} className="max-h-[min(50vh,18rem)] overflow-y-auto">
        {filtered.map((o, i) => {
          const on = value.includes(o.id)
          return (
            <Fragment key={o.id}>
              {o.group && o.group !== filtered[i - 1]?.group && <OptionGroupHeading label={o.group} />}
            <button
              type="button"
              data-index={i}
              onClick={() => onToggle(o.id)}
              onMouseEnter={() => setActive(i)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 text-left text-[13px] font-ui text-text-1 transition-colors',
                i === activeIndex ? 'bg-surface-3' : on && 'bg-surface-3/60',
              )}
            >
              <Avatar name={o.name} src={o.avatar_url ?? undefined} size="xs" />
              <span className={cn('flex-1 min-w-0 truncate', o.departed && 'text-text-3')}>{o.name}</span>
              {o.departed && <DepartedBadge />}
              {on && <Check size={13} className="text-brand-red shrink-0" />}
            </button>
            </Fragment>
          )
        })}

        {filtered.length === 0 && (
          <div className="p-3 text-center font-ui text-[12px] text-text-4">
            {options.length === 0 ? 'No people available' : 'No matches'}
          </div>
        )}
      </div>
    </div>
  )
}

/** Multi-select people picker — chips for the chosen set, checkbox list in a popover. */
export function MultiSelectPeople({
  value, onChange, options, placeholder = 'Unassigned', size = 'md', closeOnSelect, searchable, className,
}: MultiSelectPeopleProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const selected = options.filter((o) => value.includes(o.id))
  const withSearch = searchable ?? SEARCHABLE_BY_DEFAULT
  const departedSelected = selected.filter((o) => o.departed)
  // A leaver stays listed only while still assigned, so they can be removed —
  // never as a fresh choice.
  const choosable = options.filter((o) => !o.departed || value.includes(o.id))

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])
    if (closeOnSelect) setOpen(false)
  }

  return (
    <div className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'w-full flex items-center gap-1.5 bg-surface-inset border border-border-default rounded-sm text-text-1 hover:bg-surface-2 transition-colors',
          size === 'sm' ? 'min-h-8 px-2.5 py-1 text-[11.5px]' : 'min-h-9 px-3 py-1 text-[13px]',
          open && 'border-border-focus',
        )}
      >
        <span className="flex-1 flex items-center gap-2 py-0.5 min-w-0">
          {selected.length === 0 ? (
            <span className="font-ui font-medium text-text-3">{placeholder}</span>
          ) : (
            <>
              <AvatarGroup
                users={selected.map((p) => ({ id: p.id, name: p.name, avatarUrl: p.avatar_url ?? undefined }))}
                max={4}
                size="xs"
              />
              <span className="font-ui text-[11.5px] text-text-2 truncate">
                {selected.length === 1 ? selected[0].name : `${selected.length} assigned`}
              </span>
              {departedSelected.length > 0 && <DepartedBadge label="Reassign" />}
            </>
          )}
        </span>
        <ChevronDown size={12} className="text-text-3 shrink-0" />
      </button>

      <Popover
        anchorRef={triggerRef}
        open={open}
        onClose={() => setOpen(false)}
        matchAnchorWidth
        className="max-w-[calc(100vw-2rem)] bg-surface-2 border border-border-strong rounded-md shadow-lg overflow-hidden"
      >
<PeopleMenu
          options={choosable}
          value={value}
          searchable={withSearch}
          onToggle={toggle}
          onClose={() => setOpen(false)}
        />
      </Popover>
    </div>
  )
}
