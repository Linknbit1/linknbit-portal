import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Radio, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Skeleton } from '../../components/ui/Skeleton'
import { DatePicker } from '../../components/ui/DatePicker'
import { PersonLink } from '../../components/shared/PersonLink'
import { useToast } from '../../components/ui/toast-context'
import { useActiveTimers, useTimesheetSegments } from '../../hooks/useReports'
import { useAttendanceSettings } from '../../hooks/useAttendance'
import type { TimesheetSegment } from '../../api/reports'
import { downloadCsv } from '../../lib/csv'
import { formatMinutes } from '../../lib/duration'
import { cn } from '../../lib/cn'
import { HoverCard } from '../../components/ui/HoverCard'

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

const iso = (d: Date) => d.toISOString().slice(0, 10)
const shiftDay = (date: string, days: number) => {
  const d = new Date(`${date}T12:00:00`)
  d.setDate(d.getDate() + days)
  return iso(d)
}

/** Minutes past midnight, in the office timezone. */
function minutesInto(dayIso: string, at: string, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date(at))
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0)
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0)
  // A segment clipped to midnight reads as 00:00 for both ends of the day; the
  // caller decides which one it meant.
  void dayIso
  return h * 60 + m
}

const clockAt = (at: string, tz: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false })
    .format(new Date(at))

/**
 * Who is working on what, and what the day looked like.
 *
 * The bar shows real tracked segments and nothing else. Gaps are left as gaps:
 * the timer covers well under a full day for most people, and filling the holes
 * with assumed time would turn a record into a guess. The empty stretches are
 * the most informative part of the chart.
 */
