import { useState, useRef } from 'react'
import { Clock, ChevronDown } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Popover } from './Popover'
import { TimeWheel } from './TimeWheel'
import { formatClockLabel } from '../../lib/utils'

interface TimePickerProps {
  value: string          // HH:MM (24h) or ''
  onChange: (val: string) => void
  minTime?: string       // HH:MM (24h) — times before this are disabled
  placeholder?: string
  className?: string
  step?: number          // minute increment, default 1 (every minute selectable)
  disabled?: boolean     // renders dimmed and refuses to open
}

function parseTime(s: string): [number, number] | null {
  if (!s) return null
  const parts = s.split(':').map(Number)
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null
  return [parts[0], parts[1]]
}

function fmt2(n: number): string {
  return String(n).padStart(2, '0')
}

export function TimePicker({
  value,
  onChange,
  minTime,
  placeholder = 'Select time…',
  className,
  step = 1,
  disabled = false,
}: TimePickerProps) {
  const parsed = parseTime(value)
  const minParsed = parseTime(minTime ?? '')

  // Snap a minute value to the nearest valid step
  const snapMin = (m: number) => {
    const snapped = Math.ceil(m / step) * step
    return snapped >= 60 ? 0 : snapped
  }

  const [open, setOpen] = useState(false)
  const [pendingH, setPendingH] = useState(parsed?.[0] ?? 9)
  const [pendingM, setPendingM] = useState(() => {
    const raw = parsed?.[1] ?? 0
    return Math.round(raw / step) * step >= 60 ? 0 : Math.round(raw / step) * step
  })

  const triggerRef = useRef<HTMLButtonElement>(null)

  const toggleOpen = () => {
    if (disabled) return
    const nextOpen = !open
    if (nextOpen && parsed) {
      setPendingH(parsed[0])
      const snapped = Math.round(parsed[1] / step) * step
      setPendingM(snapped >= 60 ? 0 : snapped)
    }
    setOpen(nextOpen)
  }

  /** Moving to the floor hour can strand the minute behind it — pull it forward. */
  const pick = (h: number, m: number) => {
    setPendingH(h)
    setPendingM(minParsed && h === minParsed[0] && m < minParsed[1] ? snapMin(minParsed[1]) : m)
  }

  const confirm = () => {
    onChange(`${fmt2(pendingH)}:${fmt2(pendingM)}`)
    setOpen(false)
  }

  const triggerLabel = parsed ? formatClockLabel(parsed[0], parsed[1]) : null

  return (
    <div className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        disabled={disabled}
        className={cn(
          'w-full flex items-center gap-2 bg-surface-inset border rounded-md px-3 py-2 text-left transition-colors',
          disabled
            ? 'border-border-subtle opacity-60 cursor-not-allowed'
            : open ? 'border-border-focus' : 'border-border-default hover:border-border-strong',
        )}
      >
        <Clock size={13} className="text-text-4 shrink-0" />
        <span className={cn('flex-1 font-mono text-[13px]', triggerLabel ? 'text-text-1' : 'text-text-4')}>
          {triggerLabel ?? placeholder}
        </span>
        {!disabled && (
          <ChevronDown size={13} className={cn('text-text-4 shrink-0 transition-transform', open && 'rotate-180')} />
        )}
      </button>

      <Popover
        anchorRef={triggerRef}
        open={open}
        onClose={() => setOpen(false)}
        className="bg-surface-1 border border-border-default rounded-xl shadow-2xl overflow-hidden w-64 max-w-[calc(100vw-2rem)]"
      >
          <TimeWheel hour={pendingH} minute={pendingM} onChange={pick} step={step} min={minParsed} />

          {/* Footer */}
          <div className="border-t border-border-subtle px-3 py-2 flex items-center justify-between">
            <span className="font-mono text-[13px] text-text-2">
              {formatClockLabel(pendingH, pendingM)}
            </span>
            <button
              type="button"
              onClick={confirm}
              className="font-ui font-semibold text-[11px] text-brand-red hover:text-brand-red/80 transition-colors"
            >
              Done
            </button>
          </div>
      </Popover>
    </div>
  )
}
