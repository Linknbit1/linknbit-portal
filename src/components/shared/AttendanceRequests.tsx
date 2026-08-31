import { useMemo, useState } from 'react'
import { Loader2, Home, Plane, AlertCircle, Hourglass, Check, X, Inbox, CalendarX2, Plus, Search } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Avatar } from '../ui/Avatar'
import { PersonLink } from './PersonLink'
import { Button } from '../ui/Button'
import { Select } from '../ui/Select'
import { Tabs } from '../ui/Tabs'
import { matchesQuery } from '../ui/optionSearch'
import { EnterRequestForEmployeeModal } from './EnterRequestForEmployeeModal'
import { formatDate } from '../../lib/utils'
import { DAY_PART_LABEL } from '../../lib/dayParts'
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
  dateLabel: string
  /** The one line that distinguishes this request from another of the same kind. */
  detail: string
  reason: string
  /** Who filed it, when that was not the person it is about. */
  enteredByName: string | null
  status: string
  createdAt: string
}

/** Every calendar day a range covers, as ISO strings. */
function daysBetween(start: string, end: string): string[] {
  const out: string[] = []
  for (const d = new Date(`${start}T00:00:00`); d <= new Date(`${end}T00:00:00`); d.setDate(d.getDate() + 1)) {
    out.push(new Intl.DateTimeFormat('en-CA').format(d))
  }
  return out
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

  const [kind, setKind] = useState<RequestKind | 'all'>('all')
  const [status, setStatus] = useState<StatusFilter>('pending')
  const [query, setQuery] = useState('')

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
        dateLabel: fmtRange(r.start_date, r.end_date),
        detail: [r.leave_types?.name, r.day_part !== 'full' ? DAY_PART_LABEL[r.day_part] : null]
          .filter(Boolean)
          .join(' · '),
        reason: r.reason,
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
        dateLabel: fmtRange(r.start_date, r.end_date),
        detail: r.day_part !== 'full' ? DAY_PART_LABEL[r.day_part] : 'Full day',
        reason: r.reason,
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
        dateLabel: formatDate(r.date),
        detail: `${r.exception_type.replace(/_/g, ' ')} · ${r.requested_time}`,
        reason: r.reason,
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
        dateLabel: formatDate(r.date),
        detail: `${r.hours}h · ${r.start_time}–${r.end_time}`,
        reason: r.reason,
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
          // The person is what anyone searches a queue for; the reason and the
          // type are matched too so "sick" or "overtime" find something.
          matchesQuery(query, r.name, r.reason, r.detail, KIND_META[r.kind].label),
      ),
    [all, kind, status, query],
  )

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

  return (
    <div className="flex flex-col gap-4">
      {/* Says whose requests these are. Without it the screen reads as the whole
          company's queue to someone who is only ever shown their own, which is
          what made it look like everybody could see everybody. */}
      <p className="font-ui text-[12.5px] text-text-3">
        {canReview
          ? 'Every request you are able to decide on.'
          : 'Your requests. Only you and whoever reviews them can see these.'}
      </p>

      <div className="border border-border-default bg-surface-1">
        {/* One row: the tabs say which slice, everything after them narrows it.
            Search and the add action sit right, away from the filters, so the
            eye lands on the tabs first and on the queue immediately below. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border-subtle px-4 py-3">
          <Tabs
            variant="pill"
            size="sm"
            tabs={statusTabs}
            activeKey={status}
            onChange={(k) => { if (isStatusFilter(k)) setStatus(k) }}
            className="shrink-0"
          />
          {/* A reviewer's tool: it exists to work a queue down by kind. On your
              own handful of requests it filters almost nothing. */}
          {canReview && (
            <Select
              size="sm"
              value={kind}
              onChange={(v) => setKind(v === 'all' || isKind(v) ? v : 'all')}
              options={typeOptions}
              className="w-40 shrink-0"
            />
          )}
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <div className="relative w-full min-w-40 sm:w-52">
              <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-4" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={canReview ? 'Search people or reasons…' : 'Search your requests…'}
                aria-label="Search requests"
                className="w-full rounded-md border border-border-default bg-surface-inset py-1.5 pl-7 pr-3 font-ui text-[12.5px] text-text-1 outline-none placeholder:text-text-4 focus:border-border-focus"
              />
            </div>
            {canReview && (
              <Button size="sm" variant="secondary" iconLeft={<Plus size={14} />} onClick={() => setEntering(true)}>
                Add for someone else
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12 text-text-4">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : isError ? (
          <div className="px-4 py-12 text-center font-ui text-[13px] text-error">
            Could not load requests. Refresh to try again.
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-text-4">
            <Inbox size={20} />
            <span className="font-ui text-[13px]">
              {query.trim()
                ? `Nothing matches “${query.trim()}”.`
                : status === 'pending'
                  ? 'Nothing is waiting for a decision.'
                  : 'No requests match.'}
            </span>
          </div>
        ) : (
          visible.map((row) => {
            const meta = KIND_META[row.kind]
            const Icon = meta.icon
            const rowKey = `${row.kind}:${row.id}`
            const stripOpen = editingDays === rowKey
            return (
              <div
                key={rowKey}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 border-b border-border-subtle last:border-0"
              >
                {/* items-start, not centre: the reason wraps to as many lines as
                    it needs — a reason worth writing is worth reading — and the
                    avatar should stay level with the name, not float mid-block. */}
                <div className="flex min-w-56 flex-1 items-start gap-2.5">
                  <Avatar
                    name={row.name}
                    src={row.avatarUrl ?? undefined}
                    size="sm"
                    personId={row.profileId}
                  />
                  <div className="min-w-0">
                    <PersonLink
                      personId={row.profileId}
                      className="block truncate font-ui font-medium text-[13px] text-text-1"
                    >
                      {row.name}
                    </PersonLink>
                    <span className="block font-ui text-[11.5px]/snug text-text-4 wrap-break-word">
                      {row.reason}
                    </span>
                    {row.enteredByName && (
                      <span className="mt-0.5 block font-mono text-[10px] text-text-4">
                        Filed by {row.enteredByName}
                      </span>
                    )}
                  </div>
                </div>

                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border',
                    'text-[10.5px] font-ui font-semibold uppercase tracking-wider whitespace-nowrap',
                    meta.chip,
                  )}
                >
                  <Icon size={11} />
                  {meta.label}
                </span>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11.5px] text-text-2 tabular-nums">
                  <span className="text-text-1">{row.dateLabel}</span>
                  {row.detail && <span className="text-text-3">{row.detail}</span>}
                </div>

                {row.status === 'pending' && canReview ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={isReviewing}
                      onClick={() => review(row, 'approved')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm border border-success/30 bg-success/12 text-success text-[11.5px] font-ui font-semibold hover:bg-success/20 disabled:opacity-50"
                    >
                      <Check size={12} />
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={isReviewing}
                      onClick={() => review(row, 'rejected')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm border border-error/30 bg-error/10 text-error text-[11.5px] font-ui font-semibold hover:bg-error/20 disabled:opacity-50"
                    >
                      <X size={12} />
                      Reject
                    </button>
                  </div>
                ) : (
                  <span
                    className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-sm border',
                      'text-[10.5px] font-ui font-semibold uppercase tracking-wider whitespace-nowrap',
                      STATUS_PILL[row.status] ?? 'bg-surface-2 text-text-3 border-border-default',
                    )}
                  >
                    {row.status}
                  </span>
                )}

                {/* Only a multi-day, full-day leave or WFH range has days to take
                    out. Everything else is a single day, where rejecting the
                    request is the operation that applies. */}
                {canReview
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

                {stripOpen && (
                  <DayStrip
                    days={daysBetween(row.date, row.endDate)}
                    busy={removingDay}
                    onRemove={(day) => removeDay(row, day)}
                  />
                )}
              </div>
            )
          })
        )}
      </div>

      {entering && <EnterRequestForEmployeeModal onClose={() => setEntering(false)} />}
    </div>
  )
}
