import { useMemo, useState } from 'react'
import { CalendarDays, CalendarRange, Plus, Loader2 } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Avatar } from '../ui/Avatar'
import { Select } from '../ui/Select'
import { PeriodStepper } from '../ui/PeriodStepper'
import { Skeleton } from '../ui/Skeleton'
import { PersonLink } from './PersonLink'
import { useScheduleRoster, useMoveAllocation } from '../../hooks/useSchedule'
import { useToast } from '../ui/toast-context'
import { ViewToggle } from '../ui/ViewToggle'
import { usePeople } from '../../hooks/usePeople'
import { formatMinutes } from '../../lib/duration'
import type { ScheduleDay } from '../../api/schedule'
import { BookTimeSheet } from './BookTimeSheet'

/** Local ISO day, without going through UTC. */
function iso(d: Date): string {
  return new Intl.DateTimeFormat('en-CA').format(d)
}

function addDays(d: Date, n: number): Date {
  const next = new Date(d)
  next.setDate(next.getDate() + n)
  return next
}

/** Monday of the week containing `d`. The office week starts Monday. */
function startOfWeek(d: Date): Date {
  const day = (d.getDay() + 6) % 7
  return addDays(d, -day)
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/**
 * Week is seven days with room for the task names in each cell. Month is four
 * weeks at a glance, for the question "when does this person next have a clear
 * run" — the cells are too narrow for names, so they carry the numbers only.
 */
type ViewMode = 'week' | 'month'

/**
 * How full a day is.
 *
 * Over-booking is shown, never forbidden: a lead who genuinely needs nine hours
 * on a Tuesday should be able to say so and watch it go red. Blocking it just
 * moves the planning into a spreadsheet nobody else can see.
 */
function fill(planned: number, available: number): { bar: string; text: string; label: string } {
  if (available === 0) {
    return { bar: 'bg-surface-3', text: 'text-text-4', label: 'Not available' }
  }
  const pct = planned / available
  if (planned === 0) return { bar: 'bg-surface-3', text: 'text-text-4', label: 'Free' }
  if (pct > 1) return { bar: 'bg-error', text: 'text-error', label: 'Over' }
  if (pct >= 0.85) return { bar: 'bg-warning', text: 'text-warning', label: 'Full' }
  return { bar: 'bg-success', text: 'text-success', label: 'Booked' }
}

interface DayCellProps {
  cell: ScheduleDay | undefined
  onBook: () => void
  canPlan: boolean
  /** Month view: the cell is too narrow for task names, so it carries numbers only. */
  compact: boolean
  /** An allocation is in flight over the grid — this cell may be its destination. */
  dragging: boolean
  isDropTarget: boolean
  onDragStartAllocation: (allocationId: string) => void
  onDragOverCell: () => void
  onDropOnCell: () => void
  onDragEndAllocation: () => void
}

function DayCell({
  cell, onBook, canPlan, compact, dragging, isDropTarget,
  onDragStartAllocation, onDragOverCell, onDropOnCell, onDragEndAllocation,
}: DayCellProps) {
  const available = cell?.availableMinutes ?? 0
  const planned = cell?.plannedMinutes ?? 0
  const tone = fill(planned, available)
  const pct = available > 0 ? Math.min(100, Math.round((planned / available) * 100)) : 0
  const allocations = cell?.allocations ?? []

  // A day with no capacity is not an empty day — it is a day off, a holiday, or
  // one this person was not employed for. It must not read as "free", and there
  // is nothing to book into it.
  if (available === 0) {
    return (
      <div className={cn('border-l border-border-subtle bg-surface-2/40 p-2', compact ? 'min-h-[52px]' : 'min-h-[76px]')}>
        <p className="font-mono text-[10px] text-text-4">—</p>
      </div>
    )
  }

  const body = (
    <>
      <div className="flex items-baseline justify-between gap-1">
        <span className={cn('font-mono text-[11px] font-semibold tabular-nums', tone.text)}>
          {planned > 0 ? formatMinutes(planned) : '·'}
        </span>
        <span className="font-mono text-[10px] text-text-4 tabular-nums">
          {formatMinutes(available)}
        </span>
      </div>

      <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-3">
        <div className={cn('h-full rounded-full', tone.bar)} style={{ width: `${pct}%` }} />
      </div>

      <ul className={cn('mt-1.5 flex flex-col gap-0.5', compact && 'hidden')}>
        {allocations.slice(0, 2).map((a) => (
          <li
            key={a.id}
            // Dragging moves a booking to another day. It is a shortcut for what
            // the booking panel already does, never the only way — the panel
            // stays the path on a phone and from a keyboard.
            draggable={canPlan}
            onDragStart={(e) => {
              e.stopPropagation()
              e.dataTransfer.effectAllowed = 'move'
              onDragStartAllocation(a.id)
            }}
            onDragEnd={onDragEndAllocation}
            className={cn(
              'truncate font-ui text-[10.5px] text-text-2',
              canPlan && 'cursor-grab active:cursor-grabbing',
            )}
            title={a.task_title}
          >
            {a.task_title}
          </li>
        ))}
        {allocations.length > 2 && (
          <li className="font-mono text-[10px] text-text-4">+{allocations.length - 2} more</li>
        )}
      </ul>
    </>
  )

  if (!canPlan) {
    return (
      <div className={cn('border-l border-border-subtle p-2 text-left', compact ? 'min-h-[52px]' : 'min-h-[76px]')}>
        {body}
      </div>
    )
  }

  // The whole cell is the target, not a button revealed on hover. A hover-only
  // affordance does not exist on a phone at all, and this grid is meant to be
  // usable on one — the plus is a hint for the mouse, never the only way in.
  return (
    <button
      type="button"
      onClick={onBook}
      aria-label={
        planned > 0
          ? `Book time — ${formatMinutes(planned)} of ${formatMinutes(available)} already booked`
          : `Book time — ${formatMinutes(available)} free`
      }
      onDragOver={(e) => { if (dragging) { e.preventDefault(); onDragOverCell() } }}
      onDrop={(e) => { if (dragging) { e.preventDefault(); onDropOnCell() } }}
      className={cn(
        'group relative border-l border-border-subtle p-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border-focus',
        compact ? 'min-h-[52px]' : 'min-h-[76px]',
        isDropTarget ? 'bg-brand-red/10 ring-1 ring-inset ring-brand-red/40' : 'hover:bg-surface-2/60 focus-visible:bg-surface-2/60',
      )}
    >
      {body}
      <Plus
        size={11}
        aria-hidden
        className="absolute bottom-1.5 right-1.5 text-text-4 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
      />
    </button>
  )
}

interface ScheduleGridProps {
  /** Whether this viewer may create bookings. Read-only otherwise. */
  canPlan: boolean
  /**
   * Pin the grid to one person and hide the picker. Used by "My week", where
   * offering a filter that can only ever have one value is a control that does
   * nothing.
   */
  lockedProfileId?: string
}

/**
 * The week, people down the side and days across.
 *
 * Capacity first, bookings second: the denominator in every cell is how much time
 * that person actually has, after their working days, leave, holidays and
 * approved exceptions. A cell with no capacity says so rather than reading as an
 * empty, bookable day.
 */
export function ScheduleGrid({ canPlan, lockedProfileId }: ScheduleGridProps) {
  const [view, setView] = useState<ViewMode>('week')
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date()))
  const [personFilter, setPersonFilter] = useState('')
  const [booking, setBooking] = useState<{ profileId: string; profileName: string; day: string } | null>(null)
  // The booking being dragged, and the cell it is currently over. Held here
  // rather than in each cell so only one cell can be the target at a time.
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropAt, setDropAt] = useState<{ profileId: string; day: string } | null>(null)

  const move = useMoveAllocation()
  const toast = useToast()

  const span = view === 'week' ? 7 : 28
  const from = iso(anchor)
  const to = iso(addDays(anchor, span - 1))
  const person = lockedProfileId ?? (personFilter || undefined)
  const { data: rows = [], isLoading } = useScheduleRoster(from, to, person)
  const { data: people = [] } = usePeople()

  const days = useMemo(
    () => Array.from({ length: span }, (_, i) => iso(addDays(anchor, i))),
    [anchor, span],
  )

  /** profileId -> day -> cell. One pass, so the grid does lookups rather than scans. */
  const byPerson = useMemo(() => {
    const map = new Map<string, { name: string; avatar: string | null; title: string | null; days: Map<string, ScheduleDay> }>()
    for (const row of rows) {
      let entry = map.get(row.profileId)
      if (!entry) {
        entry = { name: row.profileName, avatar: row.avatarUrl, title: row.jobTitle, days: new Map() }
        map.set(row.profileId, entry)
      }
      entry.days.set(row.day, row)
    }
    return map
  }, [rows])

  const rangeLabel = `${new Date(from).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${new Date(to).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
  const isCurrent = from === iso(startOfWeek(new Date()))

  const personOptions = [
    { value: '', label: 'Everyone' },
    ...people
      .filter((p) => p.is_active)
      .map((p) => ({ value: p.id, label: p.name, avatar: { name: p.name, url: p.avatar_url } })),
  ]

  /** Drops a booking on another person-day. Same person only: moving work to a
   *  different person is a reassignment, which is a bigger decision than a drag. */
  const handleDrop = async (profileId: string, day: string) => {
    const id = dragId
    setDragId(null)
    setDropAt(null)
    if (!id) return
    const origin = rows.find((r) => r.allocations.some((a) => a.id === id))
    if (!origin) return
    if (origin.profileId !== profileId) {
      toast('Drag moves a booking to another day, not to another person. Book it on them instead.', 'error')
      return
    }
    if (origin.day === day) return
    try {
      await move.mutateAsync({ id, day })
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not move that booking', 'error')
    }
  }

  const totals = useMemo(() => ({
    available: rows.reduce((s, r) => s + r.availableMinutes, 0),
    planned: rows.reduce((s, r) => s + r.plannedMinutes, 0),
  }), [rows])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <PeriodStepper
          icon={CalendarDays}
          label={rangeLabel}
          onPrev={() => setAnchor((a) => addDays(a, -span))}
          onNext={() => setAnchor((a) => addDays(a, span))}
        >
          {isCurrent && (
            <span className="ml-1 rounded-xs border border-brand-red/20 bg-brand-red/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-brand-red">
              {view === 'week' ? 'This week' : 'From today'}
            </span>
          )}
        </PeriodStepper>

        <ViewToggle
          value={view}
          onChange={(next) => {
            setView(next)
            setAnchor(next === 'week' ? startOfWeek(new Date()) : new Date())
          }}
          options={[
            { value: 'week', label: 'Week', icon: CalendarDays },
            { value: 'month', label: '4 weeks', icon: CalendarRange },
          ]}
        />

        {!lockedProfileId && (
          <div className="w-52">
            <Select value={personFilter} onChange={setPersonFilter} options={personOptions} size="sm" />
          </div>
        )}

        <p className="ml-auto font-mono text-[11.5px] text-text-3 tabular-nums">
          {formatMinutes(totals.planned)} booked
          <span className="text-text-4"> of {formatMinutes(totals.available)}</span>
        </p>
      </div>

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : byPerson.size === 0 ? (
        <p className="border border-border-default bg-surface-1 px-4 py-10 text-center font-ui text-[12.5px] text-text-4">
          Nobody to plan here. You see your own week, your team&rsquo;s if you lead one, and
          everyone&rsquo;s if you run delivery.
        </p>
      ) : (
        <div className="overflow-x-auto border border-border-default bg-surface-1">
          <div style={{ minWidth: view === 'week' ? 840 : 1180 }}>
            <div
              className="grid border-b border-border-default bg-surface-2"
              style={{ gridTemplateColumns: `180px repeat(${span}, minmax(0, 1fr))` }}
            >
              <div className="px-3 py-2 font-ui text-[11px] font-semibold uppercase tracking-wider text-text-3">
                Person
              </div>
              {days.map((d, i) => (
                <div key={d} className="border-l border-border-subtle p-2">
                  <p className="font-ui text-[11px] font-semibold text-text-2">{WEEKDAYS[i]}</p>
                  <p className="font-mono text-[10px] text-text-4">
                    {new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              ))}
            </div>

            {[...byPerson.entries()].map(([profileId, person]) => (
              <div
                key={profileId}
                className="grid border-b border-border-subtle last:border-b-0"
                style={{ gridTemplateColumns: `180px repeat(${span}, minmax(0, 1fr))` }}
              >
                <div className="flex items-center gap-2.5 px-3 py-2">
                  <Avatar name={person.name} src={person.avatar ?? undefined} size="xs" personId={profileId} />
                  <div className="min-w-0">
                    <PersonLink personId={profileId} className="block truncate font-ui text-[12px] font-semibold text-text-1">
                      {person.name}
                    </PersonLink>
                    {person.title && (
                      <p className="truncate font-mono text-[10px] text-text-4">{person.title}</p>
                    )}
                  </div>
                </div>
                {days.map((d) => (
                  <DayCell
                    key={d}
                    cell={person.days.get(d)}
                    canPlan={canPlan}
                    compact={view === 'month'}
                    dragging={dragId !== null}
                    isDropTarget={dropAt?.profileId === profileId && dropAt?.day === d}
                    onBook={() => setBooking({ profileId, profileName: person.name, day: d })}
                    onDragStartAllocation={setDragId}
                    onDragOverCell={() => setDropAt({ profileId, day: d })}
                    onDropOnCell={() => void handleDrop(profileId, d)}
                    onDragEndAllocation={() => { setDragId(null); setDropAt(null) }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {booking && (
        <BookTimeSheet
          profileId={booking.profileId}
          profileName={booking.profileName}
          day={booking.day}
          onClose={() => setBooking(null)}
        />
      )}
    </div>
  )
}

/** Shown while the roster loads, so the grid does not jump into place. */
export function ScheduleGridSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-64" />
      <span className="sr-only">
        <Loader2 /> Loading the schedule
      </span>
    </div>
  )
}
