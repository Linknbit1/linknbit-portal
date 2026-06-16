import { useEffect, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../lib/cn'
import { useIsDesktop } from '../../hooks/useMediaQuery'

export type ModalSize = 'sm' | 'md' | 'lg'

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
}

interface ModalShellProps {
  onClose: () => void
  size?: ModalSize
  /** Block backdrop/Esc close (e.g. while a request is in flight). */
  busy?: boolean
  /** Applied to the scrolling content area (e.g. padding) when `scroll` is true. */
  contentClassName?: string
  /** When true (default) children scroll inside a padded area; set false to manage layout yourself. */
  scroll?: boolean
  children: ReactNode
}

/**
 * The single reusable modal wrapper. Renders a fading backdrop and a panel that
 * slides up like a bottom-sheet on mobile/tablet and scales in (centered) on
 * desktop. Handles body-scroll lock and Escape-to-close. Mounting the component
 * plays the enter animation; callers conditionally render it.
 */
export function ModalShell({ onClose, size = 'md', busy = false, contentClassName, scroll = true, children }: ModalShellProps) {
  const isDesktop = useIsDesktop()

  useEffect(() => {
    // Restore the prior value (not just '') so closing a modal opened on top of
    // another scroll-locking surface (e.g. the mobile nav drawer) keeps it locked.
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, busy])

  const panelMotion = isDesktop
    ? { initial: { opacity: 0, scale: 0.97, y: 8 }, animate: { opacity: 1, scale: 1, y: 0 } }
    : { initial: { y: '100%' }, animate: { y: 0 } }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
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
          'relative flex flex-col w-full bg-surface-1 border border-border-default shadow-2xl',
          'rounded-t-2xl sm:rounded-xl max-h-[92vh] overflow-hidden',
          SIZE_CLASS[size],
        )}
      >
        {scroll
          ? <div className={cn('flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)] sm:pb-0', contentClassName)}>{children}</div>
          : children}
      </motion.div>
    </div>
  )
}
