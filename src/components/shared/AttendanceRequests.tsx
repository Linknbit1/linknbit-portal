import { useMemo, useState } from 'react'
import { Loader2, Home, Plane, AlertCircle, Hourglass, Check, X, Inbox } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Avatar } from '../ui/Avatar'
import { PersonLink } from './PersonLink'
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
}

const KIND_META: Record<RequestKind, KindMeta> = {
  leave: {
    label: 'Leave',
    icon: Plane,
    chip: 'bg-service-design/12 text-service-design border-service-design/30',
  },
  wfh: {
    label: 'WFH',
    icon: Home,
    chip: 'bg-service-dev/12 text-service-dev border-service-dev/30',
  },
  exception: {
    label: 'Exception',
    icon: AlertCircle,
    chip: 'bg-warning/12 text-warning border-warning/30',
  },
  overtime: {
    label: 'Overtime',
    icon: Hourglass,
    chip: 'bg-service-mkt/12 text-service-mkt border-service-mkt/30',
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
  /** First day the request affects — the sort key. */
  date: string
  dateLabel: string
  /** The one line that distinguishes this request from another of the same kind. */
  detail: string
  reason: string
  status: string
  createdAt: string
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

function FilterChip({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  count?: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-[12px] font-ui font-semibold transition-colors',
        active
          ? 'bg-brand-red/15 text-brand-red border-brand-red/30'
          : 'bg-surface-1 text-text-3 border-border-default hover:text-text-1',
      )}
    >
      {children}
      {count != null && count > 0 && (
        <span className="font-mono text-[10.5px] tabular-nums opacity-80">{count}</span>
      )}
    </button>
  )
}

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

  // Fetch unfiltered and narrow in memory: the counts on the type chips have to
  // reflect the whole queue, not the slice currently on screen.
  const leaveQ = useAllLeaveRequests()
  const wfhQ = useAllWfhRequests()
  const excQ = useAllAttendanceExceptions()
  const otQ = useAllOvertimeRequests()

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
        name: r.profiles?.name ?? '—',
        avatarUrl: r.profiles?.avatar_url ?? null,
        date: r.start_date,
        dateLabel: fmtRange(r.start_date, r.end_date),
        detail: [r.leave_types?.name, r.day_part !== 'full' ? DAY_PART_LABEL[r.day_part] : null]
          .filter(Boolean)
          .join(' · '),
        reason: r.reason,
        status: r.status,
        createdAt: r.created_at,
      })
    }

    for (const r of wfhQ.data ?? []) {
      rows.push({
        id: r.id,
        kind: 'wfh',
        profileId: r.profile_id,
        name: r.profiles?.name ?? '—',
        avatarUrl: r.profiles?.avatar_url ?? null,
        date: r.start_date,
        dateLabel: fmtRange(r.start_date, r.end_date),
        detail: r.day_part !== 'full' ? DAY_PART_LABEL[r.day_part] : 'Full day',
        reason: r.reason,
        status: r.status,
        createdAt: r.created_at,
      })
    }

    for (const r of excQ.data ?? []) {
      rows.push({
        id: r.id,
        kind: 'exception',
        profileId: r.profile_id,
        name: r.profiles?.name ?? '—',
        avatarUrl: r.profiles?.avatar_url ?? null,
        date: r.date,
        dateLabel: formatDate(r.date),
        detail: `${r.exception_type.replace(/_/g, ' ')} · ${r.requested_time}`,
        reason: r.reason,
        status: r.status,
        createdAt: r.created_at,
      })
    }

    for (const r of otQ.data ?? []) {
      rows.push({
        id: r.id,
        kind: 'overtime',
        profileId: r.profile_id,
        name: r.profiles?.name ?? '—',
        avatarUrl: r.profiles?.avatar_url ?? null,
        date: r.date,
        dateLabel: formatDate(r.date),
        detail: `${r.hours}h · ${r.start_time}–${r.end_time}`,
        reason: r.reason,
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
        (r) => (kind === 'all' || r.kind === kind) && (status === 'all' || r.status === status),
      ),
    [all, kind, status],
  )

  const totalPending = all.filter((r) => r.status === 'pending').length

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
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip active={kind === 'all'} onClick={() => setKind('all')} count={totalPending}>
            All types
          </FilterChip>
          {KIND_ORDER.map((k) => {
            const meta = KIND_META[k]
            const Icon = meta.icon
            return (
              <FilterChip
                key={k}
                active={kind === k}
                onClick={() => setKind(k)}
                count={pendingByKind[k]}
              >
                <Icon size={12} />
                {meta.label}
              </FilterChip>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((f) => (
            <FilterChip key={f.id} active={status === f.id} onClick={() => setStatus(f.id)}>
              {f.label}
            </FilterChip>
          ))}
        </div>
      </div>

      <div className="border border-border-default bg-surface-1">
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
              {status === 'pending' ? 'Nothing is waiting for a decision.' : 'No requests match.'}
            </span>
          </div>
        ) : (
          visible.map((row) => {
            const meta = KIND_META[row.kind]
            const Icon = meta.icon
            return (
              <div
                key={`${row.kind}:${row.id}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 border-b border-border-subtle last:border-0"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <Avatar
                    name={row.name}
                    src={row.avatarUrl ?? undefined}
                    size="sm"
                    personId={row.profileId}
                  />
                  <div className="min-w-0">
                    <PersonLink
                      personId={row.profileId}
                      className="block font-ui font-medium text-[13px] text-text-1 truncate"
                    >
                      {row.name}
                    </PersonLink>
                    <span className="block font-ui text-[11.5px] text-text-4 truncate">
                      {row.reason}
                    </span>
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
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