export default function TimesheetPage() {
  const toast = useToast()
  const [date, setDate] = useState(() => iso(new Date()))
  const { data: settings } = useAttendanceSettings()
  const tz = settings?.timezone ?? 'Asia/Karachi'

  const { data: active = [], isLoading: activeLoading } = useActiveTimers()
  const { data: segments = [], isLoading: segLoading } = useTimesheetSegments(date)

  const isToday = date === iso(new Date())

  // Day bounds for the bar. The working day plus an hour of margin either side,
  // so an early start or a late finish is still drawn rather than clipped away.
  const [dayStart, dayEnd] = useMemo(() => {
    const toMin = (t?: string | null) => {
      const m = t ? /^(\d{1,2}):(\d{2})/.exec(t) : null
      return m ? Number(m[1]) * 60 + Number(m[2]) : null
    }
    const workStart = toMin(settings?.work_start_time) ?? 9 * 60
    const workEnd = toMin(settings?.work_end_time) ?? 18 * 60

    let earliest = workStart
    let latest = workEnd
    for (const s of segments) {
      earliest = Math.min(earliest, minutesInto(date, s.started_at, tz))
      latest = Math.max(latest, minutesInto(date, s.ended_at, tz) || latest)
    }
    return [Math.max(0, earliest - 60), Math.min(24 * 60, latest + 60)]
  }, [segments, settings, date, tz])

  /** One row per person, with their segments and total. */
  const rows = useMemo(() => {
    const byPerson = new Map<string, { name: string; avatar: string | null; segs: TimesheetSegment[]; total: number }>()
    for (const s of segments) {
      const existing = byPerson.get(s.profile_id) ?? {
        name: s.profile_name ?? '', avatar: s.avatar_url, segs: [], total: 0,
      }
      existing.segs.push(s)
      existing.total += s.minutes
      byPerson.set(s.profile_id, existing)
    }
    return [...byPerson.entries()]
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.total - a.total)
  }, [segments])

  const exportCsv = () => {
    if (segments.length === 0) { toast('Nothing to export', 'error'); return }
    downloadCsv(
      `timesheet_${date}.csv`,
      ['Person', 'Project', 'Task', 'From', 'To', 'Minutes', 'Still running'],
      segments.map((s) => [
        s.profile_name ?? '', s.project_name ?? '', s.task_title ?? '',
        clockAt(s.started_at, tz), clockAt(s.ended_at, tz),
        s.minutes, s.is_running ? 'yes' : '',
      ]),
    )
    toast(`Exported ${segments.length} segments`, 'success')
  }

  return (
    <div className="flex flex-1 flex-col">
      <Topbar title="Timesheet" />
      <div className="flex flex-col gap-5 p-4 lg:px-8 lg:py-7">
        <div>
          <h2 className="font-display text-[22px] font-bold text-text-1">Timesheet</h2>
          <p className="font-ui text-[13px] text-text-3">
            Who is on what right now, and how each day was spent.
          </p>
        </div>

        {/* ── Working right now ── */}
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

          {activeLoading ? (
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
                      <Link to={`/admin/tasks/${a.task_id}?openInProject=1`} className="hover:text-brand-red">
                        {a.task_title}
                      </Link>
                      {a.project_name && <span className="text-text-4"> · {a.project_name}</span>}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-[11.5px] text-text-4">
                    since {clockAt(a.started_at, tz)}
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 font-mono text-[11.5px] font-semibold text-success">
                    <Radio size={11} /> {formatMinutes(a.running_minutes)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── The day ── */}
        <div className="flex flex-wrap items-center gap-3">
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
            onClick={exportCsv} disabled={segments.length === 0}
          >
            <Download size={13} /> Export CSV
          </Button>
        </div>

        {segLoading ? (
          <Skeleton className="h-64" />
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border-default py-14 text-center font-ui text-[13px] text-text-4">
            No time was tracked on this day.
          </div>
        ) : (
          <section className="overflow-hidden rounded-xl border border-border-default bg-surface-1">
            <HourScale from={dayStart} to={dayEnd} />
            <div className="divide-y divide-border-subtle">
              {rows.map((row) => (
                <DayBar
                  key={row.id}
                  row={row}
                  from={dayStart}
                  to={dayEnd}
                  date={date}
                  tz={tz}
                />
              ))}
            </div>
            <p className="border-t border-border-subtle px-4 py-2.5 font-ui text-[11px] text-text-4">
              Only tracked time is drawn. Gaps are time no timer was running — not necessarily time
              not worked.
            </p>
          </section>
        )}
      </div>
    </div>
  )
}

/** The hour ruler above the bars. */
function HourScale({ from, to }: { from: number; to: number }) {
  const span = Math.max(1, to - from)
  const firstHour = Math.ceil(from / 60)
  const lastHour = Math.floor(to / 60)
  const hours: number[] = []
  for (let h = firstHour; h <= lastHour; h++) hours.push(h)

  return (
    <div className="flex items-end border-b border-border-subtle bg-surface-2/40 pl-44 pr-4">
      <div className="relative h-7 flex-1">
        {hours.map((h) => (
          <span
            key={h}
            className="absolute top-1.5 -translate-x-1/2 font-mono text-[10px] text-text-4"
            style={{ left: `${((h * 60 - from) / span) * 100}%` }}
          >
            {String(h).padStart(2, '0')}
          </span>
        ))}
      </div>
    </div>
  )
}

function DayBar({ row, from, to, date, tz }: {
  row: { id: string; name: string; avatar: string | null; segs: TimesheetSegment[]; total: number }
  from: number
  to: number
  date: string
  tz: string
}) {
  const span = Math.max(1, to - from)

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex w-40 shrink-0 items-center gap-2">
        <Avatar name={row.name} src={row.avatar ?? undefined} size="xs" personId={row.id} />
        <span className="min-w-0">
          <PersonLink personId={row.id} className="block truncate font-ui text-[12.5px] font-medium text-text-1">
            {row.name}
          </PersonLink>
          <span className="font-mono text-[10.5px] text-text-4">{formatMinutes(row.total)}</span>
        </span>
      </div>

      <div className="relative h-8 flex-1 overflow-hidden rounded-md bg-surface-inset">
        {row.segs.map((s, i) => {
          const startMin = minutesInto(date, s.started_at, tz)
          const endMin = minutesInto(date, s.ended_at, tz)
          // A segment ending exactly at midnight reads as 0; treat it as the end.
          const end = endMin <= startMin ? to : endMin
          const left = ((startMin - from) / span) * 100
          const width = Math.max(0.4, ((end - startMin) / span) * 100)
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
              style={{
                left: `${left}%`,
                width: `${width}%`,
                // A one-minute segment still needs to be visible and hoverable.
                minWidth: 3,
              }}
              className={cn(
                'absolute top-1 block h-6 rounded-sm transition-opacity hover:opacity-80',
                s.is_running && 'animate-pulse',
              )}
            >
              <span
                className="block size-full rounded-sm"
                style={{ background: colour }}
              />
            </HoverCard>
          )
        })}
      </div>

      <span className="w-14 shrink-0 text-right font-mono text-[11.5px] text-text-3">
        {row.segs.length} <span className="text-text-4">seg</span>
      </span>
    </div>
  )
}
