import { useState } from 'react'
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Home,
  LogIn,
  LogOut,
  MapPin,
  Plus,
  X,
  Check,
  ClipboardList,
  Hourglass,
  Palmtree,
  Calendar,
  Plane,
  Pencil,
} from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { DatePicker } from '../../components/ui/DatePicker'
import { TimePicker } from '../../components/ui/TimePicker'
import { PeriodStepper } from '../../components/ui/PeriodStepper'
import {
  useMyMonthlyAttendance,
  useMyExceptions,
  useRequestException,
  useUpdateException,
  useOooDepart,
  useOooReturn,
  useMyOvertimeRequests,
  useSubmitOvertime,
  useUpdateOvertime,
  useAttendanceSettings,
  useHolidays,
  useWorkingSaturdays,
  useCompanyWfhDays,
  useMyWfhRequests,
  useSubmitWfh,
  useUpdateWfh,
  useMyLeaveRequests,
  useSubmitLeave,
  useUpdateLeave,
  useMyLeaveBalances,
} from '../../hooks/useAttendance'
import { AttendanceCheckInCard } from '../../components/shared/AttendanceCheckInCard'
import { MyDevicesCard } from '../../components/shared/MyDevicesCard'
import { TeamAttendancePanel } from '../../components/shared/TeamAttendancePanel'
import { useAuthContext } from '../../context/AuthContext'
import { useToast } from '../../components/ui/toast-context'
import { cn } from '../../lib/cn'
import { AttendanceChips } from '../../components/shared/AttendanceChips'
import type { AttendanceRow, AttendanceException, DayPart } from '../../api/attendance'
import { DAY_PART_LABEL, DAY_PART_OPTIONS, toDayPart } from '../../lib/dayParts'
import { formatDayRange as fmtDayRange } from '../../lib/dateGroups'
import { ModalShell } from '../../components/ui/ModalShell'
import { showsInlineTeamAttendance } from '../../lib/roles'

function localToday(): string {
  return new Intl.DateTimeFormat('en-CA').format(new Date())
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function calcHours(checkIn: string | null, checkOut: string | null, excludedMinutes = 0): string {
  if (!checkIn || !checkOut) return '—'
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime() - excludedMinutes * 60_000
  if (diff <= 0) return '0h 0m'
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  return `${h}h ${m}m`
}



// ── Upcoming schedule section ─────────────────────────────────────────────────

// The three kinds of scheduled day an employee needs to know about ahead of time.
const SCHEDULE_ITEM_META = {
  holiday:     { icon: Palmtree, label: 'Holiday', iconCls: 'text-text-3',      bg: 'bg-text-4/10',      pill: 'bg-text-4/10 text-text-3 border-border-default' },
  working_sat: { icon: Calendar, label: 'Working', iconCls: 'text-service-mkt', bg: 'bg-service-mkt/10', pill: 'bg-service-mkt/10 text-service-mkt border-service-mkt/25' },
  wfh:         { icon: Home,     label: 'WFH',     iconCls: 'text-service-dev', bg: 'bg-service-dev/10', pill: 'bg-service-dev/10 text-service-dev border-service-dev/25' },
} as const

export function UpcomingScheduleSection() {
  const now = new Date()
  const year = now.getFullYear()
  const todayStr = `${year}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() + 30)
  const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`

  const { data: holidays = [] }    = useHolidays(year)
  const { data: workingSats = [] } = useWorkingSaturdays(year)
  const { data: wfhDays = [] }     = useCompanyWfhDays(year)

  const inWindow = (d: string) => d > todayStr && d <= cutoffStr
  const upcomingHolidays = holidays.filter((h) => inWindow(h.date))
  const upcomingSats     = workingSats.filter((s) => inWindow(s.date))
  const upcomingWfh      = wfhDays.filter((w) => inWindow(w.date))

  const items = [
    ...upcomingHolidays.map((h) => ({ type: 'holiday'     as const, date: h.date, label: h.name })),
    ...upcomingSats.map((s)     => ({ type: 'working_sat' as const, date: s.date, label: s.note ?? 'Working Saturday' })),
    ...upcomingWfh.map((w)      => ({ type: 'wfh'         as const, date: w.date, label: w.reason })),
  ].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <Card padding="none">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border-subtle">
        <Calendar size={14} className="text-text-3" />
        <span className="font-ui font-semibold text-[13px] text-text-1">Upcoming Schedule</span>
        <span className="font-mono text-[11px] text-text-4 ml-1">Next 30 days</span>
      </div>
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
          <div className="size-11 rounded-full bg-surface-2 flex items-center justify-center">
            <Palmtree size={18} className="text-text-3" />
          </div>
          <p className="font-ui font-semibold text-[13px] text-text-1">No upcoming holidays</p>
          <p className="font-ui text-[12px] text-text-3 max-w-60">
            There are no holidays or schedule changes in the next 30 days.
          </p>
        </div>
      ) : (
      <div className="divide-y divide-border-subtle">
        {items.map((item) => {
          const d = new Date(item.date + 'T00:00:00')
          const dateLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
          const meta = SCHEDULE_ITEM_META[item.type]
          const Icon = meta.icon
          return (
            <div key={item.date + item.type} className="flex items-center gap-3 px-5 py-3">
              <div className={cn('size-7 rounded-sm flex items-center justify-center shrink-0', meta.bg)}>
                <Icon size={14} className={meta.iconCls} />
              </div>
              <p className="flex-1 font-ui font-medium text-[13px] text-text-1 truncate">{item.label}</p>
              <span className="font-mono text-[11.5px] text-text-3 shrink-0">{dateLabel}</span>
              <span className={cn('text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border shrink-0', meta.pill)}>
                {meta.label}
              </span>
            </div>
          )
        })}
      </div>
      )}
    </Card>
  )
}

