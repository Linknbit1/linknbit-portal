import { useState } from 'react'
import { Users, Loader2 } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Avatar } from '../ui/Avatar'
import { Tabs } from '../ui/Tabs'
import { DatePicker } from '../ui/DatePicker'
import {
  useAllAttendance,
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
function Row({ name, avatar, children, status }: {
  name: string
  avatar: string | null
  children: React.ReactNode
  status: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3 border-b border-border-subtle last:border-0">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <Avatar name={name} src={avatar ?? undefined} size="sm" />
        <span className="font-ui font-medium text-[13px] text-text-1 truncate">{name}</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[12px] text-text-2 pl-[42px] sm:pl-0">
        {children}
      </div>
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

/**
 * Read-only view of the current team lead / PM's team: attendance for a chosen
 * date plus WFH, exceptions, overtime, and leave. All rows are scoped to the
 * viewer's team by RLS (p_attendance_team / p_*_team policies).
 */
export function TeamAttendancePanel() {
  const [section, setSection] = useState<Section>('attendance')
  const [date, setDate] = useState(localToday)

  const attendance = useAllAttendance(date)
  const wfh = useAllWfhRequests()
  const exceptions = useAllAttendanceExceptions()
  const overtime = useAllOvertimeRequests()
  const leave = useAllLeaveRequests()

  const tabs = [
    { key: 'attendance', label: 'Attendance' },
    { key: 'wfh', label: 'WFH', badge: wfh.data?.filter((r) => r.status === 'pending').length || undefined },
    { key: 'exceptions', label: 'Exceptions', badge: exceptions.data?.filter((r) => r.status === 'pending').length || undefined },
    { key: 'overtime', label: 'Overtime', badge: overtime.data?.filter((r) => r.status === 'pending').length || undefined },
    { key: 'leave', label: 'Leave', badge: leave.data?.filter((r) => r.status === 'pending').length || undefined },
  ]

  return (
    <section className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3.5 border-b border-border-subtle">
        <Users size={15} className="text-brand-red flex-shrink-0" />
        <h2 className="font-display font-bold text-[15px] text-text-1">My Team</h2>
        <span className="font-mono text-[10.5px] text-text-4 uppercase tracking-wider">Read-only</span>
        {section === 'attendance' && (
          <div className="ml-auto"><DatePicker value={date} onChange={setDate} className="w-[150px]" /></div>
        )}
      </div>

      <div className="px-4 pt-3">
        <Tabs tabs={tabs} activeKey={section} onChange={(k) => setSection(k as Section)} />
      </div>

      {/* Attendance */}
      {section === 'attendance' && (
        attendance.isLoading ? <Loading /> :
        (attendance.data ?? []).length === 0 ? <Empty label="No team attendance for this date." /> :
        <div>
          {attendance.data!.map((r) => (
            <Row key={r.id} name={r.profiles?.name ?? '—'} avatar={r.profiles?.avatar_url ?? null}
              status={<Pill status={r.status} map={ATTENDANCE_STATUS} />}>
              <span>In: <span className="text-text-1">{fmtTime(r.check_in)}</span></span>
              <span>Out: <span className="text-text-1">{fmtTime(r.check_out)}</span></span>
            </Row>
          ))}
        </div>
      )}

      {/* WFH */}
      {section === 'wfh' && (
        wfh.isLoading ? <Loading /> :
        (wfh.data ?? []).length === 0 ? <Empty label="No WFH requests from your team." /> :
        <div>
          {wfh.data!.map((r) => (
            <Row key={r.id} name={r.profiles?.name ?? '—'} avatar={r.profiles?.avatar_url ?? null}
              status={<Pill status={r.status} map={REQUEST_STATUS} />}>
              <span className="text-text-1">{r.date}</span>
              <span className="text-text-3 normal-case font-ui truncate max-w-[200px]">{r.reason}</span>
            </Row>
          ))}
        </div>
      )}

      {/* Exceptions */}
      {section === 'exceptions' && (
        exceptions.isLoading ? <Loading /> :
        (exceptions.data ?? []).length === 0 ? <Empty label="No exceptions from your team." /> :
        <div>
          {exceptions.data!.map((r) => (
            <Row key={r.id} name={r.profiles?.name ?? '—'} avatar={r.profiles?.avatar_url ?? null}
              status={<Pill status={r.status} map={REQUEST_STATUS} />}>
              <span className="text-text-1 capitalize">{r.exception_type.replace(/_/g, ' ')}</span>
              <span>{r.date} · {r.requested_time}</span>
            </Row>
          ))}
        </div>
      )}

      {/* Overtime */}
      {section === 'overtime' && (
        overtime.isLoading ? <Loading /> :
        (overtime.data ?? []).length === 0 ? <Empty label="No overtime requests from your team." /> :
        <div>
          {overtime.data!.map((r) => (
            <Row key={r.id} name={r.profiles?.name ?? '—'} avatar={r.profiles?.avatar_url ?? null}
              status={<Pill status={r.status} map={REQUEST_STATUS} />}>
              <span className="text-text-1">{r.date}</span>
              <span>{r.start_time}–{r.end_time} · {r.hours}h</span>
            </Row>
          ))}
        </div>
      )}

      {/* Leave */}
      {section === 'leave' && (
        leave.isLoading ? <Loading /> :
        (leave.data ?? []).length === 0 ? <Empty label="No leave requests from your team." /> :
        <div>
          {leave.data!.map((r) => (
            <Row key={r.id} name={r.profiles?.name ?? '—'} avatar={r.profiles?.avatar_url ?? null}
              status={<Pill status={r.status} map={REQUEST_STATUS} />}>
              <span className="text-text-1">{r.leave_types?.name ?? 'Leave'}</span>
              <span>{r.start_date} → {r.end_date} · {r.days}d</span>
            </Row>
          ))}
        </div>
      )}
    </section>
  )
}
