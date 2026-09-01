import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Radio, ChevronLeft, ChevronRight, Download, Search, Users } from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Skeleton } from '../../components/ui/Skeleton'
import { QueryError } from '../../components/ui/QueryError'
import { DatePicker } from '../../components/ui/DatePicker'
import { HoverCard } from '../../components/ui/HoverCard'
import { PersonLink } from '../../components/shared/PersonLink'
import { AttendanceChips } from '../../components/shared/AttendanceChips'
import { useCanAccess } from '../../hooks/useRoleFlags'
import { useToast } from '../../components/ui/toast-context'
import { useActiveTimers, useTimesheetRoster, useTimesheetSegments } from '../../hooks/useReports'
import { useAttendanceSettings } from '../../hooks/useAttendance'
import type { TimesheetPerson, TimesheetSegment } from '../../api/reports'
import { downloadCsv } from '../../lib/csv'
import { formatMinutes } from '../../lib/duration'
import {
  clockAt, dayState, exceptionSpan, formatClock12, hourTick, isDayOff,
  minutesInto, parseClock, spanOn, EXCEPTION_LABELS,
  type DayState,
} from '../../lib/timesheet'
import { cn } from '../../lib/cn'

/** Colour a project consistently wherever it appears on the bar. */
const TRACK_COLOURS = [
  '#22D3EE', '#A78BFA', '#FBBF24', '#34D399', '#F472B6',
  '#60A5FA', '#FB923C', '#4ADE80', '#C084FC', '#38BDF8',
]

function colourFor(key: string): string {
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0
  return TRACK_COLOURS[Math.abs(hash) % TRACK_COLOURS.length]
}

/** Midnight to midnight, in minutes — the chart's fixed extent. */
const DAY_START = 0
const DAY_END = 24 * 60

const iso = (d: Date) => d.toISOString().slice(0, 10)
const shiftDay = (date: string, days: number) => {
  const d = new Date(`${date}T12:00:00`)
  d.setDate(d.getDate() + days)
  return iso(d)
}

/**
 * The three columns every row, the ruler and the guide overlay share.
 *
 * They are one string rather than three because the vertical guides are drawn
 * in an absolutely positioned grid laid over the rows: the instant the name
 * column here and the name column there disagree, every marker on the chart
 * points at the wrong minute.
 */
const CHART_GRID = 'grid grid-cols-[210px_1fr_92px] gap-3'

const STATE_META: Record<DayState, { label: string; dot: string; wash: string | null }> = {
  present: { label: 'In',        dot: 'bg-success',            wash: null },
  late:    { label: 'Late',      dot: 'bg-warning',            wash: null },
  wfh:     { label: 'WFH',       dot: 'bg-service-dev',        wash: null },
  absent:  { label: 'Absent',    dot: 'bg-error',              wash: 'bg-error/[0.07]' },
  no_show: { label: 'No show',   dot: 'bg-error',              wash: null },
  leave:   { label: 'Leave',     dot: 'bg-service-design',     wash: 'bg-service-design/[0.09]' },
  holiday: { label: 'Holiday',   dot: 'bg-text-4',             wash: 'bg-surface-3/40' },
  off:     { label: 'Weekly off', dot: 'bg-text-4',            wash: 'bg-surface-3/40' },
}

interface Row {
  person: TimesheetPerson
  segs: TimesheetSegment[]
  state: DayState
  running: boolean
}

/**
 * Who is working on what, and what each person's day looked like.
 *
 * Every person the viewer may report on gets a row, timer or no timer — a blank
 * bar next to "Checked in 9:04 AM" is the whole point of the screen, and a
 * roster built from timer entries alone could never draw it. What the bar does
 * NOT do is fill the gaps in: the timer covers well under a full day for most
 * people, and inventing the missing hours would turn a record into a guess.
 */
/**
 * The timesheet itself, without page chrome, so Reports can show it as a tab
 * beside the other "where did the hours go" views. The route at /timesheet
 * still works and renders the same thing under its own Topbar.
 */
