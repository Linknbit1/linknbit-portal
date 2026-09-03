import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { animate, motion, useMotionValue } from 'framer-motion'
import { cn } from '../../lib/cn'

export interface SlideSwitchOption<T extends string> {
  value: T
  label: string
}

interface SlideSwitchProps<T extends string> {
  options: [SlideSwitchOption<T>, SlideSwitchOption<T>]
  value: T
  onChange: (value: T) => void
  className?: string
  /** Accessible name for the pair, e.g. "Period". */
  label?: string
}

const SPRING = { type: 'spring', damping: 30, stiffness: 400 } as const

/**
 * A two-position switch where the *background* slides between the halves.
 *
 * Not a checkbox styled as a toggle: both states are named, because "All months"
 * and "One month" are two things you pick between rather than one thing that is
 * on or off, and an unlabelled switch leaves the reader guessing which way round
 * it is. The moving panel is what makes it read as one control rather than two
 * buttons, and it can be dragged as well as pressed.
 *
 * Two things this needs to get right, both of which look like nothing in the
 * markup:
 *
 * - The panel sits ABOVE the labels. Underneath them it is unreachable, and the
 *   drag never begins because the button on top swallows the pointer. Pressing
 *   the panel does nothing (that half is already chosen) and pressing the other
 *   half hits its label, so nothing is lost by putting it on top.
 * - The position is a motion value the drag writes to directly, not an `animate`
 *   prop. Animating the same axis you drag hands control to the animation, and
 *   the panel snaps back under your finger.
 *
 * Travel is measured rather than expressed in percentages: the panel is inset by
 * the track's padding, so a percentage would drift by those few pixels and leave
 * it short of the right-hand edge.
 */
export function SlideSwitch<T extends string>({
  options, value, onChange, className, label,
}: SlideSwitchProps<T>) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [half, setHalf] = useState(0)
  const x = useMotionValue(0)
  const placed = useRef(false)
  const index = options.findIndex((o) => o.value === value) === 1 ? 1 : 0

  useLayoutEffect(() => {
    const el = trackRef.current
    if (!el) return
    const measure = () => {
      // 4px of padding each side, so the usable track is the width less 8.
      const next = Math.max(0, (el.clientWidth - 8) / 2)
      setHalf(next)
      // First measurement places the panel outright — animating in from zero on
      // mount would read as the switch changing its own mind.
      if (!placed.current && next > 0) {
        x.set(index * next)
        placed.current = true
      }
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
    // Only the first paint places it; every later move goes through the effect
    // below, which is what `index` is for.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (half > 0 && placed.current) animate(x, index * half, SPRING)
  }, [index, half, x])

  const settle = () => {
    // Where the panel ended up, not how far it travelled: a short drag from the
    // right-hand side should stay on the right.
    const next = x.get() > half / 2 ? 1 : 0
    animate(x, next * half, SPRING)
    onChange(options[next].value)
  }

  return (
    <div
      ref={trackRef}
      role="group"
      aria-label={label}
      className={cn(
        'relative flex h-9 w-full items-stretch rounded-sm border border-border-default bg-surface-inset p-1',
        className,
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            'relative z-10 flex flex-1 items-center justify-center text-center font-ui text-[12.5px] font-semibold transition-colors',
            option.value === value ? 'text-text-1' : 'text-text-3 hover:text-text-2',
          )}
        >
          {option.label}
        </button>
      ))}
      {half > 0 && (
        <motion.span
          aria-hidden
          drag="x"
          dragConstraints={{ left: 0, right: half }}
          dragElastic={0.03}
          dragMomentum={false}
          onDragEnd={settle}
          style={{ x, width: half }}
          className="absolute inset-y-1 left-1 z-20 cursor-grab rounded-sm border border-brand-red/40 bg-brand-red/15 active:cursor-grabbing"
        />
      )}
    </div>
  )
}
