import { useState, useRef, useEffect } from 'react'
import { Clock, ChevronDown } from 'lucide-react'
import { cn } from '../../lib/cn'

interface TimePickerProps {
  value: string          // HH:MM (24h) or ''
  onChange: (val: string) => void
  minTime?: string       // HH:MM (24h) — times before this are disabled
  placeholder?: string
  className?: string
  step?: number          // minute increment, default 5
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

function toAmPm(h: number, m: number): string {
  const suffix = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${fmt2(h12)}:${fmt2(m)} ${suffix}`
}

export function TimePicker({
  value,
  onChange,
  minTime,
  placeholder = 'Select time…',
  className,
  step = 5,
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

  const containerRef = useRef<HTMLDivElement>(null)
  const hourListRef = useRef<HTMLUListElement>(null)
  const minListRef = useRef<HTMLUListElement>(null)

  const HOURS = Array.from({ length: 24 }, (_, i) => i)
  const MINUTES = Array.from({ length: Math.ceil(60 / step) }, (_, i) => i * step)

  const scrollTo = (ref: React.RefObject<HTMLUListElement | null>, idx: number) => {
    const el = ref.current?.children[idx] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'center', behavior: 'instant' })
  }

  const toggleOpen = () => {
    const nextOpen = !open
    if (nextOpen && parsed) {
      setPendingH(parsed[0])
      const snapped = Math.round(parsed[1] / step) * step
      setPendingM(snapped >= 60 ? 0 : snapped)
    }
    setOpen(nextOpen)
  }

  // Scroll selected items into view after open animation
  useEffect(() => {
    if (!open) return
    const id = setTimeout(() => {
      const hIdx = HOURS.indexOf(pendingH)
      const mIdx = MINUTES.indexOf(pendingM)
      scrollTo(hourListRef, hIdx)
      scrollTo(minListRef, mIdx)
    }, 40)
    return () => clearTimeout(id)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const isHourDisabled = (h: number) => {
    if (!minParsed) return false
    return h < minParsed[0]
  }

  const isMinDisabled = (h: number, m: number) => {
    if (!minParsed) return false
    if (h < minParsed[0]) return true
    if (h === minParsed[0] && m < minParsed[1]) return true
    return false
  }

  const selectHour = (h: number) => {
    if (isHourDisabled(h)) return
    setPendingH(h)
    // If current pending minute would be invalid with new hour, advance it
    if (minParsed && h === minParsed[0] && pendingM < minParsed[1]) {
      setPendingM(snapMin(minParsed[1]))
    }
  }

  const confirm = () => {
    onChange(`${fmt2(pendingH)}:${fmt2(pendingM)}`)
    setOpen(false)
  }

  const triggerLabel = parsed ? toAmPm(parsed[0], parsed[1]) : null

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={toggleOpen}
        className={cn(
          'w-full flex items-center gap-2 bg-surface-inset border rounded-md px-3 py-2 text-left transition-colors',
          open ? 'border-border-focus' : 'border-border-default hover:border-border-strong',
        )}
      >
        <Clock size={13} className="text-text-4 shrink-0" />
        <span className={cn('flex-1 font-mono text-[13px]', triggerLabel ? 'text-text-1' : 'text-text-4')}>
          {triggerLabel ?? placeholder}
        </span>
        <ChevronDown size={13} className={cn('text-text-4 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-surface-1 border border-border-default rounded-xl shadow-2xl overflow-hidden w-[180px] max-w-[calc(100vw-2rem)]">
          <div className="flex divide-x divide-border-subtle">
            {/* Hours column */}
            <div className="flex-1 flex flex-col">
              <div className="text-center font-mono text-[10px] text-text-4 uppercase tracking-wider py-1.5 border-b border-border-subtle bg-surface-2/40">
                Hour
              </div>
              <ul ref={hourListRef} className="h-[160px] overflow-y-auto py-1">
                {HOURS.map((h) => {
                  const disabled = isHourDisabled(h)
                  const active = h === pendingH
                  return (
                    <li
                      key={h}
                      onClick={() => selectHour(h)}
                      className={cn(
                        'py-1.5 font-mono text-[13px] text-center select-none transition-colors',
                        active
                          ? 'bg-brand-red text-white font-semibold'
                          : disabled
                          ? 'text-text-4 cursor-not-allowed'
                          : 'text-text-2 hover:bg-surface-2 hover:text-text-1 cursor-pointer',
                      )}
                    >
                      {fmt2(h)}
                    </li>
                  )
                })}
              </ul>
            </div>

            {/* Minutes column */}
            <div className="flex-1 flex flex-col">
              <div className="text-center font-mono text-[10px] text-text-4 uppercase tracking-wider py-1.5 border-b border-border-subtle bg-surface-2/40">
                Min
              </div>
              <ul ref={minListRef} className="h-[160px] overflow-y-auto py-1">
                {MINUTES.map((m) => {
                  const disabled = isMinDisabled(pendingH, m)
                  const active = m === pendingM
                  return (
                    <li
                      key={m}
                      onClick={() => { if (!disabled) setPendingM(m) }}
                      className={cn(
                        'py-1.5 font-mono text-[13px] text-center select-none transition-colors',
                        active
                          ? 'bg-brand-red text-white font-semibold'
                          : disabled
                          ? 'text-text-4 cursor-not-allowed'
                          : 'text-text-2 hover:bg-surface-2 hover:text-text-1 cursor-pointer',
                      )}
                    >
                      {fmt2(m)}
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-border-subtle px-3 py-2 flex items-center justify-between">
            <span className="font-mono text-[13px] text-text-2">
              {toAmPm(pendingH, pendingM)}
            </span>
            <button
              type="button"
              onClick={confirm}
              className="font-ui font-semibold text-[11px] text-brand-red hover:text-brand-red/80 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
