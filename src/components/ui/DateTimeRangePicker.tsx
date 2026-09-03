import { useState, useRef } from 'react'
import { ChevronLeft, ChevronRight, CalendarClock, ChevronDown } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Popover } from './Popover'
import { ClockDial } from './ClockDial'
import { toDateInput, toTimeInput, fromDateTimeInput, formatClockLabel, nowSnappedTo } from '../../lib/utils'

export interface DateTimeRange {
  start: string | null
  end: string | null
}

interface DateTimeRangePickerProps {
  /** timestamptz ISO strings, or null when unset. */
  start: string | null | undefined
  end: string | null | undefined
  /** Fires once with both halves, so the caller writes a single update. */
  onChange: (next: DateTimeRange) => void
  /** Minute increment for the time columns. */
  step?: number
  placeholder?: string
  className?: string
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const fmt2 = (n: number) => String(n).padStart(2, '0')
const toStr = (d: Date) => `${d.getFullYear()}-${fmt2(d.getMonth() + 1)}-${fmt2(d.getDate())}`

function parseStr(s: string): Date | null {
  if (!s) return null
  const [y, m, d] = s.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

/** "12 Aug, 09:00 AM" — the compact form used in the trigger and footer. */
function label(day: string, h: number, m: number, withYear = false): string {
  const d = parseStr(day)
  if (!d) return ''
  const opts: Intl.DateTimeFormatOptions = withYear
    ? { day: '2-digit', month: 'short', year: 'numeric' }
    : { day: '2-digit', month: 'short' }
  return `${d.toLocaleDateString('en-GB', opts)}, ${formatClockLabel(h, m)}`
}

/**
 * One field covering a task's whole schedule: start date+time and end date+time.
 * The calendar picks the two endpoints as a range (first click anchors the start,
 * second closes it); the time columns set the clock on each end. Committing emits
 * both halves at once so the caller writes one row update, not two.
 */
export function DateTimeRangePicker({
  start,
  end,
  onChange,
  step = 5,
  placeholder = 'Set schedule…',
  className,
}: DateTimeRangePickerProps) {
  const startDay = toDateInput(start)
  const endDay = toDateInput(end)
  const startClock = toTimeInput(start)
  const endClock = toTimeInput(end)
  const todayStr = toStr(new Date())

  const [open, setOpen] = useState(false)
  const [pStart, setPStart] = useState('')
  const [pEnd, setPEnd] = useState('')
  // Which endpoint the next day-click sets. Resets to 'start' once a range closes.
  const [phase, setPhase] = useState<'start' | 'end'>('start')
  const [sH, setSH] = useState(9)
  const [sM, setSM] = useState(0)
  const [eH, setEH] = useState(17)
  const [eM, setEM] = useState(0)
  const [displayYear, setDisplayYear] = useState(new Date().getFullYear())
  const [displayMonth, setDisplayMonth] = useState(new Date().getMonth())
  // Which end the single time wheel is editing. One roomy wheel beats two
  // half-height ones fighting for the same column.
  const [timeSide, setTimeSide] = useState<'start' | 'end'>('start')

  const triggerRef = useRef<HTMLButtonElement>(null)

  const snap = (m: number) => {
    const s = Math.round(m / step) * step
    return s >= 60 ? 0 : s
  }

  const toggleOpen = () => {
    const next = !open
    if (next) {
      // Reopening always starts from what's committed, never a stale draft.
      setPStart(startDay)
      setPEnd(endDay)
      setPhase('start')
      setTimeSide('start')
      const [shh, smm] = startClock ? startClock.split(':').map(Number) : [9, 0]
      const [ehh, emm] = endClock ? endClock.split(':').map(Number) : [17, 0]
      setSH(shh); setSM(snap(smm))
      setEH(ehh); setEM(snap(emm))
      const base = parseStr(startDay) ?? parseStr(endDay) ?? new Date()
      setDisplayYear(base.getFullYear())
      setDisplayMonth(base.getMonth())
    }
    setOpen(next)
  }

  const prevMonth = () => {
    if (displayMonth === 0) { setDisplayMonth(11); setDisplayYear((y) => y - 1) }
    else setDisplayMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (displayMonth === 11) { setDisplayMonth(0); setDisplayYear((y) => y + 1) }
    else setDisplayMonth((m) => m + 1)
  }

  const firstDow = new Date(displayYear, displayMonth, 1).getDay()
  const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const dayStr = (day: number) => toStr(new Date(displayYear, displayMonth, day))

  // A click either anchors a new start or closes the range. Picking a day before
  // the anchor restarts from there rather than producing a backwards range.
  const clickDay = (day: number) => {
    const d = dayStr(day)
    if (phase === 'start' || !pStart) {
      setPStart(d); setPEnd(''); setPhase('end')
      return
    }
    if (d < pStart) {
      setPStart(d); setPEnd(''); setPhase('end')
      return
    }
    setPEnd(d); setPhase('start')
  }

  const inRange = (d: string) => !!pStart && !!pEnd && d > pStart && d < pEnd

  const commit = () => {
    onChange({
      start: pStart ? fromDateTimeInput(pStart, `${fmt2(sH)}:${fmt2(sM)}`) : null,
      end: pEnd ? fromDateTimeInput(pEnd, `${fmt2(eH)}:${fmt2(eM)}`) : null,
    })
    setOpen(false)
  }

  const triggerLabel = (() => {
    const clock = (hhmm: string): [number, number] => {
      const [h, m] = hhmm ? hhmm.split(':').map(Number) : [0, 0]
      return [h || 0, m || 0]
    }
    const s = startDay ? label(startDay, ...clock(startClock)) : ''
    const e = endDay ? label(endDay, ...clock(endClock)) : ''
    if (s && e) return `${s} → ${e}`
    if (s) return `${s} →`
    if (e) return `→ ${e}`
    return null
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
        <CalendarClock size={13} className="text-text-4 shrink-0" />
        <span className={cn('flex-1 font-mono text-[12.5px] truncate', triggerLabel ? 'text-text-1' : 'text-text-4')}>
          {triggerLabel ?? placeholder}
        </span>
        <ChevronDown size={13} className={cn('text-text-4 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      <Popover
        anchorRef={triggerRef}
        open={open}
        onClose={() => setOpen(false)}
        className="bg-surface-1 border border-border-default rounded-xl shadow-2xl overflow-hidden w-120 max-w-[calc(100vw-2rem)]"
      >
        <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-border-subtle">
          {/* Calendar — left */}
          <div className="sm:w-64 shrink-0">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border-subtle">
              <button
                type="button"
                onClick={prevMonth}
                className="size-7 flex items-center justify-center rounded hover:bg-surface-2 text-text-3 hover:text-text-1 transition-colors"
                aria-label="Previous month"
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
                aria-label="Next month"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="grid grid-cols-7 px-2.5 pt-2 pb-1">
              {DOW.map((d) => (
                <div key={d} className="text-center font-mono text-[10px] text-text-4 font-semibold uppercase tracking-wider py-0.5">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 px-2.5 pb-2.5 gap-y-0.5">
              {cells.map((day, i) =>
                day === null ? (
                  <div key={`e-${i}`} />
                ) : (
                  <button
                    key={day}
                    type="button"
                    onClick={() => clickDay(day)}
                    className={cn(
                      'size-7.5 mx-auto flex items-center justify-center rounded-sm font-mono text-[12px] transition-colors',
                      dayStr(day) === pStart || dayStr(day) === pEnd
                        ? 'bg-brand-red text-white font-semibold'
                        : inRange(dayStr(day))
                        ? 'bg-brand-red/15 text-text-1'
                        : dayStr(day) === todayStr
                        ? 'bg-surface-2 text-white ring-1 ring-brand-red/40'
                        : 'text-text-2 hover:bg-surface-2 hover:text-text-1 cursor-pointer',
                    )}
                  >
                    {day}
                  </button>
                ),
              )}
            </div>
            <p className="px-3 pb-2 font-ui text-[10.5px] text-text-4">
              {phase === 'end' && pStart ? 'Now pick the end day' : 'Pick the start day'}
            </p>
          </div>

          {/* Times — right. The pair of buttons both picks which end you are
              setting and shows what each one currently reads. */}
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex gap-1 border-b border-border-subtle p-1.5">
              {([
                { side: 'start', title: 'Start time', h: sH, m: sM },
                { side: 'end', title: 'End time', h: eH, m: eM },
              ] as const).map(({ side, title, h, m }) => (
                <button
                  key={side}
                  type="button"
                  onClick={() => setTimeSide(side)}
                  aria-pressed={timeSide === side}
                  className={cn(
                    'flex-1 rounded-sm px-2 py-1.5 transition-colors',
                    timeSide === side ? 'bg-surface-3' : 'hover:bg-surface-2',
                  )}
                >
                  <span className="block font-mono text-[9.5px] uppercase tracking-wider text-text-4">{title}</span>
                  <span className={cn('block font-mono text-[12px] font-semibold', timeSide === side ? 'text-text-1' : 'text-text-3')}>
                    {formatClockLabel(h, m)}
                  </span>
                </button>
              ))}
            </div>
            <ClockDial
              hour={timeSide === 'start' ? sH : eH}
              minute={timeSide === 'start' ? sM : eM}
              step={step}
              onChange={(h, m) => {
                if (timeSide === 'start') { setSH(h); setSM(m) } else { setEH(h); setEM(m) }
              }}
            />
            {/* The clock's "Today". It fills whichever side is selected rather
                than committing, because this picker has two of them and a start
                without an end is not something to save on one tap. */}
            <button
              type="button"
              onClick={() => {
                const [h, m] = nowSnappedTo(step)
                if (timeSide === 'start') { setSH(h); setSM(m) } else { setEH(h); setEM(m) }
              }}
              className="border-t border-border-subtle py-2 text-center font-ui text-[11px] text-brand-red transition-colors hover:bg-surface-2 hover:text-brand-red/80"
            >
              Set {timeSide} time to now
            </button>
          </div>
        </div>

        {/* Footer — live preview of what Done will save. */}
        <div className="border-t border-border-subtle px-3 py-2 flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] text-text-2 truncate">
            {pStart
              ? `${label(pStart, sH, sM)}${pEnd ? `  →  ${label(pEnd, eH, eM)}` : '  →  no end'}`
              : 'Pick a start day'}
          </span>
          <div className="flex items-center gap-3 shrink-0">
            {(start || end) && (
              <button
                type="button"
                onClick={() => { onChange({ start: null, end: null }); setOpen(false) }}
                className="font-ui text-[11px] text-text-4 hover:text-text-2 transition-colors"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={commit}
              disabled={!pStart && !pEnd}
              className="font-ui font-semibold text-[11px] text-brand-red hover:text-brand-red/80 disabled:text-text-4 disabled:cursor-not-allowed transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </Popover>
    </div>
  )
}
