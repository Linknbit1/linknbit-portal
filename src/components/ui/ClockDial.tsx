import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { Clock, Keyboard } from 'lucide-react'
import { cn } from '../../lib/cn'
import { to12, to24 } from '../../lib/utils'

const fmt2 = (n: number) => String(n).padStart(2, '0')
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

/** Clock order — 12 sits at the top, the way a face reads. */
const HOUR_MARKS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
/** A face is marked every five minutes, whatever the step allows you to land on. */
const MINUTE_MARKS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

/**
 * How far the ring of marks sits from the centre, on the SVG's 0-100 grid.
 *
 * The face is the container's own round background, so the rim is at 50 and the
 * ring has to leave room for the knob drawn on it: 35 + 8.5 reaches 43.5, well
 * clear of the edge it used to spill over.
 */
const MARK_RADIUS = 35

/**
 * The knob drawn on the selected mark.
 *
 * Sized against the gap between two marks, not against the number inside it:
 * neighbours on the ring are 2 x 28 x sin(15°) ≈ 14.5 apart, so anything much
 * over 8 puts the ring on top of the number next door — which is what made the
 * face look crowded at 11.
 */
const KNOB_RADIUS = 8.5

/**
 * Where a mark sits on the face, as a percentage of the dial box. `index` is a
 * position around the face rather than a whole number, so a hand mid-drag can
 * be asked for 4.37 and get an angle between two marks.
 */
function pointAt(index: number, radius = MARK_RADIUS): { x: number; y: number } {
  const angle = (index * 30 * Math.PI) / 180
  return { x: 50 + radius * Math.sin(angle), y: 50 - radius * Math.cos(angle) }
}

interface ClockDialProps {
  /** 24-hour hour and minute — the dial converts to and from 12-hour itself. */
  hour: number
  minute: number
  onChange: (hour: number, minute: number) => void
  /** Minute increment a drag snaps to. */
  step?: number
  /** Earliest selectable time as [hour, minute] in 24h; anything before is dimmed. */
  min?: [number, number] | null
  className?: string
}

/**
 * A clock face, in place of three scrolling columns, with a typing mode behind it.
 *
 * Reading a time is a spatial act — half past nine is a shape before it is a pair
 * of numbers — and the columns made you scroll a list to find something you
 * already knew the position of. But a shape is the wrong tool when you know the
 * answer exactly and it is 9:47, so the same two boxes at the top become fields
 * you type into. That is the whole of the Select time / Enter time switch: one
 * control, two ways of saying the same thing.
 *
 * The face is laid out in percentages of a square box rather than in pixels, so
 * it scales with whatever it is dropped into without a resize observer, and the
 * hand is an SVG on the same 0-100 grid.
 *
 * Every pointer press goes to the face, never to the numbers: the numbers are
 * `pointer-events-none` so that pressing one and dragging away keeps dragging
 * rather than ending as a click on whatever was underneath. They stay real
 * buttons, so Tab and Enter still reach them — a keyboard press is not a
 * pointer event and arrives regardless.
 */
