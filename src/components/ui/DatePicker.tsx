import { useState, useRef } from 'react'
import { ChevronLeft, ChevronRight, Calendar, ChevronDown } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Popover } from './Popover'

interface DatePickerProps {
  value: string            // YYYY-MM-DD or ''
  onChange: (val: string) => void
  minDate?: string         // YYYY-MM-DD — dates before this are disabled
  maxDate?: string         // YYYY-MM-DD — dates after this are disabled
  allowedDow?: number[]    // 0=Sun … 6=Sat — only these weekdays are selectable
  placeholder?: string
  className?: string
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function toStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function parseStr(s: string): Date | null {
  if (!s) return null
  const [y, m, d] = s.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

export function DatePicker({ value, onChange, minDate, maxDate, allowedDow, placeholder = 'Select date…', className }: DatePickerProps) {
  const todayStr = toStr(new Date())
  const selected = parseStr(value)
  const minD = parseStr(minDate ?? '')
  const maxD = parseStr(maxDate ?? '')

  const [open, setOpen] = useState(false)
  const [displayYear, setDisplayYear] = useState(() => (selected ?? new Date()).getFullYear())
  const [displayMonth, setDisplayMonth] = useState(() => (selected ?? new Date()).getMonth())

  const triggerRef = useRef<HTMLButtonElement>(null)

  const toggleOpen = () => {
    const nextOpen = !open
    if (nextOpen && selected) {
      setDisplayYear(selected.getFullYear())
      setDisplayMonth(selected.getMonth())
    }
    setOpen(nextOpen)
  }

  const prevMonth = () => {
    if (displayMonth === 0) { setDisplayMonth(11); setDisplayYear(y => y - 1) }
    else setDisplayMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (displayMonth === 11) { setDisplayMonth(0); setDisplayYear(y => y + 1) }
    else setDisplayMonth(m => m + 1)
  }

  // Build day grid cells (null = empty padding cell)
  const firstDow = new Date(displayYear, displayMonth, 1).getDay()
  const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const dayStr = (day: number) => toStr(new Date(displayYear, displayMonth, day))
  const isDisabled = (day: number) => {
    const d = new Date(displayYear, displayMonth, day)
    if (minD && d < minD) return true
    if (maxD && d > maxD) return true
    if (allowedDow && !allowedDow.includes(d.getDay())) return true
    return false
  }
  const isToday = (day: number) => dayStr(day) === todayStr
  const isSelected = (day: number) => dayStr(day) === value

  const select = (day: number) => {
    if (isDisabled(day)) return
    onChange(dayStr(day))
    setOpen(false)
  }

  const todayDisabled = (!!minD && new Date() < minD) || (!!maxD && new Date() > maxD)

  const triggerLabel = (() => {
    if (!value) return null
    const d = parseStr(value)
    return d?.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) ?? null
  })()

  return (
    <div className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        className={cn(
          'w-full flex items-center gap-2 bg-surface-inset border rounded-md px-3 py-2 text-left transition-colors',
          open ? 'border-border-focus' : 'border-border-default hover:border-border-strong',
        )}
      >
        <Calendar size={13} className="text-text-4 shrink-0" />
        {/* truncate, never wrap: the trigger is a fixed-height control, and a
            date breaking onto a second line stretches it out of the row. */}
        <span className={cn('flex-1 truncate font-mono text-[13px]', triggerLabel ? 'text-text-1' : 'text-text-4')}>
          {triggerLabel ?? placeholder}
        </span>
        <ChevronDown size={13} className={cn('text-text-4 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      <Popover
        anchorRef={triggerRef}
        open={open}
        onClose={() => setOpen(false)}
        className="bg-surface-2 border border-border-strong rounded-xl shadow-pop overflow-hidden w-68 max-w-[calc(100vw-2rem)]"
      >
          {/* Month navigation */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
            <button
              type="button"
              onClick={prevMonth}
              className="size-7 flex items-center justify-center rounded hover:bg-surface-2 text-text-3 hover:text-text-1 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="font-display font-semibold text-[13px] text-text-1">
              {MONTHS[displayMonth]} {displayYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="size-7 flex items-center justify-center rounded hover:bg-surface-2 text-text-3 hover:text-text-1 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Day-of-week header */}
          <div className="grid grid-cols-7 px-3 pt-2.5 pb-1">
            {DOW.map(d => (
              <div key={d} className="text-center font-mono text-[10px] text-text-4 font-semibold uppercase tracking-wider py-0.5">
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 px-3 pb-2.5 gap-y-0.5">
            {cells.map((day, i) =>
              day === null ? (
                <div key={`e-${i}`} />
              ) : (
                <button
                  key={day}
                  type="button"
                  onClick={() => select(day)}
                  disabled={isDisabled(day)}
                  className={cn(
                    'size-8 mx-auto flex items-center justify-center rounded-sm font-mono text-[12px] transition-colors',
                    isSelected(day)
                      ? 'bg-brand-red text-white font-semibold'
                      : isToday(day)
                      ? 'bg-surface-2 text-white ring-1 ring-brand-red/40'
                      : isDisabled(day)
                      ? 'text-text-4 cursor-not-allowed'
                      : 'text-text-2 hover:bg-surface-2 hover:text-text-1 cursor-pointer',
                  )}
                >
                  {day}
                </button>
              )
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border-subtle px-3 py-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => { if (!todayDisabled) { onChange(todayStr); setOpen(false) } }}
              disabled={todayDisabled}
              className="font-ui text-[11px] text-brand-red hover:text-brand-red/80 disabled:text-text-4 disabled:cursor-not-allowed transition-colors"
            >
              Today
            </button>
            {value && (
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false) }}
                className="font-ui text-[11px] text-text-4 hover:text-text-2 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
      </Popover>
    </div>
  )
}
