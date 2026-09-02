import { useEffect, useRef, useState } from 'react'

/**
 * Per input type, because a finger and a mouse are not doing the same thing.
 *
 * A mouse has to travel further on both counts: a short horizontal drag over a
 * message is how somebody selects its text, and that has to keep working. A
 * finger has no other job here, so it can be light.
 */
const TUNING = {
  touch: { lock: 10, threshold: 56 },
  mouse: { lock: 18, threshold: 72 },
} as const

/** Extra travel allowed past the threshold, so the gesture has a hard end. */
const OVERSHOOT = 16

type Axis = 'undecided' | 'horizontal' | 'vertical'

/** Something the pointer went down on that has its own job. */
const INTERACTIVE = 'button, a, input, textarea, select, [contenteditable="true"]'

export interface SwipeToReply {
  /** Current pixel offset to translate the row by. 0 when idle. */
  offset: number
  /** True once releasing would fire — used to light up the affordance. */
  armed: boolean
  /** False while snapping back, so the transition only runs on release. */
  dragging: boolean
  handlers: {
    onPointerDown: (e: React.PointerEvent) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: (e: React.PointerEvent) => void
    onPointerCancel: (e: React.PointerEvent) => void
  }
}

const NO_HANDLERS = {
  onPointerDown: () => {},
  onPointerMove: () => {},
  onPointerUp: () => {},
  onPointerCancel: () => {},
}

/**
 * Drag a row rightwards to act on it — the WhatsApp reply gesture, on touch and
 * on a mouse.
 *
 * The axis is locked on the first few pixels of movement, so a vertical scroll
 * is never stolen mid-flick and a leftward drag is left alone entirely. The row
 * must still declare `touch-action: pan-y`, or the browser claims a horizontal
 * finger gesture before these handlers ever see it.
 *
 * Movement is damped rather than 1:1: the row follows closely to the threshold
 * and stiffens past it, so the gesture has an end you can feel instead of a row
 * that slides off the screen.
 *
 * Two things are deliberately given up to make the mouse work. A drag that locks
 * horizontal clears the text selection it was making, because it cannot be both.
 * And a drag beginning on a button is ignored outright, so the hover actions do
 * not fire a reply on the way past.
 */
export function useSwipeToReply(onTrigger: () => void, enabled = true): SwipeToReply {
  const [offset, setOffset] = useState(0)
  // State rather than derived at render: which threshold applies depends on the
  // input type, and that lives in a ref the render pass may not read.
  const [armed, setArmed] = useState(false)
  const [dragging, setDragging] = useState(false)
  const start = useRef<{ x: number; y: number; id: number; mouse: boolean } | null>(null)
  const axis = useRef<Axis>('undecided')
  // Mirrors `offset`, so release reads the distance actually reached rather than
  // whatever the last committed render happened to hold.
  const offsetRef = useRef(0)
  // Fires the haptic once per gesture, on the crossing rather than every frame.
  const buzzed = useRef(false)

  const reset = () => {
    start.current = null
    axis.current = 'undecided'
    buzzed.current = false
    offsetRef.current = 0
    setDragging(false)
    setArmed(false)
    setOffset(0)
  }

  /**
   * The drag always ends, even when the row's own pointerup never arrives.
   *
   * A captured pointer normally reports back, but there are paths where it does
   * not: the window loses focus mid-drag, the browser cancels the gesture, the
   * pointer is released over something that swallowed the event. Any one of them
   * left the row translated with no way back — the stuck message.
   *
   * These run on the bubble phase, so the row's own handler has already fired
   * and triggered the reply if it earned one; this only guarantees the reset.
   */
  useEffect(() => {
    if (!dragging) return
    const end = () => {
      start.current = null
      axis.current = 'undecided'
      buzzed.current = false
      offsetRef.current = 0
      setDragging(false)
      setArmed(false)
      setOffset(0)
    }
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    window.addEventListener('blur', end)
    return () => {
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      window.removeEventListener('blur', end)
    }
  }, [dragging])

  if (!enabled) return { offset: 0, armed: false, dragging: false, handlers: NO_HANDLERS }

  const tuning = () => (start.current?.mouse ? TUNING.mouse : TUNING.touch)

  const finish = (e: React.PointerEvent) => {
    // A second finger lifting must not end the first one's drag.
    if (start.current && e.pointerId !== start.current.id) return
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    const passed = axis.current === 'horizontal' && offsetRef.current >= tuning().threshold
    reset()
    if (passed) onTrigger()
  }

  return {
    offset,
    armed,
    dragging,
    handlers: {
      onPointerDown: (e) => {
        const mouse = e.pointerType === 'mouse'
        // Left button only, and never a drag that begins on a control.
        if (mouse && e.button !== 0) return
        if (e.target instanceof Element && e.target.closest(INTERACTIVE)) return
        // One gesture at a time: a second finger landing mid-drag would take
        // over the first one's start point and leave the row somewhere odd.
        if (start.current) return

        start.current = { x: e.clientX, y: e.clientY, id: e.pointerId, mouse }
        axis.current = 'undecided'
        buzzed.current = false
      },

      onPointerMove: (e) => {
        const from = start.current
        if (!from || e.pointerId !== from.id) return

        const dx = e.clientX - from.x
        const dy = e.clientY - from.y
        const { lock, threshold } = tuning()

        if (axis.current === 'undecided') {
          if (Math.abs(dx) < lock && Math.abs(dy) < lock) return
          // Leftward is nothing here, so it locks to vertical too and leaves the
          // row alone rather than tracking a gesture it will ignore.
          axis.current = dx > 0 && Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical'
          if (axis.current === 'horizontal') {
            setDragging(true)
            // Captured only now, not on pointerdown: capturing earlier would
            // retarget the click and break the row's own buttons.
            e.currentTarget.setPointerCapture?.(e.pointerId)
            // It cannot be a selection and a swipe at the same time.
            if (from.mouse) window.getSelection()?.removeAllRanges()
          }
        }
        if (axis.current !== 'horizontal') return

        // Damped: full speed to the threshold, then a third of it.
        const travel = Math.max(0, dx)
        const next = Math.min(
          threshold + OVERSHOOT,
          travel <= threshold ? travel : threshold + (travel - threshold) / 3,
        )
        offsetRef.current = next
        setOffset(next)
        setArmed(next >= threshold)

        if (next >= threshold && !buzzed.current) {
          buzzed.current = true
          if (!from.mouse) navigator.vibrate?.(8)
        }
      },

      onPointerUp: finish,
      onPointerCancel: finish,
    },
  }
}
