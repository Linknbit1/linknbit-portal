import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Square, Loader2, Timer, ChevronRight, GripVertical } from 'lucide-react'
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

/** Keeps the widget clear of the very top and bottom of the screen. */
const EDGE_GAP = 16
const TOP_GAP = 72

/**
 * Drag the widget up and down its own edge.
 *
 * Vertical only: it is docked to the right, and letting it wander horizontally
 * would just mean it could be dropped somewhere it covers something else — the
 * problem this exists to solve.
 *
 * `bottom` in pixels, or null while it has not been moved, in which case the
 * class-based position applies and the widget keeps its responsive placement.
 */
function useVerticalDrag(ref: React.RefObject<HTMLElement | null>) {
  const [bottom, setBottom] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)
  const from = useRef<{ y: number; bottom: number } | null>(null)

  const clamp = (value: number, height: number) =>
    Math.max(EDGE_GAP, Math.min(value, window.innerHeight - height - TOP_GAP))

  // A window that shrinks — a phone rotating, a desktop split — must not leave
  // the widget parked off-screen where it cannot be reached to move back.
  useEffect(() => {
    const onResize = () => {
      const el = ref.current
      if (!el) return
      setBottom((current) => (current === null ? null : clamp(current, el.offsetHeight)))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [ref])

  return {
    bottom,
    dragging,
    handlers: {
      onPointerDown: (e: React.PointerEvent) => {
        // Never from a control: the stop button is the one thing that must not
        // become a drag handle by accident.
        if (e.target instanceof Element && e.target.closest('button')) return
        const el = ref.current
        if (!el) return
        e.currentTarget.setPointerCapture?.(e.pointerId)
        from.current = {
          y: e.clientY,
          bottom: window.innerHeight - el.getBoundingClientRect().bottom,
        }
        setDragging(true)
      },
      onPointerMove: (e: React.PointerEvent) => {
        const start = from.current
        const el = ref.current
        if (!start || !el) return
        // Up is positive: bottom grows as the pointer rises.
        setBottom(clamp(start.bottom + (start.y - e.clientY), el.offsetHeight))
      },
      onPointerUp: () => { from.current = null; setDragging(false) },
      onPointerCancel: () => { from.current = null; setDragging(false) },
    },
  }
}

/**
 * The running timer, pinned for as long as it runs — so closing the task drawer
 * never hides the fact that the clock is going. Mounted once in the app shell;
 * renders nothing when no timer is active.
 *
 * Docked to the right edge and draggable up and down it, because there is no
 * corner that is free on every screen: bottom-right covers a send button,
 * bottom-left covers the sidebar's own footer. Rather than guess, it starts
 * somewhere sensible and moves wherever it is put.
 *
 * Collapsed to a pill by default on a phone, where 20rem of card is most of the
 * screen. The clock and the stop button are what the widget is FOR; the task
 * and project are what you expand it to check.
 */
export function RunningTimerWidget() {
  const navigate = useNavigate()
  const toast = useToast()
  const { data: running } = useRunningTimeEntry()
  const stopTimer = useStopTimer()

  const cardRef = useRef<HTMLElement>(null)
  const drag = useVerticalDrag(cardRef)
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
          ref={cardRef}
          {...drag.handlers}
          style={drag.bottom === null ? undefined : { bottom: drag.bottom }}
          aria-label="Running timer"
          className={cn(
            'fixed right-4 z-40 touch-none select-none overflow-hidden rounded-lg',
            drag.dragging ? 'cursor-grabbing' : 'cursor-grab',
            // A warm red-tinted surface carries the "running" state instead of a
            // top rule — visible against the page without shouting.
            'border border-brand-red/35 bg-[linear-gradient(140deg,rgba(224,20,20,0.16),rgba(19,28,40,0.98)_62%)]',
            'shadow-[0_18px_50px_rgba(0,0,0,0.5)] backdrop-blur-sm',
            // Where it starts: clear of the mobile tab bar (4rem + safe area),
            // and lower on desktop. Dropped the moment it is dragged.
            drag.bottom === null && 'bottom-[calc(5rem+env(safe-area-inset-bottom))] lg:bottom-6',
            'lg:right-6',
            open && 'w-[min(20rem,calc(100vw-2rem))]',
          )}
        >
          <div className={cn('flex items-center', open ? 'gap-3 p-3' : 'gap-2 p-2')}>
            <GripVertical size={13} className="-mr-1 shrink-0 text-text-4" aria-hidden />
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
                {running.note && (
                  <p className="mt-0.5 truncate font-ui text-[11px] italic text-text-2" title={running.note}>
                    {running.note}
                  </p>
                )}
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
