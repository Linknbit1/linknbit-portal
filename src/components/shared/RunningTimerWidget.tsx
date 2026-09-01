import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Square, Loader2, Timer, ChevronRight } from 'lucide-react'
import { useRunningTimeEntry, useStopTimer } from '../../hooks/useTimeEntries'
import { useIsDesktop } from '../../hooks/useMediaQuery'
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
 * The running timer, pinned for as long as it runs — so closing the task drawer
 * never hides the fact that the clock is going. Mounted once in the app shell;
 * renders nothing when no timer is active.
 *
 * Bottom-LEFT, not right. Bottom-right is where interfaces put the thing you
 * press: a send button, a save, a floating action. A panel parked there is not
 * an overlay, it is a lid — it sat on top of the chat composer's Send and there
 * was no way to move it.
 *
 * And collapsed to a pill by default on a phone, where 20rem of card is most of
 * the screen. The clock and the stop button are what the widget is FOR; the task
 * and project are what you expand it to check.
 */
export function RunningTimerWidget() {
  const navigate = useNavigate()
  const toast = useToast()
  const { data: running } = useRunningTimeEntry()
  const stopTimer = useStopTimer()

  const isDesktop = useIsDesktop()
  // null = not chosen, so follow the screen. Once someone opens or closes it,
  // their choice holds for as long as the timer runs.
  const [expanded, setExpanded] = useState<boolean | null>(null)
  const open = expanded ?? isDesktop

  const elapsed = useElapsed(running?.started_at)
  const task = running?.task ?? null

  const stop = () => {
    stopTimer.mutate(undefined, {
      onSuccess: (entry) => {
        const mins = entry ? Math.round(secondsBetween(entry.started_at, entry.ended_at) / 60) : 0
        toast(`Timer stopped, ${formatMinutes(mins)} logged`, 'success')
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
            'fixed left-4 z-40 overflow-hidden rounded-lg',
            // A warm red-tinted surface carries the "running" state instead of a
            // top rule — visible against the page without shouting.
            'border border-brand-red/35 bg-[linear-gradient(140deg,rgba(224,20,20,0.16),rgba(19,28,40,0.98)_62%)]',
            'shadow-[0_18px_50px_rgba(0,0,0,0.5)] backdrop-blur-sm',
            // Clears the mobile tab bar (4rem + safe area), and on a phone that
            // offset also puts it above the chat composer rather than over it.
            'bottom-[calc(5rem+env(safe-area-inset-bottom))] lg:bottom-6',
            // Past the sidebar on desktop, whose own footer holds the install
            // row — the bottom-left corner is no more free than the right one.
            // Offset from the token, so it moves if the sidebar ever does.
            'lg:left-[calc(var(--width-sidebar)+1.5rem)]',
            open && 'w-[min(20rem,calc(100vw-2rem))]',
          )}
        >
          <div className={cn('flex items-center', open ? 'gap-3 p-3' : 'gap-2 p-2')}>
            <span className={cn(
              'relative flex shrink-0 items-center justify-center rounded-md bg-brand-red/12 text-brand-red',
              open ? 'size-9' : 'size-7',
            )}>
              <Timer size={open ? 16 : 14} />
              <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-brand-red">
                <span className="absolute inset-0 animate-ping rounded-full bg-brand-red opacity-75" />
              </span>
            </span>

            {open && (
              <button
                type="button"
                onClick={() => task && navigate(`/tasks/${task.id}`)}
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
            )}

            <button
              type="button"
              onClick={() => setExpanded(!open)}
              aria-expanded={open}
              aria-label={open ? 'Collapse the timer' : `Expand the timer, ${task?.title ?? 'tracking time'}`}
              title={open ? 'Collapse' : task?.title ?? 'Tracking time'}
              className="flex shrink-0 items-center gap-1 font-mono text-[15px] font-semibold tabular-nums text-text-1"
            >
              {formatClock(elapsed)}
              <ChevronRight
                size={13}
                className={cn('text-text-3 transition-transform', open && 'rotate-180')}
              />
            </button>

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
