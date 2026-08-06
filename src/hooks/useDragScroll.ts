import { useCallback, useRef, type RefCallback } from 'react'

/** Elements that own the pointer themselves — a pan must never start on one. */
const NO_PAN = '[data-no-pan],button,a,input,textarea,select,[contenteditable="true"]'

/** How far the pointer travels before a click turns into a pan. */
const PAN_THRESHOLD_PX = 6

/**
 * Click-and-hold horizontal panning for a sideways-scrolling container (the task
 * board). Returns a ref callback to spread onto the scroller.
 *
 * Mouse only: touch already pans natively with momentum and snapping, and
 * hijacking it would fight both. Panning also yields to anything that owns its
 * own pointer — draggable cards, buttons, links — so drag-and-drop still works.
 */
export function useDragScroll<T extends HTMLElement>(): RefCallback<T> {
  const cleanup = useRef<(() => void) | null>(null)

  return useCallback((el: T | null) => {
    cleanup.current?.()
    cleanup.current = null
    if (!el) return

    let pointerId: number | null = null
    let startX = 0
    let startScroll = 0
    let panning = false
    // Mandatory snap re-snaps after every programmatic scroll, which fights a
    // drag frame by frame; it goes back on when the pan ends.
    let snap = ''

    const stop = () => {
      if (panning) {
        el.style.scrollSnapType = snap
        el.style.cursor = ''
        el.style.userSelect = ''
      }
      pointerId = null
      panning = false
    }

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return
      if (e.target instanceof Element && e.target.closest(NO_PAN)) return
      pointerId = e.pointerId
      startX = e.clientX
      startScroll = el.scrollLeft
    }

    const onPointerMove = (e: PointerEvent) => {
      if (pointerId !== e.pointerId) return
      const dx = e.clientX - startX
      if (!panning) {
        if (Math.abs(dx) < PAN_THRESHOLD_PX) return
        panning = true
        snap = el.style.scrollSnapType
        el.style.scrollSnapType = 'none'
        el.style.cursor = 'grabbing'
        el.style.userSelect = 'none'
        el.setPointerCapture(e.pointerId)
      }
      el.scrollLeft = startScroll - dx
      e.preventDefault()
    }

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', stop)
    el.addEventListener('pointercancel', stop)

    cleanup.current = () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', stop)
      el.removeEventListener('pointercancel', stop)
    }
  }, [])
}
