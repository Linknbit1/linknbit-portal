import { useSearchParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { Loader2, Home, Plane, AlertCircle, Hourglass, Check, X, Inbox, CalendarX2, Plus, Search, UserPlus, SlidersHorizontal } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Avatar } from '../ui/Avatar'
import { PersonLink } from './PersonLink'
import { Button } from '../ui/Button'
import { Select } from '../ui/Select'
import { Tabs } from '../ui/Tabs'
import { Toggle } from '../ui/Toggle'
import { Drawer } from '../ui/Drawer'
import { useIsDesktop } from '../../hooks/useMediaQuery'
import { matchesQuery } from '../ui/optionSearch'
import { isDecidableBy } from '../../lib/requestReview'
import { useMonthFilter } from '../../hooks/useMonthFilter'
import { MonthStepper, DateGroupHeading } from './MonthFilter'
import { EnterRequestForEmployeeModal } from './EnterRequestForEmployeeModal'
import { formatDate, formatTimeOfDay, formatHoursMinutes } from '../../lib/utils'
import { DAY_PART_LABEL } from '../../lib/dayParts'
import { exceptionTypeLabel } from '../../lib/exceptionTypes'
import { datesInRange, groupByDate } from '../../lib/dateGroups'
import { useAuthContext } from '../../context/AuthContext'
import { useMyPermissions } from '../../hooks/usePermissions'
import { ADMINISTRATOR } from '../../api/permissions'
import { useToast } from '../ui/toast-context'
import {
  useAllLeaveRequests,
  useAllWfhRequests,
  useAllAttendanceExceptions,
  useAllOvertimeRequests,
  useReviewLeave,
  useReviewWfh,
  useReviewException,
  useReviewOvertime,
  useRemoveLeaveDay,
  useRemoveWfhDay,
} from '../../hooks/useAttendance'

/**
 * The four request types share one shape and one lifecycle, so they belong in
 * one queue. They lived on four sidebar rows because each has its own table —
 * an implementation detail nobody filing or approving a request thinks in.
 */
type RequestKind = 'leave' | 'wfh' | 'exception' | 'overtime'

type ReviewStatus = 'approved' | 'rejected'

interface KindMeta {
  label: string
  icon: LucideIcon
  chip: string
  /** The same accent as `chip`, as a value the type dropdown can put in a dot. */
  dot: string
}

const KIND_META: Record<RequestKind, KindMeta> = {
  leave: {
    label: 'Leave',
    icon: Plane,
    chip: 'bg-service-design/12 text-service-design border-service-design/30',
    dot: 'var(--color-service-design)',
  },
  wfh: {
    label: 'WFH',
    icon: Home,
    chip: 'bg-service-dev/12 text-service-dev border-service-dev/30',
    dot: 'var(--color-service-dev)',
  },
  exception: {
    label: 'Exception',
    icon: AlertCircle,
    chip: 'bg-warning/12 text-warning border-warning/30',
    dot: 'var(--color-warning)',
  },
  overtime: {
    label: 'Overtime',
    icon: Hourglass,
    chip: 'bg-service-mkt/12 text-service-mkt border-service-mkt/30',
    dot: 'var(--color-service-mkt)',
  },
}

const KIND_ORDER: RequestKind[] = ['leave', 'wfh', 'exception', 'overtime']

const STATUS_PILL: Record<string, string> = {
  pending: 'bg-warning/12 text-warning border-warning/30',
  approved: 'bg-success/12 text-success border-success/30',
  rejected: 'bg-error/10 text-error border-error/30',
}

