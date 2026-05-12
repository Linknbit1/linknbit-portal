import { cn } from '../../lib/cn'
import { Zap } from 'lucide-react'

interface XPBarProps {
  current: number
  max: number
  level: number
  showNextLabel?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function XPBar({ current, max, level, showNextLabel = true, className, size = 'md' }: XPBarProps) {
  const pct = Math.min(100, (current / max) * 100)

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className={cn('font-display font-bold text-text-1', size === 'sm' ? 'text-caption' : 'text-body-sm')}>
          Lv {level}
        </span>
        <span className={cn('font-mono text-text-3 flex items-center gap-1', size === 'sm' ? 'text-[10px]' : 'text-caption')}>
          <Zap size={10} className="text-coin-gold" />
          {current.toLocaleString()} / {max.toLocaleString()} XP
        </span>
        {showNextLabel && (
          <span className={cn('font-display font-bold text-text-3', size === 'sm' ? 'text-caption' : 'text-body-sm')}>
            Lv {level + 1}
          </span>
        )}
      </div>
      <div className={cn('w-full rounded-full overflow-hidden bg-surface-3', size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3' : 'h-2')}>
        <div
          className="h-full rounded-full bg-xp-gradient transition-all duration-700 shadow-[0_0_8px_rgba(251,191,36,0.4)]"
          style={{ width: `${pct}%` }}
        />
      </div>
      {size !== 'sm' && (
        <p className="text-caption text-text-3 font-ui">
          {(max - current).toLocaleString()} XP to Level {level + 1}
        </p>
      )}
    </div>
  )
}
