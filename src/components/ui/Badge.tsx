import { cn } from '../../lib/cn'
import type { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'ghost'
  size?: 'sm' | 'md'
  className?: string
  dot?: boolean
}

/**
 * Shares StatusChip's pill treatment (uppercase micro-label, tinted fill, matching
 * border) so status-ish UI reads as one family — but keeps softly rounded corners
 * rather than StatusChip's fully-rounded edges.
 */
export function Badge({ children, variant = 'default', size = 'sm', className, dot }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm font-ui font-semibold uppercase tracking-[0.04em] leading-[1.4] whitespace-nowrap border',
        {
          'py-0.75 px-2.25 text-[10.5px]': size === 'sm',
          'py-1 px-2.5 text-[11.5px]': size === 'md',
        },
        {
          'bg-surface-3 text-text-2 border-border-default': variant === 'default',
          'bg-success/12 text-success border-success/30': variant === 'success',
          'bg-warning/12 text-warning border-warning/30': variant === 'warning',
          'bg-error/12 text-error border-error/30': variant === 'error',
          'bg-info/12 text-info border-info/30': variant === 'info',
          // Borderless look, but keeps the same box so rows stay aligned.
          'bg-transparent text-text-3 border-transparent': variant === 'ghost',
        },
        className,
      )}
    >
      {dot && <span className="size-1.25 rounded-full bg-current shrink-0" />}
      {children}
    </span>
  )
}
