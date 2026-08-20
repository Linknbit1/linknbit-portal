import { Download, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Button } from '../ui/Button'
import { DatePicker } from '../ui/DatePicker'
import { cn } from '../../lib/cn'
import { formatMinutes } from '../../lib/duration'
import type { DateRange, RangePreset } from './reportRange'

interface RangePickerProps {
  preset: RangePreset
  onPreset: (p: RangePreset) => void
  custom: DateRange
  onCustom: (r: DateRange) => void
  /** Rendered on the right — the export button, usually. */
  actions?: React.ReactNode
}

export function RangePicker({ preset, onPreset, custom, onCustom, actions }: RangePickerProps) {
  const options: { value: RangePreset; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This week' },
    { value: 'month', label: 'This month' },
    { value: 'custom', label: 'Custom' },
  ]

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex rounded-md border border-border-default bg-surface-1 p-0.5">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onPreset(o.value)}
            className={cn(
              'rounded-sm px-3 py-1.5 font-ui text-[12px] font-medium transition-colors',
              preset === o.value
                ? 'bg-brand-red/13 text-text-1'
                : 'text-text-3 hover:bg-surface-2 hover:text-text-2',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>

      {preset === 'custom' && (
        <div className="flex items-center gap-2">
          <DatePicker
            value={custom.from}
            onChange={(v) => onCustom({ ...custom, from: v })}
            placeholder="From"
          />
          <span className="font-ui text-[12px] text-text-4">to</span>
          <DatePicker
            value={custom.to}
            onChange={(v) => onCustom({ ...custom, to: v })}
            minDate={custom.from || undefined}
            placeholder="To"
          />
        </div>
      )}

      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </div>
  )
}

/**
 * Standup minutes minus timer minutes.
 *
 * Positive means more was claimed than tracked; negative means work happened
 * that no standup mentioned. Zero is the only unremarkable answer, so it is the
 * only one drawn quietly.
 */
export function VarianceChip({ minutes }: { minutes: number }) {
  if (minutes === 0) {
    return (
      <span className="inline-flex items-center gap-1 font-mono text-[12px] text-text-4">
        <Minus size={11} /> 0m
      </span>
    )
  }
  const over = minutes > 0
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-mono text-[12px] font-semibold',
        over ? 'text-warning' : 'text-service-dev',
      )}
      title={over
        ? 'More was written up than the timer recorded'
        : 'The timer recorded more than the standups accounted for'}
    >
      {over ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {over ? '+' : '−'}{formatMinutes(Math.abs(minutes))}
    </span>
  )
}

export function ExportButton({ onExport, disabled }: { onExport: () => void; disabled?: boolean }) {
  return (
    <Button variant="secondary" size="sm" onClick={onExport} disabled={disabled}>
      <Download size={13} /> Export CSV
    </Button>
  )
}
