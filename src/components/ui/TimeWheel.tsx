import { useEffect, useRef } from 'react'
import { cn } from '../../lib/cn'
import { to12, to24, type Meridiem } from '../../lib/utils'

/** Clock order — 12 first, the way a face reads. */
const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]

const fmt2 = (n: number) => String(n).padStart(2, '0')

interface WheelColumnProps {
  heading: string
  values: number[]
  active: number
  isDisabled?: (value: number) => boolean
  onSelect: (value: number) => void
}

/**
 * One scrolling column. Rows are full-height buttons rather than bare `li`
 * elements so they are reachable by keyboard and announce their selected state.
 */
function WheelColumn({ heading, values, active, isDisabled, onSelect }: WheelColumnProps) {
  const listRef = useRef<HTMLUListElement>(null)
  const activeRef = useRef<HTMLLIElement>(null)

  // Centre the selected row without scrollIntoView, which would also scroll the
  // page or drawer behind the popover.
  useEffect(() => {
    const list = listRef.current
    const row = activeRef.current
    if (!list || !row) return
    list.scrollTop = row.offsetTop - (list.clientHeight - row.clientHeight) / 2
  }, [])

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="border-b border-border-subtle bg-surface-2/40 py-1.5 text-center font-mono text-[10px] uppercase tracking-wider text-text-4">
        {heading}
      </div>
      <ul ref={listRef} role="listbox" aria-label={heading} className="h-52 overflow-y-auto p-1">
        {values.map((v) => {
          const selected = v === active
          const off = isDisabled?.(v) ?? false
          return (
            <li key={v} ref={selected ? activeRef : undefined}>
              <button
                type="button"
                role="option"
                aria-selected={selected}
                disabled={off}
                onClick={() => onSelect(v)}
                className={cn(
                  'w-full rounded-sm py-2 text-center font-mono text-[13px] transition-colors',
                  selected
                    ? 'bg-brand-red font-semibold text-white'
                    : off
                      ? 'cursor-not-allowed text-text-4/50'
                      : 'text-text-2 hover:bg-surface-2 hover:text-text-1',
                )}
              >
                {fmt2(v)}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

interface TimeWheelProps {
  /** 24-hour hour and minute — the wheel converts to and from 12-hour itself. */
  hour: number
  minute: number
  onChange: (hour: number, minute: number) => void
  /** Minute increment. */
  step?: number
  /** Earliest selectable time as [hour, minute] in 24h; anything before is dimmed. */
  min?: [number, number] | null
  className?: string
}

/**
 * The shared hour / minute / AM-PM control behind every time field.
 *
 * 12-hour by choice: nobody in the office reads 17:00, and halving the hour list
 * to twelve rows is most of what made the old 24-hour columns feel cramped. The
 * meridiem is a two-button pair rather than a third scroller — there is nothing
 * to scroll through.
 */
export function TimeWheel({ hour, minute, onChange, step = 5, min = null, className }: TimeWheelProps) {
  const { hour12, meridiem } = to12(hour)
  const minutes = Array.from({ length: Math.ceil(60 / Math.max(step, 1)) }, (_, i) => i * step)

  const before = (h24: number, m: number) => !!min && (h24 < min[0] || (h24 === min[0] && m < min[1]))

  const pickHour = (h12: number) => onChange(to24(h12, meridiem), minute)
  const pickMinute = (m: number) => onChange(hour, m)
  const pickMeridiem = (mer: Meridiem) => onChange(to24(hour12, mer), minute)

  return (
    <div className={cn('flex divide-x divide-border-subtle', className)}>
      <WheelColumn
        heading="Hour"
        values={HOURS_12}
        active={hour12}
        // An hour is only out of reach when every minute in it is.
        isDisabled={(h) => before(to24(h, meridiem), 59)}
        onSelect={pickHour}
      />
      <WheelColumn
        heading="Min"
        values={minutes}
        active={minute}
        isDisabled={(m) => before(hour, m)}
        onSelect={pickMinute}
      />
      <div className="flex w-16 shrink-0 flex-col">
        <div className="border-b border-border-subtle bg-surface-2/40 py-1.5 text-center font-mono text-[10px] uppercase tracking-wider text-text-4">
          AM/PM
        </div>
        <div className="flex flex-col gap-1 p-1">
          {(['AM', 'PM'] as const).map((mer) => {
            const selected = mer === meridiem
            const off = before(to24(11, mer), 59)
            return (
              <button
                key={mer}
                type="button"
                aria-pressed={selected}
                disabled={off}
                onClick={() => pickMeridiem(mer)}
                className={cn(
                  'rounded-sm py-2 font-mono text-[12.5px] font-semibold transition-colors',
                  selected
                    ? 'bg-brand-red text-white'
                    : off
                      ? 'cursor-not-allowed text-text-4/50'
                      : 'text-text-2 hover:bg-surface-2 hover:text-text-1',
                )}
              >
                {mer}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
