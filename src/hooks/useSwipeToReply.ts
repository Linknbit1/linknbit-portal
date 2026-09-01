import { useRef, useState } from 'react'

/** How far the finger must travel before releasing fires the action. */
const THRESHOLD = 56
/** The furthest the row will move, however far the finger goes. */
const MAX = 72
/** Movement before we decide the gesture is horizontal rather than a scroll. */
const DIRECTION_LOCK = 10

type Axis = 'undecided' | 'horizontal' | 'vertical'

export interface SwipeToReply {
  /** Current pixel offset to translate the row by. 0 when idle. */
  offset: number
  /** True once releasing would fire — used to light up the affordance. */
  armed: boolean
  /** False while snapping back, so the transition only runs on release. */
  dragging: boolean
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void
    onTouchMove: (e: React.TouchEvent) => void
    onTouchEnd: () => void
    onTouchCancel: () => void
  }
}

/**
 * Swipe a row rightwards to act on it — the WhatsApp reply gesture.
 *
 * Touch events only, deliberately: a desktop pointer has the hover buttons, and
 * binding mouse drags here would swallow text selection. The axis is locked on
 * the first 10px of movement so a vertical scroll is never stolen mid-flick,
 * and the row must still declare `touch-action: pan-y` or the browser claims
 * the horizontal gesture before these handlers see it.
 *
 * Movement is damped rather than 1:1: the row follows the finger closely at
 * first and stiffens as it goes, so the gesture has an end you can feel instead
 * of a row that slides off the screen.
 */
export function useSwipeToReply(onTrigger: () => void, enabled = true): SwipeToReply {
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const start = useRef<{ x: number; y: number } | null>(null)
  // Mirrors `offset`, so touchend reads the distance the finger actually reached
  // rather than whatever the last committed render happened to hold.
  const offsetRef = useRef(0)
  const axis = useRef<Axis>('undecided')
  // Fires the haptic once per gesture, on the crossing rather than every frame.
  const buzzed = useRef(false)

  const reset = () => {
    start.current = null
    axis.current = 'undecided'
    buzzed.current = false
    offsetRef.current = 0
    setDragging(false)
    setOffset(0)
  }

  if (!enabled) {
    return {
      offset: 0,
      armed: false,
      dragging: false,
      handlers: { onTouchStart: () => {}, onTouchMove: () => {}, onTouchEnd: () => {}, onTouchCancel: () => {} },
    }
  }

  return {
    offset,
    armed: offset >= THRESHOLD,
    dragging,
    handlers: {
      onTouchStart: (e) => {
        const t = e.touches[0]
        start.current = { x: t.clientX, y: t.clientY }
        axis.current = 'undecided'
        buzzed.current = false
      },

      onTouchMove: (e) => {
        if (!start.current) return
        const t = e.touches[0]
        const dx = t.clientX - start.current.x
        const dy = t.clientY - start.current.y

        if (axis.current === 'undecided') {
          if (Math.abs(dx) < DIRECTION_LOCK && Math.abs(dy) < DIRECTION_LOCK) return
          // A leftward swipe is nothing here, so it locks to vertical too and
          // leaves the row alone rather than tracking a gesture it will ignore.
          axis.current = dx > 0 && Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical'
          if (axis.current === 'horizontal') setDragging(true)
        }
        if (axis.current !== 'horizontal') return

        // Damped: full speed to the threshold, then a third of it.
        const travel = Math.max(0, dx)
        const next = Math.min(MAX, travel <= THRESHOLD ? travel : THRESHOLD + (travel - THRESHOLD) / 3)
        offsetRef.current = next
        setOffset(next)

        if (next >= THRESHOLD && !buzzed.current) {
          buzzed.current = true
          navigator.vibrate?.(8)
        }
      },

      onTouchEnd: () => {
        if (axis.current === 'horizontal' && offsetRef.current >= THRESHOLD) onTrigger()
        reset()
      },

      onTouchCancel: reset,
    },
  }
}
