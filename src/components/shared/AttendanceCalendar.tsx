import { useMemo, useState } from 'react'
import { Loader2, Palmtree, Home, Plane, CalendarDays } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Avatar } from '../ui/Avatar'
import { PersonLink } from './PersonLink'
import { PeriodStepper } from '../ui/PeriodStepper'
import { formatDate } from '../../lib/utils'
import {
  useHolidays,
  useWorkingSaturdays,
  useCompanyWfhDays,
  useAllLeaveRequests,
  useAllWfhRequests,
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

/** Someone away on a given day, and how. */
interface Away {
  profileId: string
  name: string
  avatarUrl: string | null
  kind: 'leave' | 'wfh'
  label: string
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
  away: Away[]
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
  const settingsQ = useAttendanceSettings()

  const isLoading =
    holidaysQ.isLoading || saturdaysQ.isLoading || companyWfhQ.isLoading ||
    leaveQ.isLoading || wfhQ.isLoading

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

      const away: Away[] = []
      for (const r of leaveQ.data ?? []) {
        if (date >= r.start_date && date <= r.end_date) {
          away.push({
            profileId: r.profile_id,
            name: r.profiles?.name ?? '-',
            avatarUrl: r.profiles?.avatar_url ?? null,
            kind: 'leave',
            label: r.leave_types?.name ?? 'Leave',
          })
        }
      }
      for (const r of wfhQ.data ?? []) {
        if (date >= r.start_date && date <= r.end_date) {
          away.push({
            profileId: r.profile_id,
            name: r.profiles?.name ?? '-',
            avatarUrl: r.profiles?.avatar_url ?? null,
            kind: 'wfh',
            label: 'Working from home',
          })
        }
      }
      away.sort((a, b) => a.name.localeCompare(b.name))

      return {
        date,
        day,
        weekday,
        holiday: holiday?.name ?? null,
        companyWfh: companyWfhByDate.get(date) ?? null,
        workingSaturday,
        nonWorking: isSunday || (isSaturday && !saturdayWorking && !workingSaturday),
        away,
      }
    })
  }, [ym, holidaysQ.data, companyWfhQ.data, saturdaysQ.data, leaveQ.data, wfhQ.data, saturdayWorking])

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
            On leave
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
              <div key={`blank-${i}`} className="bg-surface-1 min-h-20" />
            ))}

            {cells.map((cell) => {
              const onLeave = cell.away.filter((a) => a.kind === 'leave')
              const onWfh = cell.away.filter((a) => a.kind === 'wfh')
              return (
                <button
                  key={cell.date}
                  type="button"
                  onClick={() => setSelected(cell.date === selected ? null : cell.date)}
                  aria-pressed={cell.date === selected}
                  className={cn(
                    'min-h-20 p-1.5 flex flex-col gap-1 text-left transition-colors',
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

                  {cell.holiday && (
                    <span className="font-ui text-[10.5px] leading-tight text-service-mkt line-clamp-2">
                      {cell.holiday}
                    </span>
                  )}
                  {cell.workingSaturday && !cell.holiday && (
                    <span className="font-ui text-[10.5px] leading-tight text-text-3">
                      Working Saturday
                    </span>
                  )}
                  {cell.companyWfh && !cell.holiday && (
                    <span className="font-ui text-[10.5px] leading-tight text-service-dev line-clamp-2">
                      Company WFH
                    </span>
                  )}

                  {/* Counts, not avatars: a busy day would otherwise overflow the
                      cell, and the number is the thing being scanned for. */}
                  <div className="mt-auto flex flex-wrap items-center gap-1">
                    {onLeave.length > 0 && (
                      <span className="px-1 py-px rounded-sm border border-service-design/30 bg-service-design/12 text-service-design font-mono text-[10px] tabular-nums">
                        {onLeave.length} off
                      </span>
                    )}
                    {onWfh.length > 0 && (
                      <span className="px-1 py-px rounded-sm border border-service-dev/30 bg-service-dev/12 text-service-dev font-mono text-[10px] tabular-nums">
                        {onWfh.length} home
                      </span>
                    )}
                  </div>
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

          {selectedCell.away.length === 0 ? (
            <p className="px-4 py-8 text-center font-ui text-[13px] text-text-4">
              Everybody is in on this day.
            </p>
          ) : (
            selectedCell.away.map((person) => (
              <div
                key={`${person.kind}:${person.profileId}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5 border-b border-border-subtle last:border-0"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <Avatar
                    name={person.name}
                    src={person.avatarUrl ?? undefined}
                    size="sm"
                    personId={person.profileId}
                  />
                  <PersonLink
                    personId={person.profileId}
                    className="font-ui font-medium text-[13px] text-text-1 truncate"
                  >
                    {person.name}
                  </PersonLink>
                </div>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border',
                    'text-[10.5px] font-ui font-semibold uppercase tracking-wider whitespace-nowrap',
                    person.kind === 'leave'
                      ? 'bg-service-design/12 text-service-design border-service-design/30'
                      : 'bg-service-dev/12 text-service-dev border-service-dev/30',
                  )}
                >
                  {person.kind === 'leave' ? <Plane size={11} /> : <Home size={11} />}
                  {person.label}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