// ── Summary stats ─────────────────────────────────────────────────────────────

export function SummaryStats({ records, year, month }: { records: AttendanceRow[]; year: number; month: number }) {
  const now  = new Date()

  const { data: settings }         = useAttendanceSettings()
  const { data: holidays = [] }    = useHolidays(year)
  const { data: workingSats = [] } = useWorkingSaturdays(year)

  // Absent = persisted 'absent' rows (marked by the daily job) + any past working
  // day in the selected month that has no record yet (not covered by the job). The
  // two are mutually exclusive: a marked day already has a record, so the gap pass
  // skips it. For the current month we only count elapsed days (up to now); for a
  // fully past month the whole month counts; a future month has no gap days.
  const absent = (() => {
    const holidaySet    = new Set(holidays.map((h) => h.date))
    const workingSatSet = new Set(workingSats.map((s) => s.date))
    const recordSet     = new Set(records.map((r) => r.date))
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1
    const isFuture = year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth() + 1)
    // Exclusive upper bound: now for the current month, first day of next month for a
    // past month (covers the whole month), and the month start itself for a future month.
    const endExclusive = isFuture
      ? new Date(year, month - 1, 1)
      : isCurrentMonth
        ? now
        : new Date(year, month, 1)
    let gapDays = 0
    const d = new Date(year, month - 1, 1)
    while (d < endExclusive) {
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const dow = d.getDay()
      if (dow !== 0 && !(dow === 6 && !settings?.saturday_working && !workingSatSet.has(dateStr)) && !holidaySet.has(dateStr)) {
        if (!recordSet.has(dateStr)) gapDays++
      }
      d.setDate(d.getDate() + 1)
    }
    const absentRecords = records.filter((r) => r.status === 'absent').length
    return absentRecords + gapDays
  })()

  const totalPresent = records.filter((r) => r.status === 'present').length
  const late         = records.filter((r) => r.status === 'late').length
  // Leave is a day kind now; a worked half day counts as half a leave day.
  const leave        = records.reduce((n, r) =>
    r.day_type === 'leave' ? n + (r.day_part === 'full' ? 1 : 0.5) : n, 0)

  const stats = [
    { label: 'Present', value: totalPresent, icon: CheckCircle2,  color: 'text-success',        bg: 'bg-success/10 border-success/20' },
    { label: 'Late',    value: late,         icon: Clock,          color: 'text-warning',        bg: 'bg-warning/10 border-warning/20' },
    { label: 'Absent',  value: absent,       icon: AlertTriangle,  color: 'text-error',          bg: 'bg-error/10 border-error/20' },
    { label: 'Leave',   value: leave,        icon: Home,           color: 'text-service-dev',    bg: 'bg-service-dev/10 border-service-dev/20' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(({ label, value, icon: Icon, color, bg }) => (
        <div key={label} className="bg-surface-1 border border-border-default rounded-xl p-4 flex flex-col gap-2">
          <div className={cn('size-9 rounded-lg border flex items-center justify-center', bg)}>
            <Icon size={16} className={color} />
          </div>
          <div>
            <p className={cn('font-display font-bold text-[28px] leading-none', color)}>{value}</p>
            <p className="font-ui text-[12px] text-text-3 mt-1">{label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── History table ─────────────────────────────────────────────────────────────

export function HistoryTable({ records, periodLabel }: { records: AttendanceRow[]; periodLabel: string }) {
  if (records.length === 0) {
    return (
      <Card className="py-12 text-center">
        <CalendarCheck size={32} className="mx-auto text-text-4 mb-3" />
        <p className="font-ui font-semibold text-text-2">No attendance records for {periodLabel}</p>
        <p className="font-ui text-caption text-text-4 mt-1">Your check-in history will appear here</p>
      </Card>
    )
  }

  return (
    <Card padding="none">
      <div className="px-5 py-4 border-b border-border-subtle">
        <h3 className="font-display font-semibold text-h4 text-text-1">{periodLabel}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full overflow-x-auto whitespace-nowrap lg:whitespace-normal">
          <thead>
            <tr className="border-b border-border-subtle">
              {['Date', 'Status', 'Check In', 'Hours', 'Source', 'Device'].map((h) => (
                <th key={h} className="px-5 py-3 text-left font-mono text-[10px] font-semibold text-text-4 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {records.map((row) => (
              <tr key={row.id} className="hover:bg-surface-2/40 transition-colors">
                <td className="px-5 py-3 font-mono text-[12px] text-text-2 whitespace-nowrap">
                  {formatDateLabel(row.date)}
                </td>
                <td className="px-5 py-3">
                  <AttendanceChips facts={row} />
                </td>
                <td className="px-5 py-3 font-mono text-[12px] text-text-2 whitespace-nowrap">
                  {formatTime(row.check_in)}
                </td>
                <td className="px-5 py-3 font-mono text-[12px] text-text-3 whitespace-nowrap">
                  {calcHours(row.check_in, row.check_out, row.excluded_minutes)}
                  {row.excluded_minutes > 0 && (
                    <span className="text-text-4 ml-1" title="Out-of-office time excluded">
                      (−{row.excluded_minutes}m OOO)
                    </span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <span className={cn(
                    'font-mono text-[10px] px-2 py-0.5 rounded-xs border',
                    row.source === 'self'
                      ? 'bg-service-dev/10 text-service-dev border-service-dev/25'
                      : 'bg-surface-2 text-text-4 border-border-default',
                  )}>
                    {row.source === 'self' ? 'Self' : 'Admin'}
                  </span>
                </td>
                <td className="px-5 py-3 font-mono text-[11px] text-text-4 max-w-40 truncate" title={row.device_name ?? ''}>
                  {row.device_name ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ── OOO active section ────────────────────────────────────────────────────────

export function OooSection() {
  const toast = useToast()
  const { data: myExceptions = [] } = useMyExceptions()
  const departMut = useOooDepart()
  const returnMut = useOooReturn()

  const todayStr = localToday()
  const todayOoo = myExceptions.find(
    (e) => e.exception_type === 'out_of_office' && e.status === 'approved' && e.date === todayStr
  )

  if (!todayOoo || !!todayOoo.actual_return) return null

  const handleDeparture = async () => {
    try {
      await departMut.mutateAsync()
      toast('Out of office logged — see you back soon!', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to log departure', 'error')
    }
  }

  const handleReturn = async () => {
    try {
      await returnMut.mutateAsync()
      toast('Welcome back! Return logged.', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to log return', 'error')
    }
  }

  return (
    <Card className="border-service-dev/30">
      <div className="flex items-center gap-4">
        <div className="size-10 rounded-lg bg-service-dev/10 border border-service-dev/20 flex items-center justify-center shrink-0">
          <MapPin size={18} className="text-service-dev" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-[14px] text-text-1">Out-of-Office Approved</p>
          <p className="font-ui text-[12px] text-text-3">
            {todayOoo.actual_departure
              ? `Departed at ${new Date(todayOoo.actual_departure).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} — tap "I'm Back" when you return`
              : 'Tap the button when you leave the office'}
          </p>
        </div>
        {!todayOoo.actual_departure ? (
          <Button size="sm" onClick={handleDeparture} disabled={departMut.isPending}>
            <LogOut size={14} /> I'm Heading Out
          </Button>
        ) : (
          <Button size="sm" variant="secondary" onClick={handleReturn} disabled={returnMut.isPending}>
            <LogIn size={14} /> I'm Back
          </Button>
        )}
      </div>
    </Card>
  )
}

// ── Request exception modal ───────────────────────────────────────────────────

type ExcType = 'late_arrival' | 'early_departure' | 'out_of_office'

const asExcType = (v: string | undefined): ExcType =>
  v === 'early_departure' || v === 'out_of_office' ? v : 'late_arrival'

interface RequestExceptionModalProps {
  editRow: AttendanceException | null
  onClose: () => void
}

// Mounted only while open (see MyExceptionsSection), so the initial state reads
// straight from `editRow` when editing a pending request.
function RequestExceptionModal({ editRow, onClose }: RequestExceptionModalProps) {
  const toast = useToast()
  const requestMut = useRequestException()
  const updateMut = useUpdateException()
  const saving = requestMut.isPending || updateMut.isPending
  const [excType, setExcType] = useState<ExcType>(asExcType(editRow?.exception_type))
  const [date, setDate] = useState(editRow?.date ?? localToday())
  const [requestedTime, setRequestedTime] = useState(editRow?.requested_time?.slice(0, 5) ?? '')
  const [returnTime, setReturnTime] = useState(editRow?.return_time?.slice(0, 5) ?? '')
  const [reason, setReason] = useState(editRow?.reason ?? '')

  const timeLabel: Record<typeof excType, string> = {
    late_arrival:    'Arrival Time',
    early_departure: 'Departure Time',
    out_of_office:   'Departure Time',
  }

  const todayStr = localToday()
  const now = new Date()
  const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const requestedTimeMin = date === todayStr ? currentTimeStr : undefined

  const handleSubmit = async () => {
    if (!requestedTime || !reason.trim()) return
    const payload = {
      exception_type: excType,
      date,
      requested_time: requestedTime,
      return_time: excType === 'out_of_office' && returnTime ? returnTime : undefined,
      reason: reason.trim(),
    }
    try {
      if (editRow) {
        await updateMut.mutateAsync({ id: editRow.id, payload })
        toast('Exception request updated', 'success')
      } else {
        await requestMut.mutateAsync(payload)
        toast('Exception request submitted — awaiting HR approval', 'success')
      }
      onClose()
    } catch {
      toast(editRow ? 'Failed to update request' : 'Failed to submit request', 'error')
    }
  }

  return (
    <ModalShell onClose={onClose} size="md" contentClassName="p-5 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-[16px] text-text-1">{editRow ? 'Edit Attendance Exception' : 'Request Attendance Exception'}</h3>
          <button onClick={onClose} className="text-text-4 hover:text-text-1 transition-colors"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Exception Type</label>
            <Select
              value={excType}
              onChange={(v) => setExcType(v as typeof excType)}
              options={[
                { value: 'late_arrival',    label: "Late Arrival — I'll arrive after the usual start time" },
                { value: 'early_departure', label: "Early Departure — I need to leave before end time" },
                { value: 'out_of_office',   label: "Out of Office — I'll step out and return same day" },
              ]}
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Date</label>
            <DatePicker
              value={date}
              onChange={(v) => { setDate(v); setRequestedTime(''); setReturnTime('') }}
              minDate={todayStr}
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">
              {timeLabel[excType]}
            </label>
            <TimePicker
              value={requestedTime}
              onChange={(v) => { setRequestedTime(v); setReturnTime('') }}
              minTime={requestedTimeMin}
              placeholder="Select time…"
            />
          </div>

          {excType === 'out_of_office' && (
            <div>
              <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">
                Expected Return Time{' '}
                <span className="normal-case font-ui text-text-4">(optional)</span>
              </label>
              <TimePicker
                value={returnTime}
                onChange={setReturnTime}
                minTime={requestedTime || requestedTimeMin}
                placeholder="Select return time…"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Brief explanation..."
              rows={3}
              className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-ui text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2.5 mt-5">
          <Button variant="ghost" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            className="flex-1"
            onClick={handleSubmit}
            disabled={!requestedTime || !reason.trim() || saving}
          >
            <Check size={14} /> {editRow ? 'Save' : 'Submit Request'}
          </Button>
        </div>
    </ModalShell>
  )
}

// ── My exceptions section ─────────────────────────────────────────────────────

const EXC_TYPE_LABELS: Record<string, string> = {
  late_arrival:    'Late Arrival',
  early_departure: 'Early Departure',
  out_of_office:   'Out of Office',
}

const EXC_STATUS_CLS: Record<string, string> = {
  pending:  'bg-warning/10 text-warning border-warning/25',
  approved: 'bg-success/10 text-success border-success/25',
  rejected: 'bg-error/10 text-error border-error/25',
}

export function MyExceptionsSection() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editRow, setEditRow] = useState<AttendanceException | null>(null)
  const { data: exceptions = [], isLoading } = useMyExceptions()

  const openCreate = () => { setEditRow(null); setModalOpen(true) }
  const openEdit = (exc: AttendanceException) => { setEditRow(exc); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditRow(null) }

  const fmtTimeStr = (t: string | null) => t ? t.slice(0, 5) : '—'
  const fmtDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-h4 text-text-1">Exception Requests</h2>
        <Button size="sm" onClick={openCreate}>
          <Plus size={13} /> Request Exception
        </Button>
      </div>

      {isLoading ? (
        <Card className="animate-pulse"><div className="h-16 bg-surface-2 rounded" /></Card>
      ) : exceptions.length === 0 ? (
        <Card className="py-8 text-center">
          <ClipboardList size={24} className="mx-auto text-text-4 mb-2" />
          <p className="font-ui text-[13px] text-text-3">No exception requests yet</p>
          <p className="font-ui text-caption text-text-4 mt-1">
            Use "Request Exception" to ask HR for late arrival, early departure, or a mid-day absence.
          </p>
        </Card>
      ) : (
        <Card padding="none">
          <div className="divide-y divide-border-subtle">
            {exceptions.slice(0, 8).map((exc) => (
              <div key={exc.id} className="flex items-start gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="font-ui font-medium text-[13px] text-text-1">
                      {EXC_TYPE_LABELS[exc.exception_type] ?? exc.exception_type}
                    </span>
                    <span className="font-mono text-[11px] text-text-4">{fmtDate(exc.date)}</span>
                    <span className="font-mono text-[11px] text-text-3">
                      {fmtTimeStr(exc.requested_time)}
                      {exc.return_time && ` → ${fmtTimeStr(exc.return_time)}`}
                    </span>
                  </div>
                  <p className="font-ui text-[12px] text-text-3 truncate">{exc.reason}</p>
                  {exc.review_note && (
                    <p className="font-ui text-[11px] text-error mt-0.5 italic">"{exc.review_note}"</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                  {exc.status === 'pending' && (
                    <button onClick={() => openEdit(exc)} title="Edit request" className="p-1 text-text-4 hover:text-text-1 transition-colors">
                      <Pencil size={13} />
                    </button>
                  )}
                  <span className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded-xs border text-[11px] font-mono font-semibold',
                    EXC_STATUS_CLS[exc.status] ?? EXC_STATUS_CLS['pending'],
                  )}>
                    {exc.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {modalOpen && <RequestExceptionModal editRow={editRow} onClose={closeModal} />}
    </div>
  )
}

// ── Overtime section ──────────────────────────────────────────────────────────

const OT_STATUS_CLS: Record<string, string> = {
  pending:  'bg-warning/10 text-warning border-warning/25',
  approved: 'bg-success/10 text-success border-success/25',
  rejected: 'bg-error/10 text-error border-error/25',
}

export function OvertimeSection() {
  const toast = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    date: localToday(),
    startTime: '',
    endTime: '',
    reason: '',
  })

  const { data: requests = [], isLoading } = useMyOvertimeRequests()
  const submitMut = useSubmitOvertime()
  const updateMut = useUpdateOvertime()
  const saving = submitMut.isPending || updateMut.isPending

  const computedHours = (() => {
    if (!form.startTime || !form.endTime) return 0
    const [sh, sm] = form.startTime.split(':').map(Number)
    const [eh, em] = form.endTime.split(':').map(Number)
    const diff = (eh * 60 + em) - (sh * 60 + sm)
    return diff > 0 ? parseFloat((diff / 60).toFixed(2)) : 0
  })()

  const openCreate = () => {
    setEditingId(null)
    setForm({ date: localToday(), startTime: '', endTime: '', reason: '' })
    setModalOpen(true)
  }
  const openEdit = (req: { id: string; date: string; start_time: string; end_time: string; reason: string }) => {
    setEditingId(req.id)
    setForm({ date: req.date, startTime: req.start_time.slice(0, 5), endTime: req.end_time.slice(0, 5), reason: req.reason })
    setModalOpen(true)
  }
  const closeModal = () => { setModalOpen(false); setEditingId(null) }

  const handleSubmit = async () => {
    if (!form.date || !form.startTime || !form.endTime || !form.reason.trim() || computedHours <= 0) return
    const payload = {
      date: form.date,
      start_time: form.startTime,
      end_time: form.endTime,
      hours: computedHours,
      reason: form.reason.trim(),
    }
    try {
      if (editingId) {
        await updateMut.mutateAsync({ id: editingId, payload })
        toast('Overtime request updated', 'success')
      } else {
        await submitMut.mutateAsync(payload)
        toast('Overtime request submitted — awaiting HR approval', 'success')
      }
      closeModal()
      setForm({ date: localToday(), startTime: '', endTime: '', reason: '' })
    } catch {
      toast(editingId ? 'Failed to update overtime request' : 'Failed to submit overtime request', 'error')
    }
  }

  const fmtDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const fmtT = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
  }

  const todayStr = localToday()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-h4 text-text-1">Overtime Requests</h2>
        <Button size="sm" onClick={openCreate}>
          <Plus size={13} /> Log Overtime
        </Button>
      </div>

      {isLoading ? (
        <Card className="animate-pulse"><div className="h-16 bg-surface-2 rounded" /></Card>
      ) : requests.length === 0 ? (
        <Card className="py-8 text-center">
          <Hourglass size={24} className="mx-auto text-text-4 mb-2" />
          <p className="font-ui text-[13px] text-text-3">No overtime requests yet</p>
          <p className="font-ui text-caption text-text-4 mt-1">
            Worked extra hours? Log it here and HR will review it.
          </p>
        </Card>
      ) : (
        <Card padding="none">
          <div className="divide-y divide-border-subtle">
            {requests.slice(0, 8).map((req) => (
              <div key={req.id} className="flex items-start gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="font-ui font-medium text-[13px] text-text-1">
                      {fmtDate(req.date)}
                    </span>
                    <span className="font-mono text-[11px] text-text-3">
                      {fmtT(req.start_time)} – {fmtT(req.end_time)}
                    </span>
                    <span className="font-display font-bold text-[13px] text-service-mkt">{req.hours}h</span>
                  </div>
                  <p className="font-ui text-[12px] text-text-3 truncate">{req.reason}</p>
                  {req.review_note && (
                    <p className="font-ui text-[11px] text-error mt-0.5 italic">"{req.review_note}"</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                  {req.status === 'pending' && (
                    <button onClick={() => openEdit(req)} title="Edit request" className="p-1 text-text-4 hover:text-text-1 transition-colors">
                      <Pencil size={13} />
                    </button>
                  )}
                  <span className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded-xs border text-[11px] font-mono font-semibold',
                    OT_STATUS_CLS[req.status] ?? OT_STATUS_CLS['pending'],
                  )}>
                    {req.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Submit / edit modal */}
      {modalOpen && (
        <ModalShell onClose={closeModal} size="md" contentClassName="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-[16px] text-text-1">{editingId ? 'Edit Overtime' : 'Log Overtime'}</h3>
              <button onClick={closeModal} className="text-text-4 hover:text-text-1"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Date</label>
                <DatePicker
                  value={form.date}
                  onChange={(v) => setForm((f) => ({ ...f, date: v, startTime: '', endTime: '' }))}
                  maxDate={todayStr}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Start Time</label>
                  <TimePicker
                    value={form.startTime}
                    onChange={(v) => setForm((f) => ({ ...f, startTime: v, endTime: '' }))}
                    placeholder="Start…"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">End Time</label>
                  <TimePicker
                    value={form.endTime}
                    onChange={(v) => setForm((f) => ({ ...f, endTime: v }))}
                    minTime={form.startTime || undefined}
                    placeholder="End…"
                  />
                </div>
              </div>
              {computedHours > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-service-mkt/8 border border-service-mkt/20 rounded-md">
                  <Hourglass size={13} className="text-service-mkt" />
                  <span className="font-mono text-[12px] text-service-mkt font-semibold">{computedHours}h overtime</span>
                </div>
              )}
              <div>
                <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Reason</label>
                <textarea
                  value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  placeholder="What work did you do during this time?"
                  rows={3}
                  className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-ui text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus resize-none"
                />
              </div>
            </div>
            <div className="flex gap-2.5 mt-5">
              <Button variant="ghost" size="sm" className="flex-1" onClick={closeModal}>Cancel</Button>
              <Button
                size="sm"
                className="flex-1"
                disabled={!form.date || !form.startTime || !form.endTime || !form.reason.trim() || computedHours <= 0 || saving}
                onClick={handleSubmit}
              >
                <Check size={14} /> {editingId ? 'Save' : 'Submit'}
              </Button>
            </div>
        </ModalShell>
      )}
    </div>
  )
}

// ── WFH section ───────────────────────────────────────────────────────────────

export function WfhSection() {
  const toast = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [dayPart, setDayPart] = useState<DayPart>('full')
  const [startDate, setStartDate] = useState(localToday)
  const [endDate, setEndDate] = useState(localToday)
  const [reason, setReason] = useState('')
  const { data: requests = [], isLoading } = useMyWfhRequests()
  const submitMut = useSubmitWfh()
  const updateMut = useUpdateWfh()
  const saving = submitMut.isPending || updateMut.isPending

  const isPartial = dayPart !== 'full'
  // Half the day is spent in the office, so a partial day cannot span days.
  const effectiveEnd = isPartial ? startDate : endDate
  const invalid = !reason.trim() || effectiveEnd < startDate

  const resetForm = () => {
    setReason(''); setDayPart('full')
    setStartDate(localToday()); setEndDate(localToday())
  }
  const openCreate = () => { setEditingId(null); resetForm(); setModalOpen(true) }
  const openEdit = (req: { id: string; start_date: string; end_date: string; day_part: string; reason: string }) => {
    setEditingId(req.id)
    setDayPart(toDayPart(req.day_part))
    setStartDate(req.start_date); setEndDate(req.end_date); setReason(req.reason)
    setModalOpen(true)
  }
  const closeModal = () => { setModalOpen(false); setEditingId(null) }

  const handleSubmit = async () => {
    if (invalid) return
    const payload = {
      start_date: startDate,
      end_date: effectiveEnd,
      reason: reason.trim(),
      day_part: dayPart,
    }
    try {
      if (editingId) {
        await updateMut.mutateAsync({ id: editingId, payload })
        toast('WFH request updated', 'success')
      } else {
        await submitMut.mutateAsync(payload)
        toast('WFH request submitted — awaiting approval', 'success')
      }
      closeModal(); resetForm()
    } catch {
      toast(editingId ? 'Failed to update WFH request' : 'Failed to submit WFH request', 'error')
    }
  }

  const todayStr = localToday()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-h4 text-text-1">Work From Home</h2>
        <Button size="sm" onClick={openCreate}>
          <Plus size={13} /> Request WFH
        </Button>
      </div>

      {isLoading ? (
        <Card className="animate-pulse"><div className="h-16 bg-surface-2 rounded" /></Card>
      ) : requests.length === 0 ? (
        <Card className="py-8 text-center">
          <Home size={24} className="mx-auto text-text-4 mb-2" />
          <p className="font-ui text-[13px] text-text-3">No WFH requests yet</p>
          <p className="font-ui text-caption text-text-4 mt-1">
            Need to work remotely for a day? Request it here and HR will review.
          </p>
        </Card>
      ) : (
        <Card padding="none">
          <div className="divide-y divide-border-subtle">
            {requests.slice(0, 8).map((req) => (
              <div key={req.id} className="flex items-start gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="font-ui font-medium text-[13px] text-text-1">{fmtDayRange(req.start_date, req.end_date)}</span>
                    {req.day_part !== 'full' && (
                      <span className="px-1.5 py-0.5 rounded-xs bg-service-design/10 border border-service-design/25 text-service-design text-[10px] font-mono font-semibold">
                        {DAY_PART_LABEL[req.day_part] ?? 'Partial'}
                      </span>
                    )}
                    {req.granted_directly && (
                      <span className="text-[10px] font-mono bg-service-dev/10 text-service-dev border border-service-dev/20 px-1.5 py-0.5 rounded-xs uppercase tracking-wide">HR Granted</span>
                    )}
                  </div>
                  <p className="font-ui text-[12px] text-text-3 truncate">{req.reason}</p>
                  {req.review_note && <p className="font-ui text-[11px] text-error mt-0.5 italic">"{req.review_note}"</p>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                  {req.status === 'pending' && !req.granted_directly && (
                    <button onClick={() => openEdit(req)} title="Edit request" className="p-1 text-text-4 hover:text-text-1 transition-colors">
                      <Pencil size={13} />
                    </button>
                  )}
                  <span className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded-xs border text-[11px] font-mono font-semibold',
                    OT_STATUS_CLS[req.status] ?? OT_STATUS_CLS['pending'],
                  )}>
                    {req.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {modalOpen && (
        <ModalShell onClose={closeModal} size="md" contentClassName="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-[16px] text-text-1">{editingId ? 'Edit WFH Request' : 'Request WFH'}</h3>
              <button onClick={closeModal} className="text-text-4 hover:text-text-1"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Duration</label>
                <Select
                  value={dayPart}
                  onChange={(v) => setDayPart(toDayPart(v))}
                  options={DAY_PART_OPTIONS}
                />
                {isPartial && (
                  <p className="text-[11px] font-ui text-text-4 mt-1">
                    You work the other half from the office, so a partial day applies to a single date.
                  </p>
                )}
              </div>
              {isPartial ? (
                <div>
                  <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Date</label>
                  <DatePicker value={startDate} onChange={setStartDate} minDate={todayStr} />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">From</label>
                    <DatePicker value={startDate} onChange={(v) => { setStartDate(v); if (endDate < v) setEndDate(v) }} minDate={todayStr} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">To</label>
                    <DatePicker value={endDate} onChange={setEndDate} minDate={startDate} />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Reason</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why do you need to work from home?"
                  rows={3}
                  className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-ui text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus resize-none"
                />
              </div>
            </div>
            <div className="flex gap-2.5 mt-5">
              <Button variant="ghost" size="sm" className="flex-1" onClick={closeModal}>Cancel</Button>
              <Button size="sm" className="flex-1" onClick={handleSubmit} disabled={invalid || saving}>
                <Check size={14} /> {editingId ? 'Save' : 'Submit'}
              </Button>
            </div>
        </ModalShell>
      )}
    </div>
  )
}

// ── Leave section ─────────────────────────────────────────────────────────────

export function LeaveSection() {
  const toast = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [typeId, setTypeId] = useState('')
  const [dayPart, setDayPart] = useState<'full' | 'first_half' | 'second_half'>('full')
  const [startDate, setStartDate] = useState(localToday)
  const [endDate, setEndDate] = useState(localToday)
  const [reason, setReason] = useState('')
  const { data: balances = [] } = useMyLeaveBalances()
  const { data: requests = [], isLoading } = useMyLeaveRequests()
  const submitMut = useSubmitLeave()
  const updateMut = useUpdateLeave()
  const saving = submitMut.isPending || updateMut.isPending

  const isHalf = dayPart !== 'full'
  // Half-day is always a single day.
  const effectiveEnd = isHalf ? startDate : endDate
  const invalid = !typeId || !reason.trim() || effectiveEnd < startDate

  const resetForm = () => {
    setTypeId(''); setReason(''); setDayPart('full')
    setStartDate(localToday()); setEndDate(localToday())
  }
  const openCreate = () => { setEditingId(null); resetForm(); setModalOpen(true) }
  const openEdit = (req: {
    id: string; leave_type_id: string; day_part: string; start_date: string; end_date: string; reason: string
  }) => {
    setEditingId(req.id)
    setTypeId(req.leave_type_id)
    setDayPart(req.day_part === 'first_half' || req.day_part === 'second_half' ? req.day_part : 'full')
    setStartDate(req.start_date); setEndDate(req.end_date); setReason(req.reason)
    setModalOpen(true)
  }
  const closeModal = () => { setModalOpen(false); setEditingId(null) }

  const handleSubmit = async () => {
    if (invalid) return
    const payload = {
      leave_type_id: typeId,
      start_date: startDate,
      end_date: effectiveEnd,
      reason: reason.trim(),
      day_part: dayPart,
    }
    try {
      if (editingId) {
        await updateMut.mutateAsync({ id: editingId, payload })
        toast('Leave request updated', 'success')
      } else {
        await submitMut.mutateAsync(payload)
        toast('Leave request submitted — awaiting approval', 'success')
      }
      closeModal(); resetForm()
    } catch {
      toast(editingId ? 'Failed to update leave request' : 'Failed to submit leave request', 'error')
    }
  }

  const fmtRange = (start: string, end: string) => {
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    const s = new Date(start + 'T00:00:00').toLocaleDateString('en-US', opts)
    if (start === end) return s
    return `${s} – ${new Date(end + 'T00:00:00').toLocaleDateString('en-US', opts)}`
  }

  const todayStr = localToday()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-h4 text-text-1">Leave</h2>
        <Button size="sm" onClick={openCreate} disabled={balances.length === 0}>
          <Plus size={13} /> Request Leave
        </Button>
      </div>

      {/* Balances */}
      {balances.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {balances.map((b) => (
            <div key={b.type.id} className="bg-surface-1 border border-border-default rounded-lg p-3">
              <p className="font-ui text-[11.5px] text-text-3 truncate">{b.type.name}</p>
              <p className="font-display font-bold text-[20px] text-text-1 leading-tight mt-0.5">
                {b.remaining}
                <span className="font-mono text-[11px] text-text-4 font-normal"> / {b.type.days_allowed}</span>
              </p>
              <p className="font-mono text-[10px] text-text-4">days left</p>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <Card className="animate-pulse"><div className="h-16 bg-surface-2 rounded" /></Card>
      ) : requests.length === 0 ? (
        <Card className="py-8 text-center">
          <Plane size={24} className="mx-auto text-text-4 mb-2" />
          <p className="font-ui text-[13px] text-text-3">No leave requests yet</p>
          <p className="font-ui text-caption text-text-4 mt-1">
            Request annual, sick, or casual leave and track your remaining balance.
          </p>
        </Card>
      ) : (
        <Card padding="none">
          <div className="divide-y divide-border-subtle">
            {requests.slice(0, 8).map((req) => (
              <div key={req.id} className="flex items-start gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="font-ui font-medium text-[13px] text-text-1">{req.leave_types?.name ?? 'Leave'}</span>
                    <span className="font-mono text-[11px] text-text-3">{fmtRange(req.start_date, req.end_date)}</span>
                    <span className="font-display font-bold text-[12px] text-service-dev">{req.days}d</span>
                    {req.day_part !== 'full' && (
                      <span className="px-1.5 py-0.5 rounded-xs bg-service-design/10 border border-service-design/25 text-service-design text-[10px] font-mono font-semibold">
                        Half day
                      </span>
                    )}
                  </div>
                  <p className="font-ui text-[12px] text-text-3 truncate">{req.reason}</p>
                  {req.review_note && <p className="font-ui text-[11px] text-error mt-0.5 italic">"{req.review_note}"</p>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                  {req.status === 'pending' && (
                    <button onClick={() => openEdit(req)} title="Edit request" className="p-1 text-text-4 hover:text-text-1 transition-colors">
                      <Pencil size={13} />
                    </button>
                  )}
                  <span className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded-xs border text-[11px] font-mono font-semibold',
                    OT_STATUS_CLS[req.status] ?? OT_STATUS_CLS['pending'],
                  )}>
                    {req.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {modalOpen && (
        <ModalShell onClose={closeModal} size="md" contentClassName="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-[16px] text-text-1">{editingId ? 'Edit Leave Request' : 'Request Leave'}</h3>
              <button onClick={closeModal} className="text-text-4 hover:text-text-1"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Leave Type</label>
                <Select
                  value={typeId}
                  onChange={setTypeId}
                  placeholder="Select type…"
                  options={balances.map((b) => ({ value: b.type.id, label: `${b.type.name} — ${b.remaining} of ${b.type.days_allowed} left` }))}
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Duration</label>
                <Select
                  value={dayPart}
                  onChange={(v) => setDayPart(v === 'first_half' || v === 'second_half' ? v : 'full')}
                  options={[
                    { value: 'full',        label: 'Full day(s)' },
                    { value: 'first_half',  label: 'Half day — first half' },
                    { value: 'second_half', label: 'Half day — second half' },
                  ]}
                />
                {isHalf && (
                  <p className="text-[11px] font-ui text-text-4 mt-1">Half day counts as 0.5 and applies to a single day.</p>
                )}
              </div>
              {isHalf ? (
                <div>
                  <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Date</label>
                  <DatePicker value={startDate} onChange={setStartDate} minDate={todayStr} />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">From</label>
                    <DatePicker value={startDate} onChange={(v) => { setStartDate(v); if (endDate < v) setEndDate(v) }} minDate={todayStr} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">To</label>
                    <DatePicker value={endDate} onChange={setEndDate} minDate={startDate} />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-[11px] font-mono font-semibold text-text-4 uppercase tracking-wider mb-1.5">Reason</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Brief reason for leave…"
                  rows={3}
                  className="w-full bg-surface-inset border border-border-default rounded-md px-3 py-2 text-[13px] font-ui text-text-1 placeholder:text-text-4 outline-none focus:border-border-focus resize-none"
                />
              </div>
            </div>
            <div className="flex gap-2.5 mt-5">
              <Button variant="ghost" size="sm" className="flex-1" onClick={closeModal}>Cancel</Button>
              <Button size="sm" className="flex-1" onClick={handleSubmit}
                disabled={invalid || saving}>
                <Check size={14} /> {editingId ? 'Save' : 'Submit'}
              </Button>
            </div>
        </ModalShell>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/**
 * Everything a person can do about their own attendance: check in/out, devices,
 * the four request types, the schedule ahead and their own month history.
 * Exported without a Topbar so managers can open it as /attendance/me — HR and
 * admins file the same requests employees do, they just don't land here.
 */
export function MyAttendanceSections() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1) // 1-indexed

  const { data: history = [], isLoading } = useMyMonthlyAttendance(year, month)
  const { profile } = useAuthContext()
  const canSeeTeam = showsInlineTeamAttendance(profile?.role)

  const prevMonth = () => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12) }
    else setMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setYear((y) => y + 1); setMonth(1) }
    else setMonth((m) => m + 1)
  }
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1
  const periodLabel = `${MONTH_NAMES[month - 1]} ${year}`

  return (
      <div className="px-4 py-6 lg:px-8 lg:py-7 flex flex-col gap-6">
        <AttendanceCheckInCard />

        <MyDevicesCard />

        {/* PMs only: read-only visibility across the teams they work with. Team
            leads get this on their own team page instead (/teams/:id). */}
        {canSeeTeam && <TeamAttendancePanel title="Teams" />}

        <UpcomingScheduleSection />

        {/* OOO active state — shown only when employee has an approved OOO today */}
        <OooSection />

        {/* Exception requests + Overtime side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <MyExceptionsSection />
          <OvertimeSection />
        </div>

        {/* WFH + Leave side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <WfhSection />
          <LeaveSection />
        </div>

        {/* Month filter + summary cards — sit directly above the attendance table */}
        <div className="flex flex-wrap items-center gap-3">
          <PeriodStepper
            icon={Calendar}
            label={periodLabel}
            onPrev={prevMonth}
            onNext={nextMonth}
            disableNext={isCurrentMonth}
          >
            {isCurrentMonth && (
              <span className="ml-1 px-1.5 py-0.5 rounded-xs bg-brand-red/10 border border-brand-red/20 text-brand-red text-[10px] font-mono font-semibold uppercase tracking-wide">
                Current
              </span>
            )}
          </PeriodStepper>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-surface-1 border border-border-default rounded-xl p-4 flex flex-col gap-2 animate-pulse">
                <div className="size-9 rounded-lg bg-surface-2" />
                <div>
                  <div className="h-7 w-10 bg-surface-2 rounded mb-1" />
                  <div className="h-3 w-14 bg-surface-2 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <SummaryStats records={history} year={year} month={month} />
        )}

        {/* History */}
        {isLoading ? (
          <Card className="animate-pulse">
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-8 bg-surface-2 rounded" />
              ))}
            </div>
          </Card>
        ) : (
          <HistoryTable records={history} periodLabel={periodLabel} />
        )}
      </div>
  )
}

export default function EmployeeAttendancePage() {
  return (
    <div className="flex flex-col flex-1">
      <Topbar title="My Attendance" />
      <MyAttendanceSections />
    </div>
  )
}
