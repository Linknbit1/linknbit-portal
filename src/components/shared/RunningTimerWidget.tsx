import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Square, Loader2, Timer } from 'lucide-react'
import { useRunningTimeEntry, useStopTimer } from '../../hooks/useTimeEntries'
import { useToast } from '../ui/toast-context'
import { formatClock, formatMinutes, secondsBetween } from '../../lib/duration'
import { cn } from '../../lib/cn'

/** Ticks once a second, and only while a timer is actually running. */
function useElapsed(startedAt: string | undefined): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!startedAt) return
    // No initial setNow: the first tick lands within a second, and `now` is
    // already current from the initialiser.
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [startedAt])

  return startedAt ? secondsBetween(startedAt, null, now) : 0
}

/**
 * The running timer, pinned bottom-right for as long as it runs — so closing the
 * task drawer never hides the fact that the clock is going. Mounted once in the
 * app shell; renders nothing when no timer is active.
 */
export function RunningTimerWidget() {
  const navigate = useNavigate()
  const toast = useToast()
  const { data: running } = useRunningTimeEntry()
  const stopTimer = useStopTimer()

  const elapsed = useElapsed(running?.started_at)
  const task = running?.task ?? null

  const stop = () => {
    stopTimer.mutate(undefined, {
      onSuccess: (entry) => {
        const mins = entry ? Math.round(secondsBetween(entry.started_at, entry.ended_at) / 60) : 0
        toast(`Timer stopped — ${formatMinutes(mins)} logged`, 'success')
      },
      onError: (e) => toast(e instanceof Error ? e.message : 'Could not stop the timer', 'error'),
    })
  }

  return (
    <AnimatePresence>
      {running && (
        <motion.aside
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.96 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          aria-label="Running timer"
          className={cn(
            'fixed right-4 z-40 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-lg',
            // A warm red-tinted surface carries the "running" state instead of a
            // top rule — visible against the page without shouting.
            'border border-brand-red/35 bg-[linear-gradient(140deg,rgba(238,39,55,0.16),rgba(19,28,40,0.98)_62%)]',
            'shadow-[0_18px_50px_rgba(0,0,0,0.5)] backdrop-blur-sm',
            // Clears the mobile tab bar (4rem + safe area); sits lower on desktop.
            'bottom-[calc(5rem+env(safe-area-inset-bottom))] lg:bottom-6 lg:right-6',
          )}
        >
          <div className="flex items-center gap-3 p-3">
            <span className="relative flex size-9 shrink-0 items-center justify-center rounded-md bg-brand-red/12 text-brand-red">
              <Timer size={16} />
              <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-brand-red">
                <span className="absolute inset-0 animate-ping rounded-full bg-brand-red opacity-75" />
              </span>
            </span>

            <button
              type="button"
              onClick={() => task && navigate(`/admin/tasks/${task.id}`)}
              disabled={!task}
              className="min-w-0 flex-1 text-left disabled:cursor-default"
            >
              <p className="truncate font-ui text-[12.5px] font-semibold text-text-1">
                {task?.title ?? 'Tracking time'}
              </p>
              <p className="truncate font-ui text-[11px] text-text-3">
                {task?.project?.name ?? 'No project'}
              </p>
            </button>

            <span className="shrink-0 font-mono text-[15px] font-semibold tabular-nums text-text-1">
              {formatClock(elapsed)}
            </span>

            <button
              type="button"
              onClick={stop}
              disabled={stopTimer.isPending}
              aria-label="Stop timer"
              className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-red text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {stopTimer.isPending ? <Loader2 size={14} className="animate-spin" /> : <Square size={13} className="fill-current" />}
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
