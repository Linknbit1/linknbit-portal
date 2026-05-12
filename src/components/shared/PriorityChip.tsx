import { cn } from '../../lib/cn'
import type { Priority } from '../../types'

const PRIORITY_CONFIG: Record<Priority, { label: string; classes: string; dot: string }> = {
  critical: { label: 'Critical', dot: 'bg-error', classes: 'bg-error/10 text-error border border-error/30' },
  high: { label: 'High', dot: 'bg-warning', classes: 'bg-warning/10 text-warning border border-warning/30' },
  medium: { label: 'Medium', dot: 'bg-info', classes: 'bg-info/10 text-info border border-info/30' },
  low: { label: 'Low', dot: 'bg-text-4', classes: 'bg-surface-2 text-text-3 border border-border-default' },
}

interface PriorityChipProps {
  priority: Priority
  size?: 'sm' | 'md'
  className?: string
}

export function PriorityChip({ priority, size = 'sm', className }: PriorityChipProps) {
  const config = PRIORITY_CONFIG[priority]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-ui font-semibold rounded-xs',
        size === 'sm' ? 'text-caption px-1.5 py-0.5' : 'text-body-sm px-2.5 py-1',
        config.classes,
        className,
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', config.dot)} />
      {config.label}
    </span>
  )
}
