import { cn } from '../../lib/cn'

interface ProgressBarProps {
  value: number
  max?: number
  size?: 'xs' | 'sm' | 'md'
  variant?: 'default' | 'gradient' | 'success' | 'warning' | 'error'
  showLabel?: boolean
  className?: string
  animated?: boolean
}

export function ProgressBar({
  value,
  max = 100,
  size = 'sm',
  variant = 'default',
  showLabel,
  className,
  animated,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div className={cn('w-full', className)}>
      <div
        className={cn(
          'w-full bg-surface-3 overflow-hidden',
          { 'h-1': size === 'xs', 'h-1.5': size === 'sm', 'h-2.5': size === 'md' },
        )}
      >
        <div
          className={cn(
            'h-full transition-all duration-500',
            animated && 'animate-pulse-subtle',
            {
              'bg-brand-red': variant === 'default',
              'bg-xp-gradient': variant === 'gradient',
              'bg-success': variant === 'success',
              'bg-warning': variant === 'warning',
              'bg-error': variant === 'error',
            },
          )}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemax={max}
        />
      </div>
      {showLabel && (
        <span className="text-caption text-text-3 mt-1">{Math.round(pct)}%</span>
      )}
    </div>
  )
}
