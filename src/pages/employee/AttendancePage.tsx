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
} from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { DatePicker } from '../../components/ui/DatePicker'
import { TimePicker } from '../../components/ui/TimePicker'
import {
  useMyAttendanceHistory,
  useMyExceptions,
  useRequestException,
  useLogOooDeparture,
  useLogOooReturn,
  useMyOvertimeRequests,
  useSubmitOvertime,
  useAttendanceSettings,
  useHolidays,
  useWorkingSaturdays,
} from '../../hooks/useAttendance'
import { AttendanceCheckInCard } from '../../components/shared/AttendanceCheckInCard'
import { useToast } from '../../components/ui/toast-context'
import { cn } from '../../lib/cn'
import type { AttendanceRow } from '../../api/attendance'

function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function calcHours(checkIn: string | null, checkOut: string | null): string {
  if (!checkIn || !checkOut) return '—'
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime()
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  return `${h}h ${m}m`
}

const STATUS_CONFIG: Record<string, { label: string; cls: string; dot: string }> = {
  present: { label: 'Present',  cls: 'bg-success/10 text-success border-success/25',   dot: 'bg-success' },
  late:    { label: 'Late',     cls: 'bg-warning/10 text-warning border-warning/25',   dot: 'bg-warning' },
  absent:  { label: 'Absent',   cls: 'bg-error/10 text-error border-error/25',         dot: 'bg-error'   },
  wfh:     { label: 'WFH',      cls: 'bg-service-dev/10 text-service-dev border-service-dev/25', dot: 'bg-service-dev' },
  holiday: { label: 'Holiday',  cls: 'bg-surface-2 text-text-3 border-border-default', dot: 'bg-text-4' },
  leave:   { label: 'Leave',    cls: 'bg-surface-2 text-text-3 border-border-default', dot: 'bg-text-4' },
}

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.absent
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-xs border', cfg.cls)}>
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', cfg.dot)} />
      {cfg.label}
    </span>
  )
}

// ── Upcoming schedule section ─────────────────────────────────────────────────

