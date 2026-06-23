import { useState, useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Popover } from './Popover'
import { Avatar } from './Avatar'

export interface SelectOption {
  value: string
  label: string
  dot?: string
  /** Optional avatar shown before the label (employee pickers). Falls back to initials. */
  avatar?: { name: string; url?: string | null }
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  label?: string
  className?: string
  size?: 'sm' | 'md'
}

export function Select({ value, onChange, options, placeholder, label, className, size = 'md' }: SelectProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const selected = options.find((o) => o.value === value)

  return (
    <div className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
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
        <span className={cn('font-ui font-semibold flex-1 min-w-0 text-left', !selected && 'text-text-3 font-medium')}>
          {selected?.label ?? placeholder ?? 'Select'}
        </span>
        <ChevronDown size={12} className="text-text-3 shrink-0" />
      </button>

      <Popover
        anchorRef={triggerRef}
        open={open}
        onClose={() => setOpen(false)}
        matchAnchorWidth
        className="max-w-[calc(100vw-2rem)] bg-surface-2 border border-border-strong rounded-md shadow-lg overflow-hidden max-h-[60vh] overflow-y-auto"
      >
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => { onChange(opt.value); setOpen(false) }}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 text-left text-[13px] font-ui font-medium text-text-1 hover:bg-surface-3 transition-colors',
              opt.value === value && 'bg-surface-3',
            )}
          >
            {opt.avatar && (
              <Avatar name={opt.avatar.name} src={opt.avatar.url ?? undefined} size="xs" />
            )}
            {opt.dot && (
              <span className="size-2 rounded-full shrink-0" style={{ background: opt.dot }} />
            )}
            {opt.label}
          </button>
        ))}
      </Popover>
    </div>
  )
}
