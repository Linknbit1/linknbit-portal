import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/cn'

interface PopoverProps {
  anchorRef: RefObject<HTMLElement | null>
  open: boolean
  onClose: () => void
  /** Make the popover at least as wide as the anchor (dropdowns). */
  matchAnchorWidth?: boolean
  className?: string
  children: ReactNode
}

const MARGIN = 8 // viewport gutter so the popover never touches the edge

/**
 * A portaled, anchored popover. Renders to document.body with `fixed` positioning
 * computed from the anchor's rect, so it escapes any `overflow:hidden` ancestor
 * (modals, drawers, scroll areas). Opens below the anchor, flips above when there
 * isn't room, clamps within the viewport, and repositions on scroll/resize.
 */
export function Popover({ anchorRef, open, onClose, matchAnchorWidth, className, children }: PopoverProps) {
  const popRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number; minWidth?: number } | null>(null)

  // Position once mounted (popRef measured), then keep in sync with scroll/resize.
  useLayoutEffect(() => {
    if (!open) return
    const reposition = () => {
      const anchor = anchorRef.current
      const pop = popRef.current
      if (!anchor || !pop) return
      const a = anchor.getBoundingClientRect()
      const popH = pop.offsetHeight
      const popW = pop.offsetWidth
      const vw = window.innerWidth
      const vh = window.innerHeight

      const spaceBelow = vh - a.bottom
      const openUp = spaceBelow < popH + MARGIN && a.top > spaceBelow

      let top = openUp ? a.top - popH - 4 : a.bottom + 4
      top = Math.max(MARGIN, Math.min(top, vh - popH - MARGIN))
      const left = Math.max(MARGIN, Math.min(a.left, vw - popW - MARGIN))

      setPos({ left, top, minWidth: matchAnchorWidth ? a.width : undefined })
    }

    reposition()
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [open, anchorRef, matchAnchorWidth])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (anchorRef.current?.contains(t) || popRef.current?.contains(t)) return
      onClose()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open, anchorRef, onClose])

  if (!open) return null

  return createPortal(
    <div
      ref={popRef}
      className={cn('fixed z-70', className)}
      style={{
        left: pos?.left ?? 0,
        top: pos?.top ?? 0,
        minWidth: pos?.minWidth,
        // Hide until measured to avoid a flash at the wrong spot.
        visibility: pos ? 'visible' : 'hidden',
      }}
    >
      {children}
    </div>,
    document.body,
  )
}
