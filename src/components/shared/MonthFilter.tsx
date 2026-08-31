import { Calendar } from 'lucide-react'
import { PeriodStepper } from '../ui/PeriodStepper'
import { cn } from '../../lib/cn'
import { formatDayHeading } from '../../lib/dateGroups'
import type { MonthFilter } from '../../hooks/useMonthFilter'

/**
 * "All months" toggle, then the month stepper — the switch that decides whether
 * the stepper applies at all reads before the thing it governs, not after it.
 *
 * `hideAllMonths` drops the toggle where an all-months view makes no sense (the
 * member profile). `hideCurrent` drops the "Current" badge for a toolbar that
 * cannot afford the pill changing width: the badge appears only on this month,
 * so stepping onto it would resize the control and nudge its neighbours. The
 * next arrow already goes dead on the current month, which says the same thing
 * without occupying space that comes and goes.
 */
export function MonthStepper({
  filter,
  hideAllMonths = false,
  hideCurrent = false,
}: {
  filter: MonthFilter
  hideAllMonths?: boolean
  hideCurrent?: boolean
}) {
  return (
    <>
      {!hideAllMonths && (
        <button
          type="button"
          onClick={() => filter.setAllMonths(!filter.allMonths)}
          aria-pressed={filter.allMonths}
          className={cn(
            'h-8 px-3 rounded-sm border font-ui font-semibold text-[12px] transition-colors shrink-0',
            filter.allMonths
              ? 'bg-brand-red/10 border-brand-red/30 text-brand-red'
              : 'bg-surface-1 border-border-default text-text-3 hover:text-text-1 hover:border-border-strong',
          )}
        >
          All months
        </button>
      )}
      <PeriodStepper
        icon={Calendar}
        label={filter.label}
        // "All months" is much shorter than "September 2026"; without a floor the
        // pill resized on every toggle and shoved whatever sat beside it.
        labelClassName="min-w-28 text-center text-[12.5px]"
        onPrev={filter.prevMonth}
        onNext={filter.nextMonth}
        disablePrev={filter.allMonths}
        disableNext={filter.allMonths || filter.isCurrentMonth}
        className={cn(filter.allMonths && 'opacity-50')}
      >
        {!hideCurrent && !filter.allMonths && filter.isCurrentMonth && (
          <span className="ml-1 px-1.5 py-0.5 rounded-xs bg-brand-red/10 border border-brand-red/20 text-brand-red text-[10px] font-mono font-semibold uppercase tracking-wide">
            Current
          </span>
        )}
      </PeriodStepper>
    </>
  )
}

/**
 * Sticky day heading above a group of requests. `count` shows how many fall on it.
 * `className` exists for callers that stack it under other sticky layers — pass a
 * `top-*` to override the default, which tailwind-merge resolves.
 */
export function DateGroupHeading({ date, count, className }: { date: string; count: number; className?: string }) {
  const { label, relative } = formatDayHeading(date)
  return (
    <div className={cn('sticky top-0 z-10 flex items-center gap-2 px-5 py-2 bg-surface-2/95 backdrop-blur-sm border-y border-border-subtle', className)}>
      <span className="font-display font-semibold text-[12.5px] text-text-1">{label}</span>
      {relative && (
        <span className="px-1.5 py-0.5 rounded-xs bg-brand-red/10 border border-brand-red/20 text-brand-red text-[10px] font-mono font-semibold uppercase tracking-wide">
          {relative}
        </span>
      )}
      <span className="ml-auto font-mono text-[11px] text-text-4">{count}</span>
    </div>
  )
}
