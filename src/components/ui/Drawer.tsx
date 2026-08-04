import { useEffect, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
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
  /**
   * Fires once the close animation has finished. Lets a conditionally-mounted
   * drawer play its slide-out before the parent unmounts it.
   */
  onExitComplete?: () => void
}

export function Drawer({ open, onClose, title, children, footer, width = 520, side = 'right', onExitComplete }: DrawerProps) {
  const isDesktop = useIsDesktop()
  // A bottom drawer is always a bottom sheet; a right drawer becomes a full-screen
  // sheet on mobile and a fixed-width side panel on desktop.
  const asBottom = side === 'bottom'

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

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
            onClick={onClose}
          />
          {/* Panel */}
          <motion.aside
            {...motionProps}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={cn(
              'relative flex flex-col bg-surface-1 shadow-pop overflow-hidden',
              asBottom
                ? 'w-full max-h-[90vh] rounded-t-2xl border-t border-border-default'
                : 'size-full lg:w-auto border-l border-border-default',
            )}
            style={!asBottom && isDesktop ? { width } : undefined}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 p-5 border-b border-border-default shrink-0">
              <div className="flex-1 min-w-0">{title}</div>
              <button
                onClick={onClose}
                className="size-8 rounded-sm bg-surface-2 border border-border-default text-text-3 hover:text-text-1 flex items-center justify-center shrink-0 transition-colors"
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>
            {/* Body */}
            <div className="flex-1 overflow-y-auto">{children}</div>
            {/* Footer */}
            {footer && (
              <div className="shrink-0 border-t border-border-default p-4 bg-surface-1">
                {footer}
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}
