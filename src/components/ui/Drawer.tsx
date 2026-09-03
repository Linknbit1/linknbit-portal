import { useEffect, type ReactNode } from 'react'
import { AnimatePresence, motion, useDragControls } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useIsDesktop } from '../../hooks/useMediaQuery'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  footer?: ReactNode
  /** Desktop width for a right-side drawer (px number or any CSS width; ignored on mobile / bottom). */
  width?: number | string
  side?: 'right' | 'bottom'
  /** Block backdrop, Escape and drag-to-dismiss (e.g. while a save is in flight). */
  busy?: boolean
  /**
   * Fires once the close animation has finished. Lets a conditionally-mounted
   * drawer play its slide-out before the parent unmounts it.
   */
  onExitComplete?: () => void
}

export function Drawer({ open, onClose, title, children, footer, width = 520, side = 'right', busy = false, onExitComplete }: DrawerProps) {
  const requestClose = () => { if (!busy) onClose() }
  const isDesktop = useIsDesktop()
  // A bottom drawer is always a bottom sheet; a right drawer becomes a full-screen
  // sheet on mobile and a fixed-width side panel on desktop.
  const asBottom = side === 'bottom'
  // Drag is started by the grab handle only, never by the panel itself: the body
  // scrolls, and a sheet that follows every downward swipe would fight it.
  const dragControls = useDragControls()

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) requestClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // requestClose is derived from onClose and busy, both of which are listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onClose, busy])

  const motionProps = asBottom
    ? { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } }
    : { initial: { x: '100%' }, animate: { x: 0 }, exit: { x: '100%' } }

  return (
    <AnimatePresence onExitComplete={onExitComplete}>
      {open && (
        <div className={cn('fixed inset-0 z-50 flex', asBottom ? 'items-end' : 'justify-end')}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={requestClose}
          />
          {/* Panel */}
          <motion.aside
            {...motionProps}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            {...(asBottom && {
              drag: 'y' as const,
              dragControls,
              dragListener: false,
              dragConstraints: { top: 0, bottom: 0 },
              dragElastic: { top: 0, bottom: 0.6 },
              // Dismiss on a decisive flick or a long pull; anything less springs
              // back, so a hesitant drag never loses the panel.
              onDragEnd: (_: unknown, info: { offset: { y: number }; velocity: { y: number } }) => {
                if (info.offset.y > 120 || info.velocity.y > 600) requestClose()
              },
            })}
            className={cn(
              'relative flex flex-col bg-surface-1 shadow-pop overflow-hidden',
              asBottom
                ? 'w-full max-h-[90vh] rounded-t-2xl border-t border-border-default'
                : 'size-full lg:w-auto border-l border-border-default',
            )}
            style={!asBottom && isDesktop ? { width } : undefined}
          >
            {/* Grab handle — the drag affordance and the drag surface, both. */}
            {asBottom && (
              <div
                onPointerDown={(e) => dragControls.start(e)}
                className="shrink-0 flex cursor-grab touch-none justify-center pt-2.5 pb-1 active:cursor-grabbing"
                aria-hidden
              >
                <span className="h-1 w-10 rounded-full bg-border-strong" />
              </div>
            )}
            {/* Header */}
            <div className={cn(
              'flex items-start justify-between gap-4 border-b border-border-default shrink-0',
              asBottom ? 'px-5 pb-4 pt-2' : 'p-5',
            )}>
              <div className="flex-1 min-w-0">{title}</div>
              <button
                onClick={requestClose}
                disabled={busy}
                className="size-8 rounded-sm bg-surface-2 border border-border-default text-text-3 hover:text-text-1 flex items-center justify-center shrink-0 transition-colors disabled:opacity-50"
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>
            {/* Body */}
            <div className="flex-1 overflow-y-auto">{children}</div>
            {/* Footer */}
            {footer && (
              <div className={cn(
                'shrink-0 border-t border-border-default p-4 bg-surface-1',
                // A bottom sheet ends at the screen edge, where the home
                // indicator sits.
                asBottom && 'pb-safe',
              )}>
                {footer}
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}
