import { useRef, useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Popover } from './Popover'
import { Avatar, AvatarGroup } from './Avatar'
import { DepartedBadge } from './DepartedBadge'

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
}

interface MultiSelectPeopleProps {
  value: string[]
  onChange: (ids: string[]) => void
  options: PersonOption[]
  placeholder?: string
  size?: 'sm' | 'md'
  className?: string
}

/** Multi-select people picker — chips for the chosen set, checkbox list in a popover. */
export function MultiSelectPeople({
  value, onChange, options, placeholder = 'Unassigned', size = 'md', className,
}: MultiSelectPeopleProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const selected = options.filter((o) => value.includes(o.id))
  const departedSelected = selected.filter((o) => o.departed)
  // A leaver stays listed only while still assigned, so they can be removed —
  // never as a fresh choice.
  const choosable = options.filter((o) => !o.departed || value.includes(o.id))

  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])

  return (
    <div className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
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
        className="max-w-[calc(100vw-2rem)] bg-surface-2 border border-border-strong rounded-md shadow-lg overflow-hidden max-h-[50vh] overflow-y-auto"
      >
        {choosable.length === 0 && <div className="px-3 py-2 text-[12px] text-text-4">No people available</div>}
        {choosable.map((o) => {
          const on = value.includes(o.id)
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => toggle(o.id)}
              className={cn('w-full flex items-center gap-2.5 px-3 py-2 text-left text-[13px] font-ui text-text-1 hover:bg-surface-3 transition-colors', on && 'bg-surface-3/60')}
            >
              <Avatar name={o.name} src={o.avatar_url ?? undefined} size="xs" />
              <span className={cn('flex-1 min-w-0 truncate', o.departed && 'text-text-3')}>{o.name}</span>
              {o.departed && <DepartedBadge />}
              {on && <Check size={13} className="text-brand-red shrink-0" />}
            </button>
          )
        })}
      </Popover>
    </div>
  )
}
