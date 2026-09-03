import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, Search, Globe } from 'lucide-react'
import { cn } from '../../lib/cn'

const ALL_TIMEZONES: string[] = (() => {
  try {
    return (Intl as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.('timeZone') ?? []
  } catch {
    // Fallback for environments that don't support Intl.supportedValuesOf
    return ['Asia/Karachi', 'UTC', 'America/New_York', 'Europe/London', 'Asia/Dubai']
  }
})()

interface TimezoneSelectProps {
  value: string
  onChange: (tz: string) => void
  className?: string
}

export function TimezoneSelect({ value, onChange, className }: TimezoneSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [highlighted, setHighlighted] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const filtered = useMemo(() => {
    if (!search.trim()) return ALL_TIMEZONES
    const q = search.toLowerCase()
    return ALL_TIMEZONES.filter((tz) => tz.toLowerCase().includes(q))
  }, [search])

  useEffect(() => {
    if (!open) return
    const timeout = setTimeout(() => searchRef.current?.focus(), 30)
    return () => clearTimeout(timeout)
  }, [open])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ') { setOpen(true); e.preventDefault() }
      return
    }
    if (e.key === 'ArrowDown') {
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1))
      e.preventDefault()
    } else if (e.key === 'ArrowUp') {
      setHighlighted((h) => Math.max(h - 1, 0))
      e.preventDefault()
    } else if (e.key === 'Enter') {
      if (filtered[highlighted]) { select(filtered[highlighted]); e.preventDefault() }
    } else if (e.key === 'Escape') {
      setOpen(false); setSearch(''); e.preventDefault()
    }
  }

  useEffect(() => {
    if (!open || !listRef.current) return
    const item = listRef.current.children[highlighted] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [highlighted, open])

  const select = (tz: string) => {
    onChange(tz)
    setOpen(false)
    setSearch('')
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    setHighlighted(0)
  }

  return (
    <div ref={containerRef} className={cn('relative', className)} onKeyDown={handleKeyDown}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'w-full flex items-center gap-2 bg-surface-inset border rounded-md px-3 py-2 text-left transition-colors',
          open ? 'border-border-focus' : 'border-border-default hover:border-border-strong',
        )}
      >
        <Globe size={13} className="text-text-4 shrink-0" />
        <span className="flex-1 font-mono text-[13px] text-text-1 truncate min-w-0">
          {value || 'Select timezone…'}
        </span>
        <ChevronDown
          size={13}
          className={cn('text-text-4 shrink-0 transition-transform', open && 'rotate-180')}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-full inset-x-0 mt-1 bg-surface-2 border border-border-strong rounded-md shadow-pop overflow-hidden">
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border-subtle">
            <Search size={12} className="text-text-4 shrink-0" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search timezones…"
              className="flex-1 bg-transparent font-mono text-[12px] text-text-1 placeholder:text-text-4 outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-text-4 hover:text-text-2 transition-colors text-[11px]"
              >
                ✕
              </button>
            )}
          </div>

          {/* List */}
          <ul
            ref={listRef}
            className="max-h-52 overflow-y-auto py-1"
            role="listbox"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 font-ui text-[12px] text-text-4">No timezones match "{search}"</li>
            ) : (
              filtered.map((tz, i) => (
                <li
                  key={tz}
                  role="option"
                  aria-selected={tz === value}
                  onClick={() => select(tz)}
                  className={cn(
                    'flex items-center justify-between px-3 py-1.5 font-mono text-[12px] cursor-pointer transition-colors',
                    i === highlighted ? 'bg-surface-2 text-text-1' : 'text-text-2 hover:bg-surface-2/50 hover:text-text-1',
                    tz === value && 'text-brand-red',
                  )}
                >
                  <span className="truncate">{tz}</span>
                  {tz === value && <span className="text-brand-red ml-2 shrink-0">✓</span>}
                </li>
              ))
            )}
          </ul>

          {filtered.length > 0 && (
            <div className="px-3 py-1.5 border-t border-border-subtle font-mono text-[10px] text-text-4">
              {filtered.length} timezone{filtered.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