/** One row of the merged queue, normalised out of four differently-shaped tables. */
interface UnifiedRequest {
  id: string
  kind: RequestKind
  profileId: string
  name: string
  avatarUrl: string | null
  /** First day the request affects, and the sort key. */
  date: string
  /** Last day, so a range can be broken back down into the days it covers. */
  endDate: string
  /** Half days cover a single day, so they can never have one taken out. */
  isFullDay: boolean
  /**
   * The facts line, in one order for all four kinds: what it is, when it is,
   * how much of the day it takes, and the clock times if it has any. Each part
   * is separately nullable so a row never prints an empty separator, and they
   * are text rather than chips — a chip is for the handful of things you scan
   * and filter a queue by, and four of them per row is not a scan line.
   */
  /** Leave type or exception type. Null for WFH and overtime, which have none. */
  what: string | null
  /** The day, or the range. */
  whenLabel: string
  /** How much: "3 days", "Half day · 1st half", "1h 30m". */
  extent: string | null
  /** Clock window: "10:40 AM", "05:30 PM – 07:00 PM". */
  timeLabel: string | null
  reason: string
  /** Who filed it, when that was not the person it is about. */
  enteredById: string | null
  enteredByName: string | null
  status: string
  createdAt: string
}

/**
 * The days a leave or WFH range covers, each removable on its own.
 *
 * Removing takes two clicks rather than one. It is not undoable from here, and
 * it rewrites that person's attendance for the day, which is too much to hang
 * off a stray click in a dense list.
 */
function DayStrip({
  days,
  busy,
  onRemove,
}: {
  days: string[]
  busy: boolean
  onRemove: (day: string) => void
}) {
  const [armed, setArmed] = useState<string | null>(null)

  return (
    <div className="flex w-full flex-wrap items-center gap-1.5 border-t border-border-subtle pt-2">
      <span className="font-ui text-[11px] text-text-4">Remove a day:</span>
      {days.map((day) => {
        const isArmed = armed === day
        return (
          <button
            key={day}
            type="button"
            disabled={busy}
            onClick={() => (isArmed ? onRemove(day) : setArmed(day))}
            onBlur={() => setArmed((a) => (a === day ? null : a))}
            className={cn(
              'inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 font-mono text-[11px] transition-colors disabled:opacity-50',
              isArmed
                ? 'border-error/40 bg-error/12 text-error'
                : 'border-border-default bg-surface-2 text-text-3 hover:border-border-strong hover:text-text-1',
            )}
          >
            {isArmed ? 'Remove?' : formatDate(day)}
            <X size={10} />
          </button>
        )
      })}
    </div>
  )
}

/** "12 Mar → 15 Mar 2026", collapsing a single-day range. */
const fmtRange = (start: string, end: string): string =>
  start === end ? formatDate(start) : `${formatDate(start)} → ${formatDate(end)}`

/**
 * How much of the calendar a leave or WFH request takes.
 *
 * A single full day says nothing — the date beside it already did — so it
 * returns null rather than the noise of "1 day" on most rows in the queue.
 */
function extentOf(dayPart: string, days: number): string | null {
  if (dayPart !== 'full') {
    const half = DAY_PART_LABEL[dayPart]
    return half ? `Half day · ${half}` : 'Half day'
  }
  if (days > 1) return `${days} days`
  return null
}

