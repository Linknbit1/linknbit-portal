import { useMemo, useState } from 'react'
import {
  Loader2, Palmtree, Home, Plane, CalendarDays, Clock, LogOut, DoorOpen, Sunrise, Sunset,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Avatar } from '../ui/Avatar'
import { PersonLink } from './PersonLink'
import { PeriodStepper } from '../ui/PeriodStepper'
import { formatDate, formatTimeOfDay } from '../../lib/utils'
import { toDayPart, DAY_PART_LABEL } from '../../lib/dayParts'
import { exceptionTypeLabel } from '../../lib/exceptionTypes'
import type { AttendanceDayPart } from '../../types'
import {
  useHolidays,
  useWorkingSaturdays,
  useCompanyWfhDays,
  useAllLeaveRequests,
  useAllWfhRequests,
  useAllAttendanceExceptions,
  useAttendanceSettings,
} from '../../hooks/useAttendance'

/** Local calendar date (`en-CA` renders ISO) — the calendar is a local-day view. */
function localToday(): string {
  return new Intl.DateTimeFormat('en-CA').format(new Date())
}

/** `YYYY-MM-DD` for a local Y/M/D, without going through UTC. */
function iso(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const EXCEPTION_ICON: Record<string, LucideIcon> = {
  late_arrival: Clock,
  early_departure: LogOut,
  out_of_office: DoorOpen,
}

/** The half a partial day covers, so a half day never reads as a whole one. */
const HALF_ICON: Record<Exclude<AttendanceDayPart, 'full'>, LucideIcon> = {
  first_half: Sunrise,
  second_half: Sunset,
}

/** Someone not on an ordinary full day in the office, and how. */
interface Entry {
  /** Request/exception id — a person can appear twice on one day. */
  id: string
  profileId: string
  name: string
  avatarUrl: string | null
  kind: 'leave' | 'wfh' | 'exception'
  /** 'full' for anything that is not an explicitly partial leave or WFH. */
  dayPart: AttendanceDayPart
  label: string
  /** Exceptions only — the time window they asked for. */
  time: string | null
  icon: LucideIcon
}

interface DayCell {
  date: string
  day: number
  /** Monday-based weekday index, 0–6. */
  weekday: number
  holiday: string | null
  companyWfh: string | null
  workingSaturday: boolean
  nonWorking: boolean
  entries: Entry[]
}

/** Leave first, then WFH, then exceptions — most-absent to least. */
const KIND_RANK: Record<Entry['kind'], number> = { leave: 0, wfh: 1, exception: 2 }

/**
 * One summary of a cell — the same fact drawn two ways.
 *
 * A phone gives each cell about 50px. "1 half" breaks across two lines in that
 * space and stretches the entire week row, so below `sm` a cell shows coloured
 * dots and the count is read by pressing the day. From `sm` up there is room
 * for the counted chip, which is the more useful thing when it fits.
 */
interface Mark {
  key: string
  count: number
  text: string
  dot: string
  chip: string
  icon?: LucideIcon
}

function marksFor(entries: Entry[]): Mark[] {
  const of = (kind: Entry['kind'], partial: boolean) =>
    entries.filter((e) => e.kind === kind && (e.dayPart !== 'full') === partial).length

  const out: Mark[] = [
    {
      key: 'leave',
      count: of('leave', false),
      text: 'off',
      dot: 'bg-service-design',
      chip: 'border-service-design/30 bg-service-design/12 text-service-design',
    },
    {
      key: 'leave-half',
      count: of('leave', true),
      text: '\u00bd off',
      // Outline only, no fill: half the ink for half the day.
      dot: 'border border-service-design',
      chip: 'border-service-design/30 text-service-design',
    },
    {
      key: 'wfh',
      count: of('wfh', false),
      text: 'home',
      dot: 'bg-service-dev',
      chip: 'border-service-dev/30 bg-service-dev/12 text-service-dev',
    },
    {
      key: 'wfh-half',
      count: of('wfh', true),
      text: '\u00bd home',
      dot: 'border border-service-dev',
      chip: 'border-service-dev/30 text-service-dev',
    },
    {
      key: 'exception',
      count: entries.filter((e) => e.kind === 'exception').length,
      text: '',
      dot: 'bg-warning',
      chip: 'border-warning/30 bg-warning/12 text-warning',
      icon: Clock,
    },
  ]
  return out.filter((m) => m.count > 0)
}

export function AttendanceCalendar() {
  const now = new Date()
  const [ym, setYm] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 })
  const [selected, setSelected] = useState<string | null>(null)

  const holidaysQ = useHolidays(ym.year)
  const saturdaysQ = useWorkingSaturdays(ym.year)
  const companyWfhQ = useCompanyWfhDays(ym.year)
  const leaveQ = useAllLeaveRequests('approved')
  const wfhQ = useAllWfhRequests('approved')
  const exceptionsQ = useAllAttendanceExceptions({ status: 'approved' })
  const settingsQ = useAttendanceSettings()

  const isLoading =
    holidaysQ.isLoading || saturdaysQ.isLoading || companyWfhQ.isLoading ||
    leaveQ.isLoading || wfhQ.isLoading || exceptionsQ.isLoading

  const saturdayWorking = settingsQ.data?.saturday_working ?? false

  const stepMonth = (delta: number) =>
    setYm(({ year, month }) => {
      const d = new Date(year, month - 1 + delta, 1)
      setSelected(null)
      return { year: d.getFullYear(), month: d.getMonth() + 1 }
    })

  const cells = useMemo<DayCell[]>(() => {
    const daysInMonth = new Date(ym.year, ym.month, 0).getDate()

    const holidayByDate = new Map((holidaysQ.data ?? []).map((h) => [h.date, h]))
    const companyWfhByDate = new Map((companyWfhQ.data ?? []).map((c) => [c.date, c.reason]))
    const workingSaturdays = new Set((saturdaysQ.data ?? []).map((w) => w.date))

    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1
      const date = iso(ym.year, ym.month, day)
      // getDay() is Sunday-based; the grid runs Monday-first.
      const weekday = (new Date(ym.year, ym.month - 1, day).getDay() + 6) % 7

      const holiday = holidayByDate.get(date)
      const isSaturday = weekday === 5
      const isSunday = weekday === 6
      const workingSaturday = isSaturday && workingSaturdays.has(date)

      const entries: Entry[] = []
      for (const r of leaveQ.data ?? []) {
        if (date >= r.start_date && date <= r.end_date) {
          // A partial day is always a single day; a range is full days throughout.
          const dayPart = r.start_date === r.end_date ? toDayPart(r.day_part) : 'full'
          entries.push({
            id: r.id,
            profileId: r.profile_id,
            name: r.profiles?.name ?? '-',
            avatarUrl: r.profiles?.avatar_url ?? null,
            kind: 'leave',
            dayPart,
            label: r.leave_types?.name ?? 'Leave',
            time: null,
            icon: dayPart === 'full' ? Plane : HALF_ICON[dayPart],
          })
        }
      }
      for (const r of wfhQ.data ?? []) {
        if (date >= r.start_date && date <= r.end_date) {
          const dayPart = r.start_date === r.end_date ? toDayPart(r.day_part) : 'full'
          entries.push({
            id: r.id,
            profileId: r.profile_id,
            name: r.profiles?.name ?? '-',
            avatarUrl: r.profiles?.avatar_url ?? null,
            kind: 'wfh',
            dayPart,
            label: 'Working from home',
            time: null,
            icon: Home,
          })
        }
      }
      for (const e of exceptionsQ.data ?? []) {
        if (e.date !== date) continue
        const from = formatTimeOfDay(e.requested_time)
        const to = formatTimeOfDay(e.return_time)
        entries.push({
          id: e.id,
          profileId: e.profile_id,
          name: e.profiles?.name ?? '-',
          avatarUrl: e.profiles?.avatar_url ?? null,
          kind: 'exception',
          dayPart: 'full',
          label: exceptionTypeLabel(e.exception_type),
          time: from && to ? `${from} → ${to}` : from,
          icon: EXCEPTION_ICON[e.exception_type] ?? Clock,
        })
      }
      entries.sort(
        (a, b) => KIND_RANK[a.kind] - KIND_RANK[b.kind] || a.name.localeCompare(b.name),
      )

      return {
        date,
        day,
        weekday,
        holiday: holiday?.name ?? null,
        companyWfh: companyWfhByDate.get(date) ?? null,
        workingSaturday,
        nonWorking: isSunday || (isSaturday && !saturdayWorking && !workingSaturday),
        entries,
      }
    })
  }, [ym, holidaysQ.data, companyWfhQ.data, saturdaysQ.data, leaveQ.data, wfhQ.data, exceptionsQ.data, saturdayWorking])

  const monthLabel = new Date(ym.year, ym.month - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const today = localToday()
  const selectedCell = selected ? cells.find((c) => c.date === selected) ?? null : null
  const leadingBlanks = cells.length > 0 ? cells[0].weekday : 0

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <PeriodStepper
          icon={CalendarDays}
          label={monthLabel}
          onPrev={() => stepMonth(-1)}
          onNext={() => stepMonth(1)}
        />
        <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 font-ui text-[11.5px] text-text-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 bg-service-mkt/50 border border-service-mkt" />
            Holiday
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 bg-service-dev/50 border border-service-dev" />
            Company WFH
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 bg-service-design/50 border border-service-design" />
            Full-day leave
          </span>
          {/* Half-filled swatch: the same colour as leave, visibly half of it. */}
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 border border-service-design bg-linear-to-r from-service-design/50 to-transparent" />
            Half day
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 bg-warning/50 border border-warning" />
            Exception
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16 text-text-4 border border-border-default bg-surface-1">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : (
        <div className="border border-border-default bg-surface-1">
          <div className="grid grid-cols-7 gap-px bg-border-default border-b border-border-default">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="bg-surface-2 px-2 py-1.5 text-center font-mono text-[10.5px] uppercase tracking-wider text-text-4"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px bg-border-subtle">
            {Array.from({ length: leadingBlanks }, (_, i) => (
              <div key={`blank-${i}`} className="bg-surface-1 min-h-14 sm:min-h-20" />
            ))}

            {cells.map((cell) => {
              // Full and half days are counted apart: "3 off" that silently
              // includes two half days overstates who is actually missing.
              const marks = marksFor(cell.entries)
              return (
                <button
                  key={cell.date}
                  type="button"
                  onClick={() => setSelected(cell.date === selected ? null : cell.date)}
                  aria-pressed={cell.date === selected}
                  className={cn(
                    'min-h-14 sm:min-h-20 p-1 sm:p-1.5 flex flex-col gap-1 text-left transition-colors',
                    cell.nonWorking ? 'bg-surface-inset' : 'bg-surface-1',
                    cell.holiday && 'bg-service-mkt/10',
                    cell.companyWfh && !cell.holiday && 'bg-service-dev/10',
                    cell.date === selected && 'ring-1 ring-inset ring-brand-red',
                    'hover:bg-surface-2',
                  )}
                >
                  <span
                    className={cn(
                      'font-mono text-[11.5px] tabular-nums',
                      cell.date === today
                        ? 'inline-flex items-center justify-center size-5 rounded-full bg-brand-red text-white font-semibold'
                        : cell.nonWorking
                          ? 'text-text-4'
                          : 'text-text-2',
                    )}
                  >
                    {cell.day}
                  </span>

                  {/* Captions need a line of text to be worth anything, and a
                      phone cell is about 50px wide. Below `sm` the cell's tint
                      carries the fact and pressing the day names it. */}
                  {cell.holiday && (
                    <span className="hidden sm:line-clamp-2 font-ui text-[10.5px] leading-tight text-service-mkt">
                      {cell.holiday}
                    </span>
                  )}
                  {cell.workingSaturday && !cell.holiday && (
                    <span className="hidden sm:block font-ui text-[10.5px] leading-tight text-text-3">
                      Working Saturday
                    </span>
                  )}
                  {cell.companyWfh && !cell.holiday && (
                    <span className="hidden sm:line-clamp-2 font-ui text-[10.5px] leading-tight text-service-dev">
                      Company WFH
                    </span>
                  )}

                  {/* Counts, not avatars: a busy day would otherwise overflow the
                      cell, and the number is the thing being scanned for. */}
                  {marks.length > 0 && (
                    <div className="mt-auto flex flex-wrap items-center gap-1">
                      {marks.map((m) => (
                        <span
                          key={`dot-${m.key}`}
                          aria-hidden
                          className={cn('size-1.5 shrink-0 rounded-full sm:hidden', m.dot)}
                        />
                      ))}
                      {marks.map((m) => {
                        const Icon = m.icon
                        return (
                          <span
                            key={`chip-${m.key}`}
                            className={cn(
                              'hidden sm:inline-flex items-center gap-0.5 whitespace-nowrap',
                              'px-1 py-px rounded-sm border font-mono text-[10px] tabular-nums',
                              m.chip,
                            )}
                          >
                            {Icon && <Icon size={9} />}
                            {m.count}
                            {m.text && ` ${m.text}`}
                          </span>
                        )
                      })}
                      {/* The dots carry no number, so the count still has to be
                          announced for anyone not reading the grid visually. */}
                      <span className="sr-only sm:hidden">
                        {marks.map((m) => `${m.count} ${m.text || 'exception'}`).join(', ')}
                      </span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {selectedCell && (
        <div className="border border-border-default bg-surface-1">
          <h3 className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-surface-2 border-b border-border-subtle">
            <span className="font-ui font-semibold text-[13px] text-text-1">
              {formatDate(selectedCell.date)}
            </span>
            {selectedCell.holiday && (
              <span className="inline-flex items-center gap-1.5 text-service-mkt font-ui text-[12px]">
                <Palmtree size={12} />
                {selectedCell.holiday}
              </span>
            )}
            {selectedCell.companyWfh && !selectedCell.holiday && (
              <span className="inline-flex items-center gap-1.5 text-service-dev font-ui text-[12px]">
                <Home size={12} />
                {selectedCell.companyWfh}
              </span>
            )}
            {selectedCell.nonWorking && !selectedCell.holiday && (
              <span className="font-ui text-[12px] text-text-4">Non-working day</span>
            )}
          </h3>

          {selectedCell.entries.length === 0 ? (
            <p className="px-4 py-8 text-center font-ui text-[13px] text-text-4">
              Everybody is in on this day.
            </p>
          ) : (
            selectedCell.entries.map((person) => {
              const Icon = person.icon
              const half = person.dayPart !== 'full' ? DAY_PART_LABEL[person.dayPart] : null
              return (
                <div
                  key={`${person.kind}:${person.id}`}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5 border-b border-border-subtle last:border-0"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <Avatar
                      name={person.name}
                      src={person.avatarUrl ?? undefined}
                      size="sm"
                      personId={person.profileId}
                    />
                    <div className="min-w-0">
                      <PersonLink
                        personId={person.profileId}
                        className="block font-ui font-medium text-[13px] text-text-1 truncate"
                      >
                        {person.name}
                      </PersonLink>
                      {person.time && (
                        <span className="font-mono text-[11px] text-text-4">{person.time}</span>
                      )}
                    </div>
                  </div>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border',
                      'text-[10.5px] font-ui font-semibold uppercase tracking-wider whitespace-nowrap',
                      person.kind === 'leave'
                        ? 'bg-service-design/12 text-service-design border-service-design/30'
                        : person.kind === 'wfh'
                          ? 'bg-service-dev/12 text-service-dev border-service-dev/30'
                          : 'bg-warning/12 text-warning border-warning/30',
                    )}
                  >
                    <Icon size={11} />
                    {person.label}
                    {/* The half is the whole point of a half day — never let the
                        type label stand on its own and read as a full one. */}
                    {half && <span className="opacity-75">· {half}</span>}
                    {person.kind === 'leave' && !half && <span className="opacity-75">· Full day</span>}
                  </span>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