export function TimesheetContent() {
  const toast = useToast()
  const [date, setDate] = useState(() => iso(new Date()))
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')

  const { data: settings } = useAttendanceSettings()
  const tz = settings?.timezone ?? 'Asia/Karachi'

  const { data: active = [], isLoading: activeLoading } = useActiveTimers()
  const { data: roster = [], isLoading: rosterLoading, error: rosterError } = useTimesheetRoster(date)
  const { data: segments = [], isLoading: segLoading, error: segError } = useTimesheetSegments(date)

  const isToday = date === iso(new Date())
  const loading = rosterLoading || segLoading
  const loadError = rosterError ?? segError

  /** The office schedule, as minutes past midnight. */
  const schedule = useMemo(() => ({
    workStart: parseClock(settings?.work_start_time) ?? 9 * 60,
    workEnd: parseClock(settings?.work_end_time) ?? 18 * 60,
    breakStart: parseClock(settings?.break_start_time),
    breakEnd: parseClock(settings?.break_end_time),
  }), [settings])

  /** One row per person, with whatever segments they tracked hung off it. */
  const rows = useMemo<Row[]>(() => {
    const byPerson = new Map<string, TimesheetSegment[]>()
    for (const s of segments) {
      const list = byPerson.get(s.profile_id)
      if (list) list.push(s)
      else byPerson.set(s.profile_id, [s])
    }
    return roster.map((person) => {
      const segs = byPerson.get(person.profile_id) ?? []
      return {
        person,
        segs,
        state: dayState(person),
        running: segs.some((s) => s.is_running),
      }
    })
  }, [roster, segments])

  // The bar is always the whole day, midnight to midnight.
  //
  // It used to zoom to the working hours plus whatever happened to fall outside
  // them, which meant the scale moved between days: the same block sat in a
  // different place on Monday than on Tuesday, and two days could not be read
  // against each other. A fixed ruler costs some width — the working day is
  // about a third of it — and buys a chart where a position means one time.

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return rows.filter(({ person, state, running }) => {
      if (needle && !person.profile_name.toLowerCase().includes(needle)) return false
      if (filter === 'tracking') return running
      if (filter === 'untracked') return person.tracked_minutes === 0 && !isDayOff(state)
      if (filter === 'away') return isDayOff(state) || state === 'absent'
      return true
    })
  }, [rows, query, filter])

  const summary = useMemo(() => ({
    tracked: rows.reduce((sum, r) => sum + r.person.tracked_minutes, 0),
    running: rows.filter((r) => r.running).length,
    untracked: rows.filter((r) => r.person.tracked_minutes === 0 && !isDayOff(r.state)).length,
    away: rows.filter((r) => isDayOff(r.state)).length,
  }), [rows])

  const exportCsv = () => {
    if (rows.length === 0) { toast('Nothing to export', 'error'); return }
    // A person with no segments still contributes one row: on this screen "no
    // time against a full day in the office" is the finding, not a blank.
    const lines = rows.flatMap(({ person, segs, state }) => {
      const base = [
        person.profile_name, person.role, STATE_META[state].label,
        person.leave_type ?? person.holiday_name ?? '',
        person.check_in ? clockAt(person.check_in, tz) : '',
        person.check_out ? clockAt(person.check_out, tz) : '',
        person.expected_start && person.expected_end
          ? `${formatClock12(parseClock(person.expected_start) ?? 0)}–${formatClock12(parseClock(person.expected_end) ?? 0)}`
          : '',
        person.required_minutes || '',
        person.tracked_minutes,
      ]
      if (segs.length === 0) return [[...base, '', '', '', '', '', '']]
      return segs.map((s) => [
        ...base, s.project_name ?? '', s.task_title ?? '',
        clockAt(s.started_at, tz), clockAt(s.ended_at, tz),
        s.minutes, s.is_running ? 'yes' : '',
      ])
    })
    downloadCsv(
      `timesheet_${date}.csv`,
      [
        'Person', 'Role', 'Day', 'Leave / holiday', 'Checked in', 'Checked out',
        'Expected', 'Required minutes', 'Tracked minutes',
        'Project', 'Task', 'From', 'To', 'Minutes', 'Still running',
      ],
      lines,
    )
    toast(`Exported ${rows.length} people`, 'success')
  }

  // Exactly what p_tte_select allows: your own, your teammates', or everyone's.
  const canViewAllTime = useCanAccess('can_view_all_timesheets')
  const scopeNote = canViewAllTime
    ? 'Everyone in the company.'
    : 'You, and anyone who shares a team with you.'

  return (
    <div className="flex flex-col gap-5">
        <p className="inline-flex items-center gap-1 font-ui text-[12.5px] text-text-4">
          <Users size={11} /> {scopeNote}
        </p>

        <LiveTimers active={active} loading={activeLoading} tz={tz} />

        {/* ── The day ── */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => setDate((d) => shiftDay(d, -1))} aria-label="Previous day">
              <ChevronLeft size={14} />
            </Button>
            <DatePicker value={date} onChange={setDate} />
            <Button
              variant="ghost" size="sm"
              onClick={() => setDate((d) => shiftDay(d, 1))}
              disabled={isToday}
              aria-label="Next day"
            >
              <ChevronRight size={14} />
            </Button>
          </div>
          {!isToday && (
            <Button variant="ghost" size="sm" onClick={() => setDate(iso(new Date()))}>Today</Button>
          )}
          <Button
            variant="secondary" size="sm" className="ml-auto"
            onClick={exportCsv} disabled={rows.length === 0}
          >
            <Download size={13} /> Export CSV
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {loading ? (
            // Placeholders rather than zeros: "0 timers running" is a claim, and
            // for the second it takes the roster to land it is the wrong one.
            [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[78px] rounded-lg" />)
          ) : (
            <>
              <Stat label="Tracked" value={formatMinutes(summary.tracked)} hint="across everyone shown" />
              <Stat label="Timers running" value={String(summary.running)} hint={`of ${rows.length} people`} tone={summary.running > 0 ? 'good' : undefined} />
              <Stat label="No time logged" value={String(summary.untracked)} hint="were due in today" tone={summary.untracked > 0 ? 'warn' : undefined} />
              <Stat label="Away" value={String(summary.away)} hint="leave, holiday or off" />
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a person…"
            iconLeft={<Search size={13} />}
            className="w-full sm:w-56"
            aria-label="Filter people by name"
          />
          <Select
            value={filter}
            onChange={setFilter}
            size="sm"
            searchable={false}
            className="w-44"
            options={[
              { value: 'all', label: `Everyone (${rows.length})` },
              { value: 'tracking', label: `Tracking now (${summary.running})` },
              { value: 'untracked', label: `No time logged (${summary.untracked})` },
              { value: 'away', label: 'Away or absent' },
            ]}
          />
          <Legend />
        </div>

        {loading ? (
          <Skeleton className="h-64" />
        ) : loadError ? (
          <QueryError error={loadError} label="The timesheet" />
        ) : visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border-default py-14 text-center font-ui text-[13px] text-text-4">
            {rows.length === 0
              ? 'Nobody to show for this day.'
              : 'No one matches that filter.'}
          </div>
        ) : (
          <section className="overflow-hidden rounded-xl border border-border-default bg-surface-1">
            {/* A whole day across a phone's width leaves the working hours about
                fifty pixels wide, which is not a chart. Below the floor it
                scrolls sideways instead of compressing to nothing. */}
            <div className="overflow-x-auto">
              <div className="min-w-[920px]">
                <HourScale from={DAY_START} to={DAY_END} schedule={schedule} />
                <div className="relative">
                  <Guides from={DAY_START} to={DAY_END} schedule={schedule} showNow={isToday} tz={tz} />
                  <div className="divide-y divide-border-subtle">
                    {visible.map((row) => (
                      <PersonRow
                        key={row.person.profile_id}
                        row={row}
                        from={DAY_START}
                        to={DAY_END}
                        schedule={schedule}
                        tz={tz}
                        isToday={isToday}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <p className="border-t border-border-subtle px-4 py-2.5 font-ui text-[11px] text-text-4">
              Only tracked time is drawn on the upper lane. Gaps are time no timer was running -
              not necessarily time not worked. The lower lane is the attendance record: when they
              checked in and out.
            </p>
          </section>
        )}
    </div>
  )
}

/** The /timesheet route — the same content under its own page chrome. */
export default function TimesheetPage() {
  return (
    <div className="flex flex-1 flex-col">
      <Topbar title="Timesheet" />
      <div className="p-4 lg:px-8 lg:py-7">
        <TimesheetContent />
      </div>
    </div>
  )
}

/* ── Working right now ─────────────────────────────────────────────────────── */

function LiveTimers({ active, loading, tz }: {
  active: { profile_id: string; profile_name: string; avatar_url: string; task_id: string;
            task_title: string; project_name: string; started_at: string; running_minutes: number }[]
  loading: boolean
  tz: string
}) {
  return (
    <section className="rounded-xl border border-border-default bg-surface-1">
      <header className="flex items-center gap-2 border-b border-border-subtle px-4 py-3">
        <span className="relative flex size-2">
          <span className={cn(
            'absolute inline-flex size-full rounded-full opacity-75',
            active.length > 0 && 'animate-ping bg-success',
          )} />
          <span className={cn(
            'relative inline-flex size-2 rounded-full',
            active.length > 0 ? 'bg-success' : 'bg-text-4',
          )} />
        </span>
        <h3 className="font-display text-[14.5px] font-bold text-text-1">Working right now</h3>
        <span className="font-mono text-[11px] text-text-4">
          {active.length} {active.length === 1 ? 'timer' : 'timers'} running
        </span>
      </header>

      {loading ? (
        <div className="p-4"><Skeleton className="h-16" /></div>
      ) : active.length === 0 ? (
        <p className="px-4 py-8 text-center font-ui text-[12.5px] text-text-4">
          Nobody has a timer running.
        </p>
      ) : (
        <div className="divide-y divide-border-subtle">
          {active.map((a) => (
            <div key={`${a.profile_id}-${a.task_id}`} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <Avatar name={a.profile_name ?? ''} src={a.avatar_url ?? undefined} size="sm" personId={a.profile_id} />
              <div className="min-w-0 flex-1">
                <PersonLink personId={a.profile_id} className="block truncate font-ui text-[13px] font-medium text-text-1">
                  {a.profile_name}
                </PersonLink>
                <p className="truncate font-ui text-[11.5px] text-text-3">
                  <Link to={`/tasks/${a.task_id}`} className="hover:text-brand-red">
                    {a.task_title}
                  </Link>
                  {a.project_name && <span className="text-text-4"> · {a.project_name}</span>}
                </p>
              </div>
              <span className="shrink-0 font-mono text-[11.5px] text-text-4">
                since {clockAt(a.started_at, tz)}
              </span>
              <span className="flex shrink-0 items-center gap-1.5 rounded-sm border border-success/30 bg-success/10 px-2.5 py-1 font-mono text-[11.5px] font-semibold text-success">
                <Radio size={11} /> {formatMinutes(a.running_minutes)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

/* ── Chart furniture ───────────────────────────────────────────────────────── */

interface Schedule {
  workStart: number
  workEnd: number
  breakStart: number | null
  breakEnd: number | null
}

function Stat({ label, value, hint, tone }: {
  label: string; value: string; hint: string; tone?: 'good' | 'warn'
}) {
  return (
    <div className="rounded-lg border border-border-default bg-surface-1 px-3.5 py-3">
      <p className="font-ui text-[11px] uppercase tracking-wider text-text-4">{label}</p>
      <p className={cn(
        'mt-0.5 font-display text-[19px] font-bold',
        tone === 'good' ? 'text-success' : tone === 'warn' ? 'text-warning' : 'text-text-1',
      )}>
        {value}
      </p>
      <p className="font-ui text-[11px] text-text-4">{hint}</p>
    </div>
  )
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 font-ui text-[11px] text-text-3">
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-4 rounded-xs bg-service-dev" /> Tracked
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-1.5 w-4 rounded-full bg-success" /> Checked in
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-4 rounded-xs border border-border-strong bg-surface-2" /> Working hours
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-4 rounded-xs border border-dashed border-border-default bg-surface-inset" /> Break
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-4 rounded-xs bg-warning/25" /> Exception
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-4 rounded-xs bg-service-design/25" /> Leave / off
      </span>
    </div>
  )
}

/**
 * The twelve-hour ruler over a full twenty-four-hour day.
 *
 * Every hour gets a tick, but only every third hour gets a label: twenty-five
 * of them across the chart is unreadable at any width the card ever has.
 */
function HourScale({ from, to, schedule }: { from: number; to: number; schedule: Schedule }) {
  const span = Math.max(1, to - from)
  const at = (minute: number) => `${((minute - from) / span) * 100}%`

  const hours: number[] = []
  for (let h = Math.ceil(from / 60); h <= Math.floor(to / 60); h++) hours.push(h)

  // Start, break and end, captioned under the ruler. The break collapses to one
  // mark at its midpoint: across a whole day its two edges are an hour apart,
  // which is not room for two words.
  const marks: { key: string; minute: number; label: string }[] = [
    { key: 'start', minute: schedule.workStart, label: 'Start' },
    { key: 'end', minute: schedule.workEnd, label: 'End' },
  ]
  if (schedule.breakStart !== null) {
    marks.push({
      key: 'break',
      minute: schedule.breakEnd !== null
        ? (schedule.breakStart + schedule.breakEnd) / 2
        : schedule.breakStart,
      label: 'Break',
    })
  }

  return (
    <div className={cn(CHART_GRID, 'border-b border-border-subtle bg-surface-2/40 px-4 pt-2')}>
      <span className="font-ui text-[10.5px] uppercase tracking-wider text-text-4 self-end pb-2">
        Person
      </span>
      <div className="relative h-9">
        {hours.map((h) => {
          const major = h % 3 === 0
          return (
            <span key={h} className="absolute inset-y-0" style={{ left: at(h * 60) }}>
              {major && (
                <span
                  className={cn(
                    'absolute top-0 whitespace-nowrap font-mono text-[10px] text-text-3',
                    // Midnight at either end would hang half outside the card,
                    // which `overflow-hidden` would then eat.
                    h === hours[0] ? 'translate-x-0'
                      : h === hours[hours.length - 1] ? '-translate-x-full'
                        : '-translate-x-1/2',
                  )}
                >
                  {hourTick(h, h === hours[0])}
                </span>
              )}
              <span className={cn(
                'absolute bottom-0 block w-px',
                major ? 'h-2 bg-border-strong' : 'h-1 bg-border-default',
              )} />
            </span>
          )
        })}
        {marks.map((m) => (
          <span
            key={m.key}
            className="absolute bottom-1.5 -translate-x-1/2 whitespace-nowrap rounded-xs bg-surface-3 px-1 py-px font-mono text-[9px] uppercase tracking-wider text-text-3"
            style={{ left: at(m.minute) }}
          >
            {m.label}
          </span>
        ))}
      </div>
      <span aria-hidden />
    </div>
  )
}

/**
 * The vertical marks that run the height of the chart.
 *
 * Drawn once over all the rows rather than per row: forty copies of the same
 * line is forty chances for one of them to sit a pixel off, and the whole value
 * of a marker is that you can follow it straight down the column.
 */
function Guides({ from, to, schedule, showNow, tz }: {
  from: number; to: number; schedule: Schedule; showNow: boolean; tz: string
}) {
  const span = Math.max(1, to - from)
  const at = (minute: number) => `${((minute - from) / span) * 100}%`
  const nowMinute = showNow ? minutesInto(new Date().toISOString(), tz) : null

  // content-stretch is load-bearing: the overlay's single auto row has to fill
  // its height, or every line below is drawn zero pixels tall.
  return (
    <div className={cn(CHART_GRID, 'pointer-events-none absolute inset-0 z-10 content-stretch px-4')} aria-hidden>
      <span />
      <div className="relative">
        {[schedule.workStart, schedule.workEnd].map((minute) => (
          <span
            key={minute}
            className="absolute inset-y-0 w-px bg-border-strong/70"
            style={{ left: at(minute) }}
          />
        ))}
        {nowMinute !== null && nowMinute >= from && nowMinute <= to && (
          <span className="absolute inset-y-0 w-px bg-brand-red/70" style={{ left: at(nowMinute) }} />
        )}
      </div>
      <span />
    </div>
  )
}

/* ── One person's day ──────────────────────────────────────────────────────── */

function PersonRow({ row, from, to, schedule, tz, isToday }: {
  row: Row; from: number; to: number; schedule: Schedule; tz: string; isToday: boolean
}) {
  const { person, segs, state } = row
  const meta = STATE_META[state]
  const off = isDayOff(state)

  const expectedStart = parseClock(person.expected_start) ?? schedule.workStart
  const expectedEnd = parseClock(person.expected_end) ?? schedule.workEnd
  const dueIn = person.expected_start && person.expected_end
  const expected = dueIn ? spanOn(expectedStart, expectedEnd, from, to) : null
  // Cut out of their own window rather than drawn across the whole chart: on a
  // half day the break only exists inside the half they were due in for.
  const lunch = dueIn && schedule.breakStart !== null && schedule.breakEnd !== null
    ? spanOn(
        Math.max(schedule.breakStart, expectedStart),
        Math.min(schedule.breakEnd, expectedEnd),
        from, to,
      )
    : null

  // Still checked in: today the line stops at the current time, on a past day it
  // runs to the end — the clock has long since moved on, and stopping the line
  // at this afternoon's hour would date the bar rather than the day.
  const stillIn = isToday ? Math.min(to, minutesInto(new Date().toISOString(), tz)) : to
  const presence = person.check_in
    ? spanOn(
        minutesInto(person.check_in, tz),
        person.check_out ? minutesInto(person.check_out, tz) : stillIn,
        from, to,
      )
    : null

  return (
    <div className={cn(CHART_GRID, 'items-center px-4 py-2.5', meta.wash)}>
      {/* Who */}
      <div className="flex min-w-0 items-center gap-2">
        <Avatar name={person.profile_name} src={person.avatar_url ?? undefined} size="xs" personId={person.profile_id} />
        <div className="min-w-0">
          <PersonLink personId={person.profile_id} className="block truncate font-ui text-[12.5px] font-medium text-text-1">
            {person.profile_name}
          </PersonLink>
          <span className="flex items-center gap-1.5">
            <span className={cn('size-1.5 shrink-0 rounded-full', meta.dot)} />
            <span className="truncate font-mono text-[10px] uppercase tracking-wider text-text-4">
              {meta.label}
              {person.check_in && ` · ${clockAt(person.check_in, tz)}`}
            </span>
          </span>
        </div>
      </div>

      {/* The day */}
      <div className="relative h-11 overflow-hidden rounded-md bg-surface-inset">
        {/* The window they were due in for. */}
        {expected && (
          <div
            className="absolute inset-y-0 border-x border-border-strong/60 bg-surface-2"
            style={{ left: `${expected.left}%`, width: `${expected.width}%` }}
          />
        )}

        {lunch && (
          <div
            className="absolute inset-y-0 border-x border-dashed border-border-default bg-surface-inset"
            style={{ left: `${lunch.left}%`, width: `${lunch.width}%` }}
          />
        )}

        {/* Approved and pending exceptions — time the day lost. */}
        {person.exceptions.map((exception, i) => {
          const gap = exceptionSpan(exception, expectedStart, expectedEnd)
          const band = gap ? spanOn(gap.from, gap.to, from, to) : null
          if (!gap || !band) return null
          return (
            <HoverCard
              key={`${exception.type}-${i}`}
              content={
                <span className="block w-max max-w-xs">
                  <span className="block font-ui text-[12px] font-semibold text-text-1">
                    {EXCEPTION_LABELS[exception.type] ?? exception.type}
                    {exception.status === 'pending' && (
                      <span className="ml-1 font-mono text-[10px] uppercase text-warning">pending</span>
                    )}
                  </span>
                  <span className="mt-1 block font-mono text-[11px] text-text-2">
                    {formatClock12(gap.from)}–{formatClock12(gap.to)}
                  </span>
                  {exception.reason && (
                    <span className="mt-1 block font-ui text-[11px] text-text-3">{exception.reason}</span>
                  )}
                </span>
              }
              style={{ left: `${band.left}%`, width: `${band.width}%` }}
              className={cn(
                'absolute inset-y-0 block border-x',
                exception.status === 'approved'
                  ? 'border-warning/40 bg-warning/20'
                  : 'border-warning/25 bg-warning/10',
              )}
            >
              <span className="block size-full" />
            </HoverCard>
          )
        })}

        {/* A day nobody was expected in for says so, rather than reading as a
            person who tracked nothing. */}
        {off && (
          <span className="absolute inset-0 flex items-center justify-center font-ui text-[11px] font-medium text-text-3">
            {person.leave_type ?? person.holiday_name ?? meta.label}
            {person.day_part !== 'full' && ' · half day'}
          </span>
        )}

        {/* Tracked segments — the upper lane. */}
        {segs.map((s, i) => {
          const startMin = minutesInto(s.started_at, tz)
          const endMin = minutesInto(s.ended_at, tz)
          // A segment ending exactly at midnight reads as 0; treat it as the end.
          const band = spanOn(startMin, endMin <= startMin ? to : endMin, from, to)
          if (!band) return null
          const colour = colourFor(s.project_id ?? s.task_id ?? 'x')
          return (
            <HoverCard
              key={`${s.task_id}-${s.started_at}-${i}`}
              content={
                <span className="block w-max max-w-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 shrink-0 rounded-xs" style={{ background: colour }} />
                    <span className="truncate font-ui text-[12px] font-semibold text-text-1">
                      {s.task_title}
                    </span>
                  </span>
                  {s.project_name && (
                    <span className="mt-0.5 block font-ui text-[11px] text-text-3">{s.project_name}</span>
                  )}
                  <span className="mt-1.5 block font-mono text-[11px] text-text-2">
                    {clockAt(s.started_at, tz)}–{clockAt(s.ended_at, tz)}
                    <span className="text-text-4"> · </span>
                    {formatMinutes(s.minutes)}
                  </span>
                  {s.is_running && (
                    <span className="mt-1 block font-mono text-[10.5px] text-success">Still running</span>
                  )}
                </span>
              }
              style={{ left: `${band.left}%`, width: `${band.width}%`, minWidth: 3 }}
              className={cn(
                'absolute top-1.5 block h-[19px] rounded-sm transition-opacity hover:opacity-80',
                s.is_running && 'animate-pulse',
              )}
            >
              <span className="block size-full rounded-sm" style={{ background: colour }} />
            </HoverCard>
          )
        })}

        {/* Attendance — the lower lane. */}
        {presence && (
          <HoverCard
            content={
              <span className="block w-max font-mono text-[11px] text-text-2">
                In {clockAt(person.check_in, tz)}
                {person.check_out
                  ? ` · Out ${clockAt(person.check_out, tz)}`
                  : ' · still checked in'}
              </span>
            }
            style={{ left: `${presence.left}%`, width: `${presence.width}%`, minWidth: 3 }}
            className={cn(
              'absolute bottom-1.5 block h-[5px] rounded-full',
              state === 'late' ? 'bg-warning' : 'bg-success',
            )}
          >
            <span className="block size-full rounded-full" />
          </HoverCard>
        )}
      </div>

      {/* The totals */}
      <div className="text-right">
        <p className={cn(
          'font-mono text-[12px] font-semibold',
          person.tracked_minutes > 0 ? 'text-text-1' : off ? 'text-text-4' : 'text-warning',
        )}>
          {person.tracked_minutes > 0 ? formatMinutes(person.tracked_minutes) : off ? '-' : '0m'}
        </p>
        {person.required_minutes > 0 && (
          <p className="font-mono text-[10px] text-text-4">
            of {formatMinutes(person.required_minutes)}
          </p>
        )}
        <span className="mt-0.5 flex justify-end">
          <AttendanceChips facts={{ status: person.att_status, day_type: person.day_type, day_part: person.day_part }} />
        </span>
      </div>
    </div>
  )
}
