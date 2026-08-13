import { useMemo, useState } from 'react'
import { Loader2, Home, Plane, AlertCircle, Hourglass, CalendarCheck } from 'lucide-react'
import { cn } from '../../lib/cn'
import { AttendanceChips } from './AttendanceChips'
import { Avatar } from '../ui/Avatar'
import { PersonLink } from './PersonLink'
import { Tabs } from '../ui/Tabs'
import { DatePicker } from '../ui/DatePicker'
import { PeriodStepper } from '../ui/PeriodStepper'
import { SectionToolbar } from '../ui/SectionToolbar'
import { MonthStepper } from './MonthFilter'
import { useMonthFilter } from '../../hooks/useMonthFilter'
import { formatDate } from '../../lib/utils'
import {
  useAllAttendance,
  useMonthlyAttendance,
  useAllWfhRequests,
  useAllAttendanceExceptions,
  useAllOvertimeRequests,
  useAllLeaveRequests,
} from '../../hooks/useAttendance'

type Section = 'attendance' | 'wfh' | 'exceptions' | 'overtime' | 'leave'

/**
 * Restricts a list to one team. RLS already scopes a lead to the people they
 * share a team with; this narrows further to a SPECIFIC team, which matters for
 * PMs and admins who can see several.
 */
export interface TeamScope {
  memberIds?: ReadonlySet<string>
}

function inScope(scope: TeamScope, profileId: string | null | undefined): boolean {
  if (!scope.memberIds) return true
  return !!profileId && scope.memberIds.has(profileId)
}

function localToday(): string {
  return new Intl.DateTimeFormat('en-CA').format(new Date())
}

const fmtTime = (ts: string | null): string =>
  ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'

const monthLabel = (year: number, month: number): string =>
  new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

/** "12 Mar 2026" — dates were previously printed as raw ISO strings. */
const fmtDay = (date: string | null): string => (date ? formatDate(date) : '—')

/** "12 Mar → 15 Mar 2026", collapsing a single-day range. */
const fmtRange = (start: string, end: string): string =>
  start === end ? formatDate(start) : `${formatDate(start)} → ${formatDate(end)}`

// ── Status pills ───────────────────────────────────────────────────────────────────
const REQUEST_STATUS: Record<string, string> = {
  pending:  'bg-warning/12 text-warning border-warning/30',
  approved: 'bg-success/12 text-success border-success/30',
  rejected: 'bg-error/10 text-error border-error/30',
}

function Pill({ status, map }: { status: string; map: Record<string, string> }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full border text-[10.5px] font-ui font-semibold uppercase tracking-wider whitespace-nowrap',
      map[status] ?? 'bg-surface-2 text-text-3 border-border-default',
    )}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

// Row shell: avatar + name on the left, meta + status on the right (wraps on mobile).
// Both the avatar and the name link to the member's profile.
function Row({ name, avatar, personId, children, status }: {
  name: string
  avatar: string | null
  personId?: string | null
  children?: React.ReactNode
  status: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3 border-b border-border-subtle last:border-0">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <Avatar name={name} src={avatar ?? undefined} size="sm" personId={personId} />
        <PersonLink personId={personId} className="font-ui font-medium text-[13px] text-text-1 truncate">{name}</PersonLink>
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[12px] text-text-2 pl-10.5 sm:pl-0">
          {children}
        </div>
      )}
      {status}
    </div>
  )
}

function Empty({ label }: { label: string }) {
  return <div className="px-4 py-10 text-center font-ui text-[13px] text-text-4">{label}</div>
}

function Loading() {
  return <div className="flex justify-center py-10 text-text-4"><Loader2 size={18} className="animate-spin" /></div>
}

// Segmented Day / Month switch for the roster.
function ModeSwitch({ mode, onChange }: { mode: 'day' | 'month'; onChange: (m: 'day' | 'month') => void }) {
  return (
    <div className="inline-flex rounded-md border border-border-default bg-surface-inset p-0.5">
      {(['day', 'month'] as const).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={cn(
            'px-3 py-1 rounded-sm text-[12px] font-ui font-semibold capitalize transition-colors',
            mode === m ? 'bg-brand-red/15 text-brand-red' : 'text-text-3 hover:text-text-1',
          )}
        >
          {m}
        </button>
      ))}
    </div>
  )
}

// ── Today's Roster (Day = per-member status; Month = per-member tallies) ─────────────

interface MemberTally {
  profileId: string
  name: string
  avatar: string | null
  present: number
  late: number
  wfh: number
  leave: number
  absent: number
}

/**
 * Team roster. In Day mode each member shows their check-in/out + status for the
 * chosen date (who's in office / on leave / WFH today). In Month mode each member
 * shows their attendance tallies for the selected month. RLS scopes rows to the
 * viewer's team; `memberIds` narrows to one specific team.
 */
