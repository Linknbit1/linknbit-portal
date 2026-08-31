import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface PeriodStepperProps {
  label: string
  onPrev: () => void
  onNext: () => void
  disablePrev?: boolean
  disableNext?: boolean
  /** Optional leading icon inside the label pill (e.g. Calendar). */
  icon?: LucideIcon
  /** Optional trailing content inside the label pill (e.g. a count). */
  children?: ReactNode
  /**
   * Extra classes for the label itself. A caller whose label changes width as it
   * steps — "All months" against "September 2026" — pins a min-width here so the
   * controls beside it do not shuffle sideways every time it changes.
   */
  labelClassName?: string
  className?: string
}

/**
 * A compact `‹ Label ›` prev/next stepper used for year/month navigation. Controls
 * are a uniform `h-8` so the row aligns with adjacent `Button`s and `Select`s, and
 * the whole stepper stays on one line (`shrink-0`).
 */
export function PeriodStepper({
  label, onPrev, onNext, disablePrev, disableNext, icon: Icon, children, labelClassName, className,
}: PeriodStepperProps) {
  const btn = 'size-8 rounded-sm bg-surface-1 border border-border-default flex items-center justify-center text-text-3 hover:text-text-1 hover:border-border-strong transition-colors disabled:opacity-40 disabled:hover:text-text-3 disabled:hover:border-border-default shrink-0'
  return (
    <div className={cn('flex items-center gap-2 shrink-0', className)}>
      <button type="button" onClick={onPrev} disabled={disablePrev} className={btn} aria-label="Previous">
        <ChevronLeft size={15} />
      </button>
      <div className="h-8 bg-surface-1 border border-border-default rounded-lg px-3.5 flex items-center gap-2 whitespace-nowrap">
        {Icon && <Icon size={14} className="text-brand-red shrink-0" />}
        <span className={cn('font-display font-semibold text-[14px] text-text-1', labelClassName)}>{label}</span>
        {children}
      </div>
      <button type="button" onClick={onNext} disabled={disableNext} className={btn} aria-label="Next">
        <ChevronRight size={15} />
      </button>
    </div>
  )
}