function UpcomingScheduleSection() {
  const now = new Date()
  const year = now.getFullYear()
  const todayStr = `${year}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() + 30)
  const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`

  const { data: holidays = [] }    = useHolidays(year)
  const { data: workingSats = [] } = useWorkingSaturdays(year)

  const upcomingHolidays = holidays.filter((h) => h.date > todayStr && h.date <= cutoffStr)
  const upcomingSats     = workingSats.filter((s) => s.date > todayStr && s.date <= cutoffStr)

  if (upcomingHolidays.length === 0 && upcomingSats.length === 0) return null

  const items = [
    ...upcomingHolidays.map((h) => ({ type: 'holiday'     as const, date: h.date, label: h.name })),
    ...upcomingSats.map((s)     => ({ type: 'working_sat' as const, date: s.date, label: s.note ?? 'Working Saturday' })),
  ].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <Card padding="none">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border-subtle">
        <Calendar size={14} className="text-text-3" />
        <span className="font-ui font-semibold text-[13px] text-text-1">Upcoming Schedule</span>
        <span className="font-mono text-[11px] text-text-4 ml-1">Next 30 days</span>
      </div>
      <div className="divide-y divide-border-subtle">
        {items.map((item) => {
          const d = new Date(item.date + 'T00:00:00')
          const dateLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
          const isHoliday = item.type === 'holiday'
          return (
            <div key={item.date + item.type} className="flex items-center gap-3 px-5 py-3">
              <div className={cn(
                'w-7 h-7 rounded-sm flex items-center justify-center flex-shrink-0',
                isHoliday ? 'bg-text-4/10' : 'bg-service-mkt/10',
              )}>
                {isHoliday
                  ? <Palmtree size={14} className="text-text-3" />
                  : <Calendar size={14} className="text-service-mkt" />
                }
              </div>
              <p className="flex-1 font-ui font-medium text-[13px] text-text-1 truncate">{item.label}</p>
              <span className="font-mono text-[11.5px] text-text-3 flex-shrink-0">{dateLabel}</span>
              <span className={cn(
                'text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border flex-shrink-0',
                isHoliday
                  ? 'bg-text-4/10 text-text-3 border-border-default'
                  : 'bg-service-mkt/10 text-service-mkt border-service-mkt/25',
              )}>
                {isHoliday ? 'Holiday' : 'Working'}
              </span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ── Summary stats ─────────────────────────────────────────────────────────────

function SummaryStats({ records }: { records: AttendanceRow[] }) {
  const now  = new Date()
  const year = now.getFullYear()

  const { data: settings }         = useAttendanceSettings()
  const { data: holidays = [] }    = useHolidays(year)
  const { data: workingSats = [] } = useWorkingSaturdays(year)

  // Compute absent: past working days (last 30 days, before today) with no record
  const absent = (() => {
    const holidaySet    = new Set(holidays.map((h) => h.date))
    const workingSatSet = new Set(workingSats.map((s) => s.date))
    const recordSet     = new Set(records.map((r) => r.date))
    let count = 0
    for (let i = 1; i <= 30; i++) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const dow = d.getDay()
      if (dow === 0) continue
      if (dow === 6 && !settings?.saturday_working && !workingSatSet.has(dateStr)) continue
      if (holidaySet.has(dateStr)) continue
      if (!recordSet.has(dateStr)) count++
    }
    return count
  })()

  const totalPresent = records.filter((r) => r.status === 'present' || r.status === 'late').length
  const late         = records.filter((r) => r.status === 'late').length
  const leave        = records.filter((r) => r.status === 'leave').length

  const stats = [
    { label: 'Present', value: totalPresent, icon: CheckCircle2,  color: 'text-success',        bg: 'bg-success/10 border-success/20' },
    { label: 'Late',    value: late,         icon: Clock,          color: 'text-warning',        bg: 'bg-warning/10 border-warning/20' },
    { label: 'Absent',  value: absent,       icon: AlertTriangle,  color: 'text-error',          bg: 'bg-error/10 border-error/20' },
    { label: 'Leave',   value: leave,        icon: Home,           color: 'text-service-dev',    bg: 'bg-service-dev/10 border-service-dev/20' },
  ]

  return (
    <div className="grid grid-cols-4 gap-4">
      {stats.map(({ label, value, icon: Icon, color, bg }) => (
        <div key={label} className="bg-surface-1 border border-border-default rounded-xl p-4 flex flex-col gap-2">
          <div className={cn('w-9 h-9 rounded-lg border flex items-center justify-center', bg)}>
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

function HistoryTable({ records }: { records: AttendanceRow[] }) {
  if (records.length === 0) {
    return (
      <Card className="py-12 text-center">
        <CalendarCheck size={32} className="mx-auto text-text-4 mb-3" />
        <p className="font-ui font-semibold text-text-2">No attendance records yet</p>
        <p className="font-ui text-caption text-text-4 mt-1">Your check-in history will appear here</p>
      </Card>
    )
  }

  return (
    <Card padding="none">
      <div className="px-5 py-4 border-b border-border-subtle">
        <h3 className="font-display font-semibold text-h4 text-text-1">Last 30 Days</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-subtle">
              {['Date', 'Status', 'Check In', 'Check Out', 'Hours', 'Source', 'Device'].map((h) => (
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
                  <StatusPill status={row.status} />
                </td>
                <td className="px-5 py-3 font-mono text-[12px] text-text-2 whitespace-nowrap">
                  {formatTime(row.check_in)}
                </td>
                <td className="px-5 py-3 font-mono text-[12px] text-text-2 whitespace-nowrap">
                  {formatTime(row.check_out)}
                </td>
                <td className="px-5 py-3 font-mono text-[12px] text-text-3 whitespace-nowrap">
                  {calcHours(row.check_in, row.check_out)}
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
                <td className="px-5 py-3 font-mono text-[11px] text-text-4 max-w-[160px] truncate" title={row.device_name ?? ''}>
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

function OooSection() {
  const toast = useToast()
  const { data: myExceptions = [] } = useMyExceptions()
  const logDepartureMut = useLogOooDeparture()
  const logReturnMut    = useLogOooReturn()

  const todayStr = new Date().toISOString().split('T')[0]
  const todayOoo = myExceptions.find(
    (e) => e.exception_type === 'out_of_office' && e.status === 'approved' && e.date === todayStr
  )

  if (!todayOoo || !!todayOoo.actual_return) return null

  const handleDeparture = async () => {
    try {
      await logDepartureMut.mutateAsync(todayOoo.id)
      toast('Out of office logged — see you back soon!', 'success')
    } catch {
      toast('Failed to log departure', 'error')
    }
  }

  const handleReturn = async () => {
    try {
      await logReturnMut.mutateAsync(todayOoo.id)
      toast('Welcome back! Return logged.', 'success')
    } catch {
      toast('Failed to log return', 'error')
    }
  }

  return (
    <Card className="border-service-dev/30">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-service-dev/10 border border-service-dev/20 flex items-center justify-center flex-shrink-0">
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
          <Button size="sm" onClick={handleDeparture} disabled={logDepartureMut.isPending}>
            <LogOut size={14} /> I'm Heading Out
          </Button>
        ) : (
          <Button size="sm" variant="secondary" onClick={handleReturn} disabled={logReturnMut.isPending}>
            <LogIn size={14} /> I'm Back
          </Button>
        )}
      </div>
    </Card>
  )
}

// ── Request exception modal ───────────────────────────────────────────────────

interface RequestExceptionModalProps {
  open: boolean
  onClose: () => void
}

function RequestExceptionModal({ open, onClose }: RequestExceptionModalProps) {
  const toast = useToast()
  const requestMut = useRequestException()
  const [excType, setExcType] = useState<'late_arrival' | 'early_departure' | 'out_of_office'>('late_arrival')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [requestedTime, setRequestedTime] = useState('')
  const [returnTime, setReturnTime] = useState('')
  const [reason, setReason] = useState('')

  const timeLabel: Record<typeof excType, string> = {
    late_arrival:    'Arrival Time',
    early_departure: 'Departure Time',
    out_of_office:   'Departure Time',
  }

  const todayStr = new Date().toISOString().split('T')[0]
  const now = new Date()
  const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const requestedTimeMin = date === todayStr ? currentTimeStr : undefined

  const handleSubmit = async () => {
    if (!requestedTime || !reason.trim()) return
    try {
      await requestMut.mutateAsync({
        exception_type: excType,
        date,
        requested_time: requestedTime,
        return_time: excType === 'out_of_office' && returnTime ? returnTime : undefined,
        reason: reason.trim(),
      })
      toast('Exception request submitted — awaiting HR approval', 'success')
      onClose()
      setRequestedTime('')
      setReturnTime('')
      setReason('')
      setExcType('late_arrival')
    } catch {
      toast('Failed to submit request', 'error')
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-1 border border-border-default rounded-xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-[16px] text-text-1">Request Attendance Exception</h3>
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
            disabled={!requestedTime || !reason.trim() || requestMut.isPending}
          >
            <Check size={14} /> Submit Request
          </Button>
        </div>
      </div>
    </div>
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

function MyExceptionsSection() {
  const [modalOpen, setModalOpen] = useState(false)
  const { data: exceptions = [], isLoading } = useMyExceptions()

  const fmtTimeStr = (t: string | null) => t ? t.slice(0, 5) : '—'
  const fmtDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-h4 text-text-1">Exception Requests</h2>
        <Button size="sm" onClick={() => setModalOpen(true)}>
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
                <span className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded-xs border text-[11px] font-mono font-semibold flex-shrink-0 mt-0.5',
                  EXC_STATUS_CLS[exc.status] ?? EXC_STATUS_CLS['pending'],
                )}>
                  {exc.status}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <RequestExceptionModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}

// ── Overtime section ──────────────────────────────────────────────────────────

const OT_STATUS_CLS: Record<string, string> = {
  pending:  'bg-warning/10 text-warning border-warning/25',
  approved: 'bg-success/10 text-success border-success/25',
  rejected: 'bg-error/10 text-error border-error/25',
}

function OvertimeSection() {
  const toast = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    reason: '',
  })

  const { data: requests = [], isLoading } = useMyOvertimeRequests()
  const submitMut = useSubmitOvertime()

  const computedHours = (() => {
    if (!form.startTime || !form.endTime) return 0
    const [sh, sm] = form.startTime.split(':').map(Number)
    const [eh, em] = form.endTime.split(':').map(Number)
    const diff = (eh * 60 + em) - (sh * 60 + sm)
    return diff > 0 ? parseFloat((diff / 60).toFixed(2)) : 0
  })()

  const handleSubmit = async () => {
    if (!form.date || !form.startTime || !form.endTime || !form.reason.trim() || computedHours <= 0) return
    try {
      await submitMut.mutateAsync({
        date: form.date,
        start_time: form.startTime,
        end_time: form.endTime,
        hours: computedHours,
        reason: form.reason.trim(),
      })
      toast('Overtime request submitted — awaiting HR approval', 'success')
      setModalOpen(false)
      setForm({ date: new Date().toISOString().split('T')[0], startTime: '', endTime: '', reason: '' })
    } catch {
      toast('Failed to submit overtime request', 'error')
    }
  }

  const fmtDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const fmtT = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
  }

  const todayStr = new Date().toISOString().split('T')[0]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-h4 text-text-1">Overtime Requests</h2>
        <Button size="sm" onClick={() => setModalOpen(true)}>
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
                <span className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded-xs border text-[11px] font-mono font-semibold flex-shrink-0 mt-0.5',
                  OT_STATUS_CLS[req.status] ?? OT_STATUS_CLS['pending'],
                )}>
                  {req.status}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Submit modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative bg-surface-1 border border-border-default rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-[16px] text-text-1">Log Overtime</h3>
              <button onClick={() => setModalOpen(false)} className="text-text-4 hover:text-text-1"><X size={18} /></button>
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
              <Button variant="ghost" size="sm" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button
                size="sm"
                className="flex-1"
                disabled={!form.date || !form.startTime || !form.endTime || !form.reason.trim() || computedHours <= 0 || submitMut.isPending}
                onClick={handleSubmit}
              >
                <Check size={14} /> Submit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EmployeeAttendancePage() {
  const { data: history = [], isLoading } = useMyAttendanceHistory(30)

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="My Attendance" />

      <div className="p-8 flex flex-col gap-6 max-w-content mx-auto w-full">
        <AttendanceCheckInCard />

        {/* Stats — always visible, computed from last 30 days */}
        <SummaryStats records={history} />

        <UpcomingScheduleSection />

        {/* OOO active state — shown only when employee has an approved OOO today */}
        <OooSection />

        {/* Exception requests + Overtime side by side */}
        <div className="grid grid-cols-2 gap-6 items-start">
          <MyExceptionsSection />
          <OvertimeSection />
        </div>

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
          <HistoryTable records={history} />
        )}
      </div>
    </div>
  )
}
