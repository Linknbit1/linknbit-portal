import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'

export interface ViewToggleOption<T extends string> {
  value: T
  label: string
  icon: LucideIcon
}

interface ViewToggleProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: ViewToggleOption<T>[]
  /** Hide the labels and show icons only — for toolbars that are tight on space. */
  compact?: boolean
  className?: string
}

/**
 * Segmented control for switching a list between card and table renderings.
 * Cards are the default view across the portal; the table option stays for
 * dense column scanning.
 */
export function ViewToggle<T extends string>({ value, onChange, options, compact, className }: ViewToggleProps<T>) {
  return (
    <div
      role="group"
      aria-label="View mode"
      className={cn('flex items-center rounded-md border border-border-default bg-surface-inset p-1', className)}
    >
      {options.map((opt) => {
        const Icon = opt.icon
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            aria-label={compact ? opt.label : undefined}
            title={compact ? opt.label : undefined}
            className={cn(
              'inline-flex h-8 items-center gap-2 rounded-sm font-ui text-[12px] font-semibold transition-colors',
              compact ? 'px-2.5' : 'px-3',
              active ? 'bg-surface-2 text-text-1 shadow-sm' : 'text-text-3 hover:text-text-1',
            )}
          >
            <Icon size={14} />
            {!compact && opt.label}
          </button>
        )
      })}
    </div>
  )
}
