import { useEffect, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useIsDesktop } from '../../hooks/useMediaQuery'

type ModalSize = 'sm' | 'md' | 'lg'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: ModalSize
  /** Block backdrop/Esc close (e.g. while a request is in flight). */
  busy?: boolean
}

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: 'lg:max-w-sm',
  md: 'lg:max-w-md',
  lg: 'lg:max-w-lg',
}

/**
 * Responsive dialog: a bottom-sheet on mobile (slides up, rounded top, full-width)
 * and a centered card on desktop. Handles backdrop, Esc, and body-scroll lock.
 */
export function Modal({ open, onClose, title, children, footer, size = 'md', busy = false }: ModalProps) {
  const isDesktop = useIsDesktop()

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && open && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, busy])

  const panelMotion = isDesktop
    ? { initial: { opacity: 0, scale: 0.97, y: 8 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.97, y: 8 } }
    : { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end lg:items-center justify-center lg:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={busy ? undefined : onClose}
          />
          <motion.div
            {...panelMotion}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            role="dialog"
            aria-modal="true"
            className={cn(
              'relative flex flex-col w-full bg-surface-1 border border-border-default shadow-2xl overflow-hidden',
              'max-h-[92vh] rounded-t-2xl lg:rounded-xl pb-[env(safe-area-inset-bottom)] lg:pb-0',
              SIZE_CLASS[size],
            )}
          >
            {title && (
              <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-border-subtle flex-shrink-0">
                <h2 className="font-display font-bold text-[16px] text-text-1 min-w-0 truncate">{title}</h2>
                <button
                  onClick={onClose}
                  disabled={busy}
                  className="w-7 h-7 rounded-md flex items-center justify-center text-text-3 hover:text-text-1 hover:bg-surface-2 transition-colors flex-shrink-0"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto">{children}</div>
            {footer && (
              <div className="flex-shrink-0 border-t border-border-subtle px-5 py-4">{footer}</div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
