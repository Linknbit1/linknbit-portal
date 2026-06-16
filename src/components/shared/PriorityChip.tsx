import { cn } from '../../lib/cn'
import type { Priority } from '../../types'

const PRIORITY_CONFIG: Record<Priority, { label: string; classes: string }> = {
  critical: { label: 'Critical', classes: 'bg-[rgba(244,54,76,0.18)] text-[#F4364C] border-[rgba(244,54,76,0.4)]' },
  high:     { label: 'High',     classes: 'bg-[rgba(245,158,11,0.18)] text-[#F59E0B] border-[rgba(245,158,11,0.4)]' },
  medium:   { label: 'Medium',   classes: 'bg-[rgba(59,130,246,0.18)] text-[#60A5FA] border-[rgba(59,130,246,0.4)]' },
  low:      { label: 'Low',      classes: 'bg-surface-2 text-text-3 border-border-default' },
}

interface PriorityChipProps {
  priority: Priority
  className?: string
}

export function PriorityChip({ priority, className }: PriorityChipProps) {
  const config = PRIORITY_CONFIG[priority]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 py-0.75 px-2.25 rounded-full font-ui font-semibold text-[10.5px] uppercase tracking-[0.04em] leading-[1.4] whitespace-nowrap border',
        config.classes,
        className,
      )}
    >
      <span className="size-1.25 rounded-full bg-current shrink-0" />
      {config.label}
    </span>
  )
}
