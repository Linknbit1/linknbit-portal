import { useMemo, useState } from 'react'
import { Users, Loader2 } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Avatar } from '../ui/Avatar'
import { PersonLink } from './PersonLink'
import { Tabs } from '../ui/Tabs'
import { DatePicker } from '../ui/DatePicker'
import { PeriodStepper } from '../ui/PeriodStepper'
import {
  useAllAttendance,
  useMonthlyAttendance,
  useAllWfhRequests,
  useAllAttendanceExceptions,
  useAllOvertimeRequests,
  useAllLeaveRequests,
} from '../../hooks/useAttendance'

type Section = 'attendance' | 'wfh' | 'exceptions' | 'overtime' | 'leave'

function localToday(): string {
  return new Intl.DateTimeFormat('en-CA').format(new Date())
}

const fmtTime = (ts: string | null): string =>
  ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'

const monthLabel = (year: number, month: number): string =>
  new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

// ── Status pills ───────────────────────────────────────────────────────────────────
const REQUEST_STATUS: Record<string, string> = {
  pending:  'bg-warning/12 text-warning border-warning/30',
  approved: 'bg-success/12 text-success border-success/30',
  rejected: 'bg-error/10 text-error border-error/30',
}
const ATTENDANCE_STATUS: Record<string, string> = {
  present:   'bg-success/12 text-success border-success/30',
  late:      'bg-warning/12 text-warning border-warning/30',
  absent:    'bg-error/10 text-error border-error/30',
  leave:     'bg-service-design/12 text-service-design border-service-design/30',
  wfh:       'bg-service-dev/12 text-service-dev border-service-dev/30',
  holiday:   'bg-surface-3 text-text-3 border-border-default',
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
 * viewer's team.
 */
export function TeamRoster() {
  const now = new Date()
  const [mode, setMode] = useState<'day' | 'month'>('day')
  const [date, setDate] = useState(localToday)
  const [ym, setYm] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 })

  const dayQ = useAllAttendance(date)
  const monthQ = useMonthlyAttendance(ym.year, ym.month)

  const stepMonth = (delta: number) => setYm(({ year, month }) => {
    const d = new Date(year, month - 1 + delta, 1)
    return { year: d.getFullYear(), month: d.getMonth() + 1 }
  })

  const tallies = useMemo<MemberTally[]>(() => {
    const byMember = new Map<string, MemberTally>()
    for (const r of monthQ.data ?? []) {
      const id = r.profile_id
      const t = byMember.get(id) ?? {
        profileId: id, name: r.profiles?.name ?? '—', avatar: r.profiles?.avatar_url ?? null,
        present: 0, late: 0, wfh: 0, leave: 0, absent: 0,
      }
      if (r.status === 'present') t.present += 1
      else if (r.status === 'late') t.late += 1
      else if (r.status === 'wfh') t.wfh += 1
      else if (r.status === 'leave') t.leave += 1
      else if (r.status === 'absent') t.absent += 1
      byMember.set(id, t)
    }
    return [...byMember.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [monthQ.data])

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
        (dayQ.data ?? []).length === 0 ? <Empty label="No team attendance for this date." /> :
        <div>
          {dayQ.data!.map((r) => (
            <Row key={r.id} name={r.profiles?.name ?? '—'} avatar={r.profiles?.avatar_url ?? null} personId={r.profile_id}
              status={<Pill status={r.status} map={ATTENDANCE_STATUS} />}>
              <span>In: <span className="text-text-1">{fmtTime(r.check_in)}</span></span>
              <span>Out: <span className="text-text-1">{fmtTime(r.check_out)}</span></span>
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

export function TeamWfhList() {
  const wfh = useAllWfhRequests()
  if (wfh.isLoading) return <Loading />
  if ((wfh.data ?? []).length === 0) return <Empty label="No WFH requests from your team." />
  return (
    <div>
      {wfh.data!.map((r) => (
        <Row key={r.id} name={r.profiles?.name ?? '—'} avatar={r.profiles?.avatar_url ?? null}
          status={<Pill status={r.status} map={REQUEST_STATUS} />}>
          <span className="text-text-1">{r.date}</span>
          <span className="text-text-3 normal-case font-ui truncate max-w-50">{r.reason}</span>
        </Row>
      ))}
    </div>
  )
}

export function TeamExceptionsList() {
  const exceptions = useAllAttendanceExceptions()
  if (exceptions.isLoading) return <Loading />
  if ((exceptions.data ?? []).length === 0) return <Empty label="No exceptions from your team." />
  return (
    <div>
      {exceptions.data!.map((r) => (
        <Row key={r.id} name={r.profiles?.name ?? '—'} avatar={r.profiles?.avatar_url ?? null}
          status={<Pill status={r.status} map={REQUEST_STATUS} />}>
          <span className="text-text-1 capitalize">{r.exception_type.replace(/_/g, ' ')}</span>
          <span>{r.date} · {r.requested_time}</span>
        </Row>
      ))}
    </div>
  )
}

export function TeamOvertimeList() {
  const overtime = useAllOvertimeRequests()
  if (overtime.isLoading) return <Loading />
  if ((overtime.data ?? []).length === 0) return <Empty label="No overtime requests from your team." />
  return (
    <div>
      {overtime.data!.map((r) => (
        <Row key={r.id} name={r.profiles?.name ?? '—'} avatar={r.profiles?.avatar_url ?? null}
          status={<Pill status={r.status} map={REQUEST_STATUS} />}>
          <span className="text-text-1">{r.date}</span>
          <span>{r.start_time}–{r.end_time} · {r.hours}h</span>
        </Row>
      ))}
    </div>
  )
}

export function TeamLeaveList() {
  const leave = useAllLeaveRequests()
  if (leave.isLoading) return <Loading />
  if ((leave.data ?? []).length === 0) return <Empty label="No leave requests from your team." />
  return (
    <div>
      {leave.data!.map((r) => (
        <Row key={r.id} name={r.profiles?.name ?? '—'} avatar={r.profiles?.avatar_url ?? null}
          status={<Pill status={r.status} map={REQUEST_STATUS} />}>
          <span className="text-text-1">{r.leave_types?.name ?? 'Leave'}</span>
          <span>{r.start_date} → {r.end_date} · {r.days}d</span>
        </Row>
      ))}
    </div>
  )
}

/**
 * Desktop team view: tabbed roster + request lists in a single card. Mobile uses the
 * exported pieces above as individual stack screens (see AttendanceMobile).
 */
export function TeamAttendancePanel() {
  const [section, setSection] = useState<Section>('attendance')

  const wfh = useAllWfhRequests()
  const exceptions = useAllAttendanceExceptions()
  const overtime = useAllOvertimeRequests()
  const leave = useAllLeaveRequests()

  const tabs = [
    { key: 'attendance', label: 'Roster' },
    { key: 'wfh', label: 'WFH', badge: wfh.data?.filter((r) => r.status === 'pending').length || undefined },
    { key: 'exceptions', label: 'Exceptions', badge: exceptions.data?.filter((r) => r.status === 'pending').length || undefined },
    { key: 'overtime', label: 'Overtime', badge: overtime.data?.filter((r) => r.status === 'pending').length || undefined },
    { key: 'leave', label: 'Leave', badge: leave.data?.filter((r) => r.status === 'pending').length || undefined },
  ]

  return (
    <section className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3.5 border-b border-border-subtle">
        <Users size={15} className="text-brand-red shrink-0" />
        <h2 className="font-display font-bold text-[15px] text-text-1">My Team</h2>
        <span className="font-mono text-[10.5px] text-text-4 uppercase tracking-wider">Read-only</span>
      </div>

      <div className="px-4 pt-3">
        <Tabs tabs={tabs} activeKey={section} onChange={(k) => setSection(k as Section)} />
      </div>

      {section === 'attendance' && <TeamRoster />}
      {section === 'wfh' && <TeamWfhList />}
      {section === 'exceptions' && <TeamExceptionsList />}
      {section === 'overtime' && <TeamOvertimeList />}
      {section === 'leave' && <TeamLeaveList />}
    </section>
  )
}