export function TeamRoster({ memberIds }: TeamScope = {}) {
  const now = new Date()
  const [mode, setMode] = useState<'day' | 'month'>('day')
  const [date, setDate] = useState(localToday)
  const [ym, setYm] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 })

  const dayQ = useAllAttendance(date)
  const monthQ = useMonthlyAttendance(ym.year, ym.month)
  const scope = { memberIds }

  const stepMonth = (delta: number) => setYm(({ year, month }) => {
    const d = new Date(year, month - 1 + delta, 1)
    return { year: d.getFullYear(), month: d.getMonth() + 1 }
  })

  const dayRows = (dayQ.data ?? []).filter((r) => inScope(scope, r.profile_id))

  const tallies = useMemo<MemberTally[]>(() => {
    const byMember = new Map<string, MemberTally>()
    for (const r of monthQ.data ?? []) {
      if (!inScope({ memberIds }, r.profile_id)) continue
      const id = r.profile_id
      const t = byMember.get(id) ?? {
        profileId: id, name: r.profiles?.name ?? '—', avatar: r.profiles?.avatar_url ?? null,
        present: 0, late: 0, wfh: 0, leave: 0, absent: 0,
      }
      // A worked half day is half an attendance and half a leave, so it counts
      // 0.5 to each rather than a whole day to both.
      const isLeave = r.day_type === 'leave'
      const isHalf = isLeave && r.day_part !== 'full'
      if (isHalf) t.leave += 0.5
      else if (isLeave) t.leave += 1
      else if (r.day_type === 'wfh') t.wfh += 1

      const w = isHalf ? 0.5 : 1
      if (r.status === 'present') t.present += w
      else if (r.status === 'late') t.late += w
      else if (r.status === 'absent') t.absent += w
      byMember.set(id, t)
    }
    return [...byMember.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [monthQ.data, memberIds])

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <ModeSwitch mode={mode} onChange={setMode} />
        <div className="ml-auto">
          {mode === 'day' ? (
            <DatePicker value={date} onChange={setDate} className="w-37.5" />
          ) : (
            <PeriodStepper
              label={monthLabel(ym.year, ym.month)}
              onPrev={() => stepMonth(-1)}
              onNext={() => stepMonth(1)}
            />
          )}
        </div>
      </div>

      {mode === 'day' ? (
        dayQ.isLoading ? <Loading /> :
        dayRows.length === 0 ? <Empty label="No team attendance for this date." /> :
        <div>
          {dayRows.map((r) => (
            <Row key={r.id} name={r.profiles?.name ?? '—'} avatar={r.profiles?.avatar_url ?? null} personId={r.profile_id}
              status={<AttendanceChips facts={r} />}>
              <span>In: <span className="text-text-1">{fmtTime(r.check_in)}</span></span>
            </Row>
          ))}
        </div>
      ) : (
        monthQ.isLoading ? <Loading /> :
        tallies.length === 0 ? <Empty label="No team attendance this month." /> :
        <div>
          {tallies.map((t) => (
            <Row key={t.profileId} name={t.name} avatar={t.avatar} personId={t.profileId}
              status={<span className="font-mono text-[11px] text-success font-semibold">{t.present + t.late}<span className="text-text-4"> days in</span></span>}>
              <span>Present <span className="text-success">{t.present}</span></span>
              <span>Late <span className="text-warning">{t.late}</span></span>
              <span>WFH <span className="text-service-dev">{t.wfh}</span></span>
              <span>Leave <span className="text-service-design">{t.leave}</span></span>
              <span>Absent <span className="text-error">{t.absent}</span></span>
            </Row>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Request lists (cardless content; parent provides the card) ───────────────────────
// Each carries its own month stepper, since a team's requests pile up over time and
// "everything ever" is rarely the question being asked.

export function TeamWfhList({ memberIds }: TeamScope = {}) {
  const filter = useMonthFilter()
  const wfh = useAllWfhRequests()
  const rows = (wfh.data ?? []).filter((r) => inScope({ memberIds }, r.profile_id) && filter.inMonth(r.date))

  return (
    <div>
      <SectionToolbar icon={Home} title="WFH requests" badge={rows.filter((r) => r.status === 'pending').length}>
        <MonthStepper filter={filter} />
      </SectionToolbar>
      {wfh.isLoading ? <Loading /> : rows.length === 0 ? <Empty label={`No WFH requests in ${filter.label}.`} /> : (
        <div>
          {rows.map((r) => (
            <Row key={r.id} name={r.profiles?.name ?? '—'} avatar={r.profiles?.avatar_url ?? null} personId={r.profile_id}
              status={<Pill status={r.status} map={REQUEST_STATUS} />}>
              <span className="text-text-1">{fmtDay(r.date)}</span>
              <span className="text-text-3 normal-case font-ui truncate max-w-50">{r.reason}</span>
            </Row>
          ))}
        </div>
      )}
    </div>
  )
}

export function TeamExceptionsList({ memberIds }: TeamScope = {}) {
  const filter = useMonthFilter()
  const exceptions = useAllAttendanceExceptions()
  const rows = (exceptions.data ?? []).filter((r) => inScope({ memberIds }, r.profile_id) && filter.inMonth(r.date))

  return (
    <div>
      <SectionToolbar icon={AlertCircle} title="Exceptions" badge={rows.filter((r) => r.status === 'pending').length}>
        <MonthStepper filter={filter} />
      </SectionToolbar>
      {exceptions.isLoading ? <Loading /> : rows.length === 0 ? <Empty label={`No exceptions in ${filter.label}.`} /> : (
        <div>
          {rows.map((r) => (
            <Row key={r.id} name={r.profiles?.name ?? '—'} avatar={r.profiles?.avatar_url ?? null} personId={r.profile_id}
              status={<Pill status={r.status} map={REQUEST_STATUS} />}>
              <span className="text-text-1 capitalize">{r.exception_type.replace(/_/g, ' ')}</span>
              <span>{fmtDay(r.date)} · {r.requested_time}</span>
            </Row>
          ))}
        </div>
      )}
    </div>
  )
}

export function TeamOvertimeList({ memberIds }: TeamScope = {}) {
  const filter = useMonthFilter()
  const overtime = useAllOvertimeRequests()
  const rows = (overtime.data ?? []).filter((r) => inScope({ memberIds }, r.profile_id) && filter.inMonth(r.date))

  return (
    <div>
      <SectionToolbar icon={Hourglass} title="Overtime" badge={rows.filter((r) => r.status === 'pending').length}>
        <MonthStepper filter={filter} />
      </SectionToolbar>
      {overtime.isLoading ? <Loading /> : rows.length === 0 ? <Empty label={`No overtime requests in ${filter.label}.`} /> : (
        <div>
          {rows.map((r) => (
            <Row key={r.id} name={r.profiles?.name ?? '—'} avatar={r.profiles?.avatar_url ?? null} personId={r.profile_id}
              status={<Pill status={r.status} map={REQUEST_STATUS} />}>
              <span className="text-text-1">{fmtDay(r.date)}</span>
              <span>{r.start_time}–{r.end_time} · {r.hours}h</span>
            </Row>
          ))}
        </div>
      )}
    </div>
  )
}

export function TeamLeaveList({ memberIds }: TeamScope = {}) {
  const filter = useMonthFilter()
  const leave = useAllLeaveRequests()
  // A leave spanning a month boundary belongs to both months.
  const rows = (leave.data ?? []).filter((r) =>
    inScope({ memberIds }, r.profile_id) && (filter.inMonth(r.start_date) || filter.inMonth(r.end_date)))

  return (
    <div>
      <SectionToolbar icon={Plane} title="Leave" badge={rows.filter((r) => r.status === 'pending').length}>
        <MonthStepper filter={filter} />
      </SectionToolbar>
      {leave.isLoading ? <Loading /> : rows.length === 0 ? <Empty label={`No leave requests in ${filter.label}.`} /> : (
        <div>
          {rows.map((r) => (
            <Row key={r.id} name={r.profiles?.name ?? '—'} avatar={r.profiles?.avatar_url ?? null} personId={r.profile_id}
              status={<Pill status={r.status} map={REQUEST_STATUS} />}>
              <span className="text-text-1">{r.leave_types?.name ?? 'Leave'}</span>
              <span>{fmtRange(r.start_date, r.end_date)} · {r.days}d</span>
            </Row>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Desktop team view: tabbed roster + request lists in a single card. Mobile uses the
 * exported pieces above as individual stack screens (see AttendanceMobile), and the
 * team page passes `memberIds` to pin it to one team.
 */
export function TeamAttendancePanel({ memberIds, title = 'My Team' }: TeamScope & { title?: string }) {
  const [section, setSection] = useState<Section>('attendance')
  const scope = { memberIds }

  const wfh = useAllWfhRequests()
  const exceptions = useAllAttendanceExceptions()
  const overtime = useAllOvertimeRequests()
  const leave = useAllLeaveRequests()

  const pending = (rows: { status: string; profile_id: string }[] | undefined) =>
    (rows ?? []).filter((r) => r.status === 'pending' && inScope(scope, r.profile_id)).length || undefined

  const tabs = [
    { key: 'attendance', label: 'Roster' },
    { key: 'wfh', label: 'WFH', badge: pending(wfh.data) },
    { key: 'exceptions', label: 'Exceptions', badge: pending(exceptions.data) },
    { key: 'overtime', label: 'Overtime', badge: pending(overtime.data) },
    { key: 'leave', label: 'Leave', badge: pending(leave.data) },
  ]

  return (
    <section className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3.5 border-b border-border-subtle">
        <CalendarCheck size={15} className="text-brand-red shrink-0" />
        <h2 className="font-display font-bold text-[15px] text-text-1">{title}</h2>
        <span className="font-mono text-[10.5px] text-text-4 uppercase tracking-wider">Read-only</span>
      </div>

      <div className="px-4 pt-3">
        <Tabs tabs={tabs} activeKey={section} onChange={(k) => setSection(k as Section)} />
      </div>

      {section === 'attendance' && <TeamRoster memberIds={memberIds} />}
      {section === 'wfh' && <TeamWfhList memberIds={memberIds} />}
      {section === 'exceptions' && <TeamExceptionsList memberIds={memberIds} />}
      {section === 'overtime' && <TeamOvertimeList memberIds={memberIds} />}
      {section === 'leave' && <TeamLeaveList memberIds={memberIds} />}
    </section>
  )
}