/** Calendar days a range spans, inclusive. */
const spanDays = (start: string, end: string): number =>
  Math.round(
    (new Date(`${end}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime()) / 86400000,
  ) + 1

type StatusFilter = 'pending' | 'approved' | 'rejected' | 'all'

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'all', label: 'All' },
]

const isStatusFilter = (v: string): v is StatusFilter =>
  STATUS_FILTERS.some((f) => f.id === v)

const isKind = (v: string): v is RequestKind =>
  (KIND_ORDER as string[]).includes(v)

/** ?kind=exception — the tab a link wants this queue to open on. */
export const REQUEST_KIND_PARAM = 'kind'

/**
 * Every request awaiting — or already given — a decision, in one queue.
 * Reviewing is offered only to people who hold `can_manage_attendance`;
 * everyone else reads the same list without the buttons, which is what makes
 * this safe to show outside the management page.
 */
export function AttendanceRequests() {
  const { profile } = useAuthContext()
  const { data: permissions } = useMyPermissions()
  const toast = useToast()

  const canReview =
    !!permissions &&
    (permissions.includes(ADMINISTRATOR) || permissions.includes('can_manage_attendance'))

  // Seeded from ?kind=, which is how a notification lands on the tab it is
  // about: "Abbas requested early departure" opens Exceptions, not the whole
  // queue with his row somewhere in it. Read once — the filter is the user's
  // from that point, and rewriting the URL as they click would fight them.
  const [searchParams] = useSearchParams()
  const [kind, setKind] = useState<RequestKind | 'all'>(() => {
    const asked = searchParams.get(REQUEST_KIND_PARAM)
    return asked && isKind(asked) ? asked : 'all'
  })
  const [status, setStatus] = useState<StatusFilter>('pending')
  const [query, setQuery] = useState('')
  const [person, setPerson] = useState('all')
  // The same stepper the attendance tabs use, "All months" toggle included, so
  // the two screens narrow a period the same way. Opens on the current month —
  // the period somebody means when they say "the requests" — with All months one
  // press away inside the filter panel for anything further out.
  const month = useMonthFilter()

  // Fetch unfiltered and narrow in memory: the counts on the type chips have to
  // reflect the whole queue, not the slice currently on screen.
  const leaveQ = useAllLeaveRequests()
  const wfhQ = useAllWfhRequests()
  const excQ = useAllAttendanceExceptions()
  const otQ = useAllOvertimeRequests()

  const removeLeaveDay = useRemoveLeaveDay()
  const removeWfhDay = useRemoveWfhDay()
  // Which row has its day strip open. One at a time: the strip is a wide row of
  // chips, and several open at once turns the queue into a wall.
  const [editingDays, setEditingDays] = useState<string | null>(null)
  const [entering, setEntering] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  // Off by default: the flat list answers "what needs deciding", which is what
  // the queue is for. Grouping answers "who is off on the 14th", which is a
  // different question and worth a switch rather than a second screen.
  const [groupByDay, setGroupByDay] = useState(false)
  const isDesktop = useIsDesktop()

  const reviewLeave = useReviewLeave()
  const reviewWfh = useReviewWfh()
  const reviewException = useReviewException()
  const reviewOvertime = useReviewOvertime()

  const isLoading = leaveQ.isLoading || wfhQ.isLoading || excQ.isLoading || otQ.isLoading
  const isError = leaveQ.isError || wfhQ.isError || excQ.isError || otQ.isError

  const all = useMemo<UnifiedRequest[]>(() => {
    const rows: UnifiedRequest[] = []

    for (const r of leaveQ.data ?? []) {
      rows.push({
        id: r.id,
        kind: 'leave',
        profileId: r.profile_id,
        name: r.profiles?.name ?? '-',
        avatarUrl: r.profiles?.avatar_url ?? null,
        date: r.start_date,
        endDate: r.end_date,
        isFullDay: r.day_part === 'full',
        what: r.leave_types?.name ?? 'Leave',
        whenLabel: fmtRange(r.start_date, r.end_date),
        // r.days, not the calendar span: leave is deducted in leave days, and a
        // range across a weekend costs fewer days than it covers.
        extent: extentOf(r.day_part, r.days),
        timeLabel: null,
        reason: r.reason,
        enteredById: r.entered_by,
        enteredByName: r.entered_by_profile?.name ?? null,
        status: r.status,
        createdAt: r.created_at,
      })
    }

    for (const r of wfhQ.data ?? []) {
      rows.push({
        id: r.id,
        kind: 'wfh',
        profileId: r.profile_id,
        name: r.profiles?.name ?? '-',
        avatarUrl: r.profiles?.avatar_url ?? null,
        date: r.start_date,
        endDate: r.end_date,
        isFullDay: r.day_part === 'full',
        what: null,
        whenLabel: fmtRange(r.start_date, r.end_date),
        extent: extentOf(r.day_part, spanDays(r.start_date, r.end_date)),
        timeLabel: null,
        reason: r.reason,
        enteredById: null,
        enteredByName: null,
        status: r.status,
        createdAt: r.created_at,
      })
    }

    for (const r of excQ.data ?? []) {
      rows.push({
        id: r.id,
        kind: 'exception',
        profileId: r.profile_id,
        name: r.profiles?.name ?? '-',
        avatarUrl: r.profiles?.avatar_url ?? null,
        date: r.date,
        endDate: r.date,
        isFullDay: true,
        what: exceptionTypeLabel(r.exception_type),
        whenLabel: formatDate(r.date),
        extent: null,
        // An out-of-office says when they left and when they came back; the
        // other two are a single moment.
        timeLabel: [formatTimeOfDay(r.requested_time), formatTimeOfDay(r.return_time)]
          .filter(Boolean)
          .join(' → ') || null,
        reason: r.reason,
        enteredById: r.entered_by,
        enteredByName: r.entered_by_profile?.name ?? null,
        status: r.status,
        createdAt: r.created_at,
      })
    }

    for (const r of otQ.data ?? []) {
      rows.push({
        id: r.id,
        kind: 'overtime',
        profileId: r.profile_id,
        name: r.profiles?.name ?? '-',
        avatarUrl: r.profiles?.avatar_url ?? null,
        date: r.date,
        endDate: r.date,
        isFullDay: true,
        what: null,
        whenLabel: formatDate(r.date),
        extent: formatHoursMinutes(r.hours),
        timeLabel: [formatTimeOfDay(r.start_time), formatTimeOfDay(r.end_time)]
          .filter(Boolean)
          .join(' – ') || null,
        reason: r.reason,
        enteredById: r.entered_by,
        enteredByName: r.entered_by_profile?.name ?? null,
        status: r.status,
        createdAt: r.created_at,
      })
    }

    // Newest first: a queue is read from the top, and the most recent request is
    // the one most likely to still need a decision.
    return rows.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
  }, [leaveQ.data, wfhQ.data, excQ.data, otQ.data])

  const pendingByKind = useMemo(() => {
    const tally = {} as Record<RequestKind, number>
    for (const r of all) {
      if (r.status === 'pending') tally[r.kind] = (tally[r.kind] ?? 0) + 1
    }
    return tally
  }, [all])

  const visible = useMemo(
    () =>
      all.filter(
        (r) =>
          (kind === 'all' || r.kind === kind) &&
          (status === 'all' || r.status === status) &&
          (person === 'all' || r.profileId === person) &&
          // Overlap, not the first day: a range that starts in one month and
          // ends in the next belongs to both.
          month.overlapsMonth(r.date, r.endDate) &&
          // The person is what anyone searches a queue for; the reason, the type
          // and whoever filed it are matched too so "sick", "overtime" or an HR
          // name all find something.
          matchesQuery(query, r.name, r.reason, r.what, r.extent, KIND_META[r.kind].label, r.enteredByName),
      ),
    [all, kind, status, person, month, query],
  )

  /**
   * The same rows, bucketed under every day they cover — a week of leave shows
   * on all five days, which is the whole point of looking at it this way.
   *
   * Clamped to the selected month: with a month chosen, a range running into
   * the next one would otherwise open day headings outside the period the rest
   * of the screen says you are looking at.
   */
  const dayGroups = useMemo(() => {
    if (!groupByDay) return null
    return groupByDate(visible, (r) => {
      const days = datesInRange(r.date, r.endDate)
      const inPeriod = month.allMonths ? days : days.filter((d) => month.inMonth(d))
      // A range that only overlaps the month at its edges still belongs to it.
      return inPeriod.length > 0 ? inPeriod : []
    })
  }, [visible, groupByDay, month])

  /**
   * Only the people who actually appear in the queue. A picker listing everybody
   * internal would be mostly rows that filter to nothing, and the answer to
   * "whose requests are these" is already in the data on screen.
   */
  const peopleOptions = useMemo(() => {
    const byId = new Map<string, { name: string; avatarUrl: string | null }>()
    for (const r of all) {
      if (!byId.has(r.profileId)) byId.set(r.profileId, { name: r.name, avatarUrl: r.avatarUrl })
    }
    return [
      { value: 'all', label: 'All employees' },
      ...[...byId.entries()]
        .sort((a, b) => a[1].name.localeCompare(b[1].name))
        .map(([id, p]) => ({
          value: id,
          label: p.name,
          avatar: { name: p.name, url: p.avatarUrl },
        })),
    ]
  }, [all])

  const totalPending = all.filter((r) => r.status === 'pending').length

  // One tab bar, on the axis that decides what to do with a row. The type used
  // to be a second bar of chips above this one, which read as two sets of tabs
  // competing to say what the list was — it is a filter, so it looks like one.
  const statusTabs = STATUS_FILTERS.map((f) => ({
    key: f.id,
    label: f.label,
    badge: f.id === 'pending' && totalPending > 0 ? totalPending : undefined,
  }))

  const typeOptions = [
    { value: 'all', label: 'All types' },
    ...KIND_ORDER.map((k) => ({
      value: k,
      label: pendingByKind[k] ? `${KIND_META[k].label} (${pendingByKind[k]})` : KIND_META[k].label,
      dot: KIND_META[k].dot,
    })),
  ]

  // How many filters are doing something, for the badge on the Filters button:
  // the panel is closed most of the time, and a queue that is quietly narrowed
  // with no sign of it is how people conclude a request has gone missing.
  // Search is not counted — it sits in the toolbar where it can be seen.
  const activeFilters =
    (kind !== 'all' ? 1 : 0) + (person !== 'all' ? 1 : 0) + (month.isDefault ? 0 : 1)
    + (groupByDay ? 1 : 0)

  const clearFilters = () => { setKind('all'); setPerson('all'); month.reset(); setGroupByDay(false) }

  const removingDay = removeLeaveDay.isPending || removeWfhDay.isPending

  const removeDay = (row: UnifiedRequest, day: string) => {
    const mutation = row.kind === 'leave' ? removeLeaveDay : removeWfhDay
    mutation.mutate(
      { requestId: row.id, date: day },
      {
        onSuccess: () => toast(`${formatDate(day)} removed from the request`, 'success'),
        onError: (e: unknown) =>
          toast(e instanceof Error ? e.message : 'Could not remove that day', 'error'),
      },
    )
  }

  const isReviewing =
    reviewLeave.isPending ||
    reviewWfh.isPending ||
    reviewException.isPending ||
    reviewOvertime.isPending

  /**
   * Whether this viewer can decide on this row, mirroring the RLS rule: you may
   * not review your own request, and you may not review one you filed for
   * somebody else. Offering the buttons anyway meant pressing them and getting
   * a database error back, which reads as a fault rather than as the rule.
   */
  const canDecide = (row: UnifiedRequest): boolean =>
    canReview && isDecidableBy({ profile_id: row.profileId, entered_by: row.enteredById }, profile?.id)

  function review(row: UnifiedRequest, decision: ReviewStatus) {
    if (!profile) return
    const done = {
      onSuccess: () => toast(`${KIND_META[row.kind].label} request ${decision}.`, 'success'),
      onError: (error: Error) => toast(error.message, 'error'),
    }
    switch (row.kind) {
      case 'leave':
        reviewLeave.mutate({ id: row.id, status: decision, reviewedBy: profile.id }, done)
        break
      case 'wfh':
        reviewWfh.mutate({ id: row.id, status: decision, reviewedBy: profile.id }, done)
        break
      case 'overtime':
        reviewOvertime.mutate({ id: row.id, status: decision, reviewedBy: profile.id }, done)
        break
      case 'exception':
        // Exceptions record their reviewer server-side, so no reviewedBy here.
        reviewException.mutate({ id: row.id, status: decision }, done)
        break
    }
  }

  /**
   * One row, used by both the flat list and the day-grouped one.
   *
   * `showActions` is false for the second and later days of a range: a week of
   * leave is one request listed under each day it covers, and offering Approve
   * on every one of those days would suggest there are five decisions to make.
   */
  const renderRow = (row: UnifiedRequest, key: string, showActions: boolean) => {
    const meta = KIND_META[row.kind]
    const Icon = meta.icon
    const rowKey = `${row.kind}:${row.id}`
    const stripOpen = editingDays === rowKey
    // What / when / how much / clock — in that order for all four kinds, so the
    // eye lands on the same thing in the same place down the whole queue.
    const facts = [row.what, row.whenLabel, row.extent, row.timeLabel].filter(Boolean)

    return (
      <div
        key={key}
        className="flex flex-col gap-2 border-b border-border-subtle py-3 last:border-0 sm:flex-row sm:flex-wrap sm:items-start sm:gap-3 sm:px-4"
      >
        {/* items-start, not centre: the reason wraps to as many lines as it
            needs — a reason worth writing is worth reading — and the avatar
            should stay level with the name, not float mid-block. */}
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <Avatar name={row.name} src={row.avatarUrl ?? undefined} size="sm" personId={row.profileId} />
          <div className="min-w-0 flex-1">
            <PersonLink
              personId={row.profileId}
              className="block truncate font-ui font-medium text-[13px] text-text-1"
            >
              {row.name}
            </PersonLink>
            <p className="flex flex-wrap items-center gap-x-1.5 font-mono text-[11.5px] tabular-nums text-text-2">
              {facts.map((fact, i) => (
                <span key={fact} className={i === 0 ? 'text-text-1' : undefined}>
                  {i > 0 && <span className="mr-1.5 text-text-4">·</span>}
                  {fact}
                </span>
              ))}
            </p>
            {row.reason && (
              <p className="font-ui text-[11.5px]/snug text-text-4 wrap-break-word">{row.reason}</p>
            )}
          </div>
        </div>

        {/* The chips are the two axes you scan and filter by — what kind of
            request, and where it stands — plus the one exception flag. On a
            phone they sit under the facts as their own row; on a desktop they
            are the right-hand rail. */}
        <div className="flex flex-wrap items-center gap-1.5 pl-9.5 sm:shrink-0 sm:justify-end sm:pl-0">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5',
              'font-ui text-[10.5px] font-semibold uppercase tracking-wider whitespace-nowrap',
              meta.chip,
            )}
          >
            <Icon size={11} />
            {meta.label}
          </span>

          {/* Who put it in, when that was not the person it is about: it
              decides who has to act on the row, so it stays on the scan line
              rather than becoming a third dim line under the reason. */}
          {row.enteredByName && (
            <span
              className="inline-flex items-center gap-1 rounded-sm border border-brand-red/25 bg-brand-red/10 px-2 py-0.5 font-ui text-[10.5px] font-semibold uppercase tracking-wider whitespace-nowrap text-brand-red"
              title={`${row.enteredByName} filed this for ${row.name}, so somebody else has to decide on it`}
            >
              <UserPlus size={11} className="shrink-0" />
              Added by {row.enteredByName}
            </span>
          )}

          {row.status === 'pending' && showActions && canDecide(row) ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={isReviewing}
                onClick={() => review(row, 'approved')}
                className="inline-flex items-center gap-1 rounded-sm border border-success/30 bg-success/12 px-2.5 py-1 font-ui text-[11.5px] font-semibold text-success hover:bg-success/20 disabled:opacity-50"
              >
                <Check size={12} />
                Approve
              </button>
              <button
                type="button"
                disabled={isReviewing}
                onClick={() => review(row, 'rejected')}
                className="inline-flex items-center gap-1 rounded-sm border border-error/30 bg-error/10 px-2.5 py-1 font-ui text-[11.5px] font-semibold text-error hover:bg-error/20 disabled:opacity-50"
              >
                <X size={12} />
                Reject
              </button>
            </div>
          ) : (
            <span
              className={cn(
                'inline-flex items-center rounded-sm border px-2 py-0.5',
                'font-ui text-[10.5px] font-semibold uppercase tracking-wider whitespace-nowrap',
                STATUS_PILL[row.status] ?? 'bg-surface-2 text-text-3 border-border-default',
              )}
              title={
                row.status === 'pending' && canReview && !canDecide(row)
                  ? row.enteredById === profile?.id
                    ? 'You filed this one, so somebody else has to decide on it'
                    : 'You cannot decide on your own request'
                  : undefined
              }
            >
              {row.status === 'pending' && canReview && !canDecide(row)
                ? 'Waiting on someone else'
                : row.status}
            </span>
          )}

          {/* Only a multi-day, full-day leave or WFH range has days to take out. */}
          {showActions
            && canReview
            && (row.kind === 'leave' || row.kind === 'wfh')
            && row.isFullDay
            && row.endDate > row.date
            && (row.status === 'approved' || row.status === 'pending') && (
            <button
              type="button"
              onClick={() => setEditingDays((cur) => (cur === rowKey ? null : rowKey))}
              aria-expanded={stripOpen}
              className={cn(
                'inline-flex items-center gap-1 rounded-sm border px-2 py-1 font-ui text-[11.5px] font-semibold transition-colors',
                stripOpen
                  ? 'border-brand-red/30 bg-brand-red/12 text-brand-red'
                  : 'border-border-default bg-surface-2 text-text-3 hover:text-text-1',
              )}
            >
              <CalendarX2 size={12} />
              Days
            </button>
          )}
        </div>

        {stripOpen && (
          <DayStrip
            days={datesInRange(row.date, row.endDate)}
            busy={removingDay}
            onRemove={(day) => removeDay(row, day)}
          />
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* No card on a phone: a border inside a screen that is already only
          360px wide spends width on chrome and boxes the list in twice. The
          rows keep their dividers, so the queue still reads as a list. */}
      <div className="sm:border sm:border-border-default sm:bg-surface-1">
        {/* One row now. The narrowing controls moved into a panel, because they
            are set once and then left alone, while the tab, the search box and
            the way in for a new request are used constantly — putting all seven
            on the toolbar spent the width that matters on the ones that don't.

            On a phone the tabs take the first line to themselves, and the
            search box shares the second with the two buttons, which sit to its
            right where a toolbar's actions belong. On a desktop it is one
            line: tabs, then search and the buttons pushed right. */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle pb-3 sm:gap-x-3 sm:px-4 sm:py-3">
          {/* The strip scrolls rather than wraps, so it takes whatever is left
              beside the buttons on a phone and its natural width on a desktop. */}
          <Tabs
            variant="pill"
            size="sm"
            tabs={statusTabs}
            activeKey={status}
            onChange={(k) => { if (isStatusFilter(k)) setStatus(k) }}
            fill
            className="order-1 w-full min-w-0 sm:w-auto sm:flex-1 sm:max-w-md"
          />
          <div className="relative order-2 min-w-0 flex-1 sm:ml-auto sm:w-52 sm:flex-none">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-4" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={canReview ? 'Search people or reasons…' : 'Search your requests…'}
              aria-label="Search requests"
              className="w-full rounded-md border border-border-default bg-surface-inset py-1.5 pl-7 pr-3 font-ui text-[12.5px] text-text-1 outline-none placeholder:text-text-4 focus:border-border-focus"
            />
          </div>
          <div className="order-3 flex shrink-0 items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setFiltersOpen(true)}
              aria-label={activeFilters > 0 ? `Filters, ${activeFilters} active` : 'Filters'}
              // No text colour here: tailwind-merge cannot tell a custom
              // `text-<colour>` from a `text-<size>`, so `text-brand-red` was
              // dropping the Button's own `text-body-sm` and the label jumped
              // from 13px to 16px the moment a filter was set. The border and
              // the count carry the active state instead.
              className={cn('px-2.5 sm:px-3', activeFilters > 0 && 'border-brand-red/40')}
            >
              <SlidersHorizontal size={14} />
              <span className="hidden sm:inline">Filters</span>
              {activeFilters > 0 && (
                <span className="inline-flex size-4 items-center justify-center rounded-full bg-brand-red font-mono text-[10px] font-semibold text-white">
                  {activeFilters}
                </span>
              )}
            </Button>
            {canReview && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setEntering(true)}
                aria-label="Add a request for someone else"
                className="px-2.5 sm:px-3"
              >
                <Plus size={14} />
                <span className="hidden sm:inline">Add for someone else</span>
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12 text-text-4">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : isError ? (
          <div className="py-12 text-center font-ui text-[13px] text-error sm:px-4">
            Could not load requests. Refresh to try again.
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center text-text-4 sm:px-4">
            <Inbox size={20} />
            <span className="font-ui text-[13px]">
              {query.trim()
                ? `Nothing matches “${query.trim()}”.`
                : !month.allMonths
                  ? `Nothing in ${month.label}.`
                  : status === 'pending'
                    ? 'Nothing is waiting for a decision.'
                    : 'No requests match.'}
            </span>
          </div>
        ) : (
          dayGroups
            ? dayGroups.map((group) => (
                <div key={group.date}>
                  <DateGroupHeading date={group.date} count={group.items.length} />
                  {group.items.map((row) =>
                    // Actions ride on the request's own first day, so a range
                    // offers one decision rather than one per day it covers.
                    renderRow(row, `${group.date}:${row.kind}:${row.id}`, row.date === group.date),
                  )}
                </div>
              ))
            : visible.map((row) => renderRow(row, `${row.kind}:${row.id}`, true))
        )}
      </div>

      {/* Filters live in a panel, not on the toolbar: a right-hand drawer on a
          desktop and a bottom sheet you can drag away on a phone. Clear all sits
          in the footer, which is the one place it is always reachable and never
          in the way — on the toolbar it appeared and vanished with the filters
          themselves, moving everything beside it each time. */}
      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        side={isDesktop ? 'right' : 'bottom'}
        width={380}
        title={
          <div>
            <h2 className="font-display font-semibold text-[15px] text-text-1">Filters</h2>
            <p className="font-ui text-[12px] text-text-4">
              {visible.length} of {all.length} requests shown
            </p>
          </div>
        }
        footer={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              disabled={activeFilters === 0}
              onClick={clearFilters}
            >
              Clear all
            </Button>
            <Button className="flex-1" onClick={() => setFiltersOpen(false)}>
              Done
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-5 p-5">
          {/* A reviewer's tools: on your own handful of requests they narrow
              almost nothing, so an employee gets the period alone. */}
          {canReview && (
            <FilterField label="Type">
              <Select
                value={kind}
                onChange={(v) => setKind(v === 'all' || isKind(v) ? v : 'all')}
                options={typeOptions}
                className="w-full"
              />
            </FilterField>
          )}
          {canReview && (
            <FilterField label="Employee">
              <Select value={person} onChange={setPerson} options={peopleOptions} className="w-full" />
            </FilterField>
          )}
          <FilterField label="Period">
            <MonthStepper filter={month} stacked />
          </FilterField>

          <FilterField label="Arrangement">
            {/* A div, not a button: Toggle is itself a <button>, and nesting one
                inside another is invalid HTML — React rejects it and the outer
                press never reaches the switch. The switch is the control. */}
            <div className="flex items-center gap-3 rounded-sm border border-border-default bg-surface-inset px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <span className="block font-ui text-[13px] text-text-1">Group by day</span>
                <span className="block font-ui text-[11.5px]/snug text-text-4">
                  A heading per date, with every request that covers it listed underneath.
                </span>
              </div>
              <Toggle checked={groupByDay} onChange={setGroupByDay} label="Group by day" />
            </div>
          </FilterField>
        </div>
      </Drawer>

      {entering && <EnterRequestForEmployeeModal onClose={() => setEntering(false)} />}
    </div>
  )
}

/** One labelled row in the filter panel — a stack, not a toolbar's line. */
function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono text-[10.5px] uppercase tracking-wider text-text-4">{label}</span>
      {children}
    </div>
  )
}
