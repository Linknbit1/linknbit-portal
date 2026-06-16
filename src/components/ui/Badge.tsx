import { cn } from '../../lib/cn'
import type { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'ghost'
  size?: 'sm' | 'md'
  className?: string
  dot?: boolean
}

export function Badge({ children, variant = 'default', size = 'sm', className, dot }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-ui font-semibold rounded-xs tracking-wide',
        {
          'text-caption px-1.5 py-0.5': size === 'sm',
          'text-body-sm px-2 py-1': size === 'md',
        },
        {
          'bg-surface-2 text-text-2 border border-border-default': variant === 'default',
          'bg-success/10 text-success border border-success/30': variant === 'success',
          'bg-warning/10 text-warning border border-warning/30': variant === 'warning',
          'bg-error/10 text-error border border-error/30': variant === 'error',
          'bg-info/10 text-info border border-info/30': variant === 'info',
          'bg-transparent text-text-3': variant === 'ghost',
        },
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}
