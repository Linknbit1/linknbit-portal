import { TrendingUp, TrendingDown, Minus, type LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'

type Tone = 'default' | 'success' | 'warning' | 'error'

const TONE_TILE: Record<Tone, string> = {
  default: 'bg-surface-1 border-border-default',
  success: 'bg-success/5 border-success/30',
  warning: 'bg-warning/5 border-warning/30',
  error:   'bg-error/5 border-error/30',
}

const TONE_ICON: Record<Tone, string> = {
  default: 'bg-surface-2 border-border-subtle text-text-2',
  success: 'bg-success/15 border-success/30 text-success',
  warning: 'bg-warning/15 border-warning/30 text-warning',
  error:   'bg-error/15 border-error/30 text-error',
}

interface BdKpiTileProps {
  icon: LucideIcon
  label: string
  value: string
  /** Small trailing word beside the figure — "leads", "%", "days". */
  unit?: string
  /** Period-over-period movement. `direction` colours it; it is not inferred from the string. */
  delta?: { label: string; direction: 'up' | 'down' | 'flat'; caption?: string }
  tone?: Tone
  className?: string
}

/**
 * The KPI tile used across the BD dashboards. Matches the stat cards on the main
 * dashboard so the two read as one system, but takes its numbers as pre-formatted
 * strings — BD figures are money, percentages and day counts, which format
 * differently from each other.
 */
export function BdKpiTile({ icon: Icon, label, value, unit, delta, tone = 'default', className }: BdKpiTileProps) {
  const DeltaIcon = delta?.direction === 'up' ? TrendingUp : delta?.direction === 'down' ? TrendingDown : Minus

  return (
    <div className={cn('rounded-lg border p-5 flex flex-col gap-3', TONE_TILE[tone], className)}>
      <div className="flex items-center gap-2 text-[11px] font-ui font-semibold text-text-3 uppercase tracking-widest">
        <span className={cn('size-7 rounded-[7px] border flex items-center justify-center shrink-0', TONE_ICON[tone])}>
          <Icon size={14} />
        </span>
        <span className="min-w-0 truncate">{label}</span>
      </div>

      <div className="font-display font-bold text-[30px] lg:text-[34px] text-text-1 leading-none tracking-tight tabular-nums flex items-baseline gap-2">
        <span className="min-w-0 truncate">{value}</span>
        {unit && <span className="text-body-sm text-text-3 font-ui font-medium tracking-normal shrink-0">{unit}</span>}
      </div>

      {delta && (
        <div
          className={cn(
            'flex items-center gap-1.5 text-[12px] font-ui font-semibold',
            delta.direction === 'up' ? 'text-success' : delta.direction === 'down' ? 'text-error' : 'text-text-3',
          )}
        >
          <DeltaIcon size={12} className="shrink-0" />
          <span>{delta.label}</span>
          {delta.caption && <span className="text-text-3 font-normal ml-0.5 truncate">{delta.caption}</span>}
        </div>
      )}
    </div>
  )
}