export function ClockDial({ hour, minute, onChange, step = 5, min = null, className }: ClockDialProps) {
  const { hour12, meridiem } = to12(hour)
  const [mode, setMode] = useState<'hour' | 'minute'>('hour')
  const [typing, setTyping] = useState(false)
  const faceRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  /**
   * Where the hand is drawn while a drag is in progress: the raw position of
   * the pointer, not the value it settles on.
   *
   * The value is discrete — there is no half past four o'clock — but the hand
   * is a thing your finger is holding, and snapping it from number to number
   * made the drag feel like it kept letting go. So the hand follows, and the
   * value underneath it snaps as it passes each mark.
   */
  const [handAt, setHandAt] = useState<number | null>(null)

  const before = (h24: number, m: number) => !!min && (h24 < min[0] || (h24 === min[0] && m < min[1]))
  // An hour is only out of reach when every minute inside it is.
  const hourOff = (h12: number) => before(to24(h12, meridiem), 59)
  const minuteOff = (m: number) => before(hour, m)

  const pickHour = (h12: number) => {
    if (hourOff(h12)) return
    onChange(to24(h12, meridiem), minute)
  }
  const pickMinute = (m: number) => {
    if (minuteOff(m)) return
    onChange(hour, m)
  }

  // ── Dragging the hand ───────────────────────────────────────────────────────

  /** Where the pointer is on the face, as a 0-12 position around it. */
  const positionFromPointer = (e: ReactPointerEvent): number | null => {
    const box = faceRef.current?.getBoundingClientRect()
    if (!box) return null
    const dx = e.clientX - (box.left + box.width / 2)
    const dy = e.clientY - (box.top + box.height / 2)
    // Dead zone at the centre, where the angle is noise rather than an answer.
    if (Math.hypot(dx, dy) < box.width * 0.1) return null
    const deg = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360
    return deg / 30
  }

  const applyPointer = (e: ReactPointerEvent) => {
    const at = positionFromPointer(e)
    if (at === null) return
    setHandAt(at)
    if (mode === 'hour') {
      pickHour(HOUR_MARKS[Math.round(at) % 12])
    } else {
      // Snapped to the caller's step, not to the printed five-minute marks: the
      // marks are a legend, the step is the rule.
      pickMinute((Math.round((at * 5) / step) * step) % 60)
    }
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragging.current = true
    // Capture so the hand keeps following once the pointer leaves the face.
    // Not every pointer can be captured (a synthetic one, or one already
    // released), and a throw here would lose the drag entirely.
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* keep dragging regardless */ }
    applyPointer(e)
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragging.current) applyPointer(e)
  }
  const endDrag = () => {
    if (!dragging.current) return
    dragging.current = false
    // Let go and the hand settles onto the value it chose.
    setHandAt(null)
    // Letting go of the hour moves on to the minutes: it is the order the
    // question is asked in, and it saves the press people forget.
    if (mode === 'hour') setMode('minute')
  }

  // ── Typing it instead ───────────────────────────────────────────────────────

  const [hourText, setHourText] = useState(fmt2(hour12))
  const [minuteText, setMinuteText] = useState(fmt2(minute))

  // Follow the value while the fields are not being edited (Now, or the dial).
  const editing = useRef<'hour' | 'minute' | null>(null)
  useEffect(() => {
    if (editing.current !== 'hour') setHourText(fmt2(hour12))
    if (editing.current !== 'minute') setMinuteText(fmt2(minute))
  }, [hour12, minute])

  const digits = (v: string) => v.replace(/\D/g, '').slice(0, 2)

  const commitHour = (text: string) => {
    const n = Number(text)
    if (!text || Number.isNaN(n)) return
    onChange(to24(clamp(n, 1, 12), meridiem), minute)
  }
  const commitMinute = (text: string) => {
    const n = Number(text)
    if (!text || Number.isNaN(n)) return
    onChange(hour, clamp(n, 0, 59))
  }

  /** On the way out of a field, tidy what was typed and respect the floor. */
  const settleFields = () => {
    editing.current = null
    let h24 = hour
    let m = minute
    if (min && before(h24, m)) {
      h24 = min[0]
      m = min[1]
      onChange(h24, m)
    }
    const t = to12(h24)
    setHourText(fmt2(t.hour12))
    setMinuteText(fmt2(m))
  }

  const activeIndex = mode === 'hour' ? HOUR_MARKS.indexOf(hour12) : minute / 5
  const handIndex = handAt ?? activeIndex
  const hand = pointAt(handIndex)
  // The line stops where the knob starts rather than running to its centre: a
  // hand is a pointer at something, and one that carries on inside the ring
  // reads as a line with a bead threaded onto it.
  const handTip = pointAt(handIndex, MARK_RADIUS - KNOB_RADIUS)

  const boxCls = (active: boolean) =>
    cn(
      'w-16 rounded-md px-2 py-1.5 text-center font-mono text-[26px] leading-none tabular-nums transition-colors',
      active
        ? 'bg-brand-red/15 text-brand-red ring-1 ring-brand-red/40'
        : 'bg-surface-inset text-text-2 hover:text-text-1',
    )

  return (
    <div className={cn('flex flex-col items-center gap-2.5 p-3.5', className)}>
      {/* The reading. In dial mode the two boxes say what the face is editing;
          in typing mode they are the fields themselves. */}
      <div className="flex items-start gap-2">
        <div className="flex flex-col items-center gap-1">
          {typing ? (
            <input
              inputMode="numeric"
              aria-label="Hour"
              value={hourText}
              onFocus={() => { editing.current = 'hour' }}
              onChange={(e) => { const v = digits(e.target.value); setHourText(v); commitHour(v) }}
              onBlur={settleFields}
              className={cn(boxCls(true), 'outline-none focus:ring-brand-red')}
            />
          ) : (
            <button type="button" onClick={() => setMode('hour')} className={boxCls(mode === 'hour')} aria-label="Set hour">
              {fmt2(hour12)}
            </button>
          )}
          {typing && <span className="font-ui text-[10.5px] text-text-4">Hour</span>}
        </div>

        <span className="pt-1.5 font-mono text-[24px] leading-none text-text-3">:</span>

        <div className="flex flex-col items-center gap-1">
          {typing ? (
            <input
              inputMode="numeric"
              aria-label="Minute"
              value={minuteText}
              onFocus={() => { editing.current = 'minute' }}
              onChange={(e) => { const v = digits(e.target.value); setMinuteText(v); commitMinute(v) }}
              onBlur={settleFields}
              className={cn(boxCls(true), 'outline-none focus:ring-brand-red')}
            />
          ) : (
            <button type="button" onClick={() => setMode('minute')} className={boxCls(mode === 'minute')} aria-label="Set minutes">
              {fmt2(minute)}
            </button>
          )}
          {typing && <span className="font-ui text-[10.5px] text-text-4">Minute</span>}
        </div>

        <div className="flex flex-col overflow-hidden rounded-md border border-border-default">
          {(['AM', 'PM'] as const).map((mer) => {
            const selected = mer === meridiem
            const off = before(to24(11, mer), 59)
            return (
              <button
                key={mer}
                type="button"
                aria-pressed={selected}
                disabled={off}
                onClick={() => onChange(to24(hour12, mer), minute)}
                className={cn(
                  'px-2 py-1 font-mono text-[11px] font-semibold transition-colors',
                  selected
                    ? 'bg-brand-red text-white'
                    : off
                      ? 'cursor-not-allowed text-text-4/50'
                      : 'text-text-3 hover:bg-surface-2 hover:text-text-1',
                )}
              >
                {mer}
              </button>
            )
          })}
        </div>
      </div>

      {!typing && (
        <div
          ref={faceRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="relative aspect-square w-full max-w-60 cursor-pointer touch-none select-none rounded-full bg-surface-inset"
        >
          {/* The hand. Drawn on the same 0-100 grid the marks are placed on, so
              it lands exactly on them at any size. */}
          <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 size-full text-brand-red">
            <circle cx="50" cy="50" r="1.8" fill="currentColor" />
            <line x1="50" y1="50" x2={handTip.x} y2={handTip.y} stroke="currentColor" strokeWidth="1.2" />
            <circle
              cx={hand.x}
              cy={hand.y}
              r={KNOB_RADIUS}
              fill="currentColor"
              fillOpacity={0.22}
              stroke="currentColor"
              strokeWidth={1}
            />
          </svg>

          {(mode === 'hour' ? HOUR_MARKS : MINUTE_MARKS).map((mark, i) => {
            const { x, y } = pointAt(i)
            const selected = mode === 'hour' ? mark === hour12 : mark === minute
            const off = mode === 'hour' ? hourOff(mark) : minuteOff(mark)
            return (
              <button
                key={mark}
                type="button"
                disabled={off}
                aria-pressed={selected}
                onClick={() => (mode === 'hour' ? (pickHour(mark), setMode('minute')) : pickMinute(mark))}
                style={{ left: `${x}%`, top: `${y}%` }}
                className={cn(
                  'pointer-events-none absolute flex size-8 -translate-1/2 items-center justify-center rounded-full',
                  'font-mono text-[13px] tabular-nums',
                  selected ? 'font-semibold text-white' : off ? 'text-text-4/40' : 'text-text-2',
                )}
              >
                {mode === 'hour' ? mark : fmt2(mark)}
              </button>
            )
          })}
        </div>
      )}

      <button
        type="button"
        onClick={() => setTyping((t) => !t)}
        className="mr-auto inline-flex items-center gap-1.5 rounded-sm px-1.5 py-1 font-ui text-[11.5px] text-text-3 transition-colors hover:bg-surface-2 hover:text-text-1"
      >
        {typing ? <Clock size={13} /> : <Keyboard size={13} />}
        {typing ? 'Select time' : 'Enter time'}
      </button>
    </div>
  )
}
