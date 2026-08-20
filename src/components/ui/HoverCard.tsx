import { useCallback, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/cn'

interface HoverCardProps {
  /** What the card shows. Rendered only while open, so it costs nothing at rest. */
  content: ReactNode
  children: ReactNode
  className?: string
  /** Positioning for the trigger itself — the timesheet places its own segments. */
  style?: React.CSSProperties
}

/**
 * A tooltip that appears the instant you hover it.
 *
 * The native `title` attribute waits a second or more before showing, cannot be
 * styled, and renders as an OS chrome box that looks nothing like the rest of
 * the portal — fine for a hint, useless when the tooltip carries the actual
 * data, which on the timesheet it does.
 *
 * Rendered through a portal and positioned from the trigger's own rect, so a
 * segment inside an `overflow-hidden` bar is not clipped by it.
 */
export function HoverCard({ content, children, className, style }: HoverCardProps) {
  const [at, setAt] = useState<{ x: number; y: number } | null>(null)
  const ref = useRef<HTMLSpanElement>(null)

  const show = useCallback(() => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    setAt({ x: rect.left + rect.width / 2, y: rect.top })
  }, [])

  const hide = useCallback(() => setAt(null), [])

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={show}
        onMouseLeave={hide}
        // Keyboard users get it too — the timesheet's detail is not optional.
        onFocus={show}
        onBlur={hide}
        className={className}
        style={style}
      >
        {children}
      </span>

      {at && createPortal(
        <div
          role="tooltip"
          // Fixed, because the trigger's rect is already viewport-relative.
          style={{ left: at.x, top: at.y }}
          className={cn(
            'pointer-events-none fixed z-100 -translate-x-1/2 -translate-y-[calc(100%+8px)]',
            'rounded-md border border-border-strong bg-surface-3 px-2.5 py-2 shadow-lg',
            'motion-safe:animate-hover-card',
          )}
        >
          {content}
          {/* The little pointer, drawn as a rotated corner of the same box. */}
          <span
            aria-hidden
            className="absolute left-1/2 top-full size-2 -translate-1/2 rotate-45 border-b border-r border-border-strong bg-surface-3"
          />
        </div>,
        document.body,
      )}
    </>
  )
}
