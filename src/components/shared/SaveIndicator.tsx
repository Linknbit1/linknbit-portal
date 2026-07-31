import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, Check, Loader2, type LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { SaveState } from '../../hooks/useSaveStatus'

interface SaveIndicatorProps {
  state: SaveState
  className?: string
}

const COPY: Record<Exclude<SaveState, 'idle'>, { label: string; tone: string; icon: LucideIcon; spin?: boolean }> = {
  saving: { label: 'Saving…', tone: 'text-text-3', icon: Loader2, spin: true },
  saved: { label: 'Saved', tone: 'text-success', icon: Check },
  error: { label: 'Not saved', tone: 'text-error', icon: AlertCircle },
}

/**
 * Badge for screens that save edits the moment you make them, so a change never
 * looks like it silently went nowhere. Renders nothing while idle.
 */
export function SaveIndicator({ state, className }: SaveIndicatorProps) {
  const copy = state === 'idle' ? null : COPY[state]

  return (
    <AnimatePresence mode="wait">
      {copy && (
        // Keyed by state so a transition swaps the label instead of morphing it.
        <motion.span
          key={state}
          initial={{ opacity: 0, y: -2 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -2 }}
          transition={{ duration: 0.15 }}
          role="status"
          aria-live="polite"
          className={cn('flex shrink-0 items-center gap-1.5 font-ui text-[11.5px]', copy.tone, className)}
        >
          <copy.icon size={12} className={cn('shrink-0', copy.spin && 'animate-spin')} />
          {copy.label}
        </motion.span>
      )}
    </AnimatePresence>
  )
}
