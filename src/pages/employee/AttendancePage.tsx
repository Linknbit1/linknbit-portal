import { useState, useEffect } from 'react'
import {
  CalendarCheck,
  LogIn,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Wifi,
  WifiOff,
  Fingerprint,
  MapPin,
  Plus,
  X,
  Check,
  ClipboardList,
} from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { DatePicker } from '../../components/ui/DatePicker'
import { TimePicker } from '../../components/ui/TimePicker'
import {
  useMyTodayAttendance,
  useMyAttendanceHistory,
  useCheckIn,
  useCheckOut,
  useMyExceptions,
  useRequestException,
  useLogOooDeparture,
  useLogOooReturn,
} from '../../hooks/useAttendance'
import { getDeviceFingerprint, getDeviceName } from '../../lib/deviceUtils'
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

// ── Check-in card ─────────────────────────────────────────────────────────────

function CheckInCard() {
  const toast = useToast()
  const { data: today, isLoading: todayLoading } = useMyTodayAttendance()
  const checkInMut = useCheckIn()
  const checkOutMut = useCheckOut()

  const [deviceReady, setDeviceReady] = useState(false)
  const [deviceFingerprint, setDeviceFingerprint] = useState('')
  const [deviceName, setDeviceName] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [time, setTime] = useState('')

  useEffect(() => {
    Promise.all([getDeviceFingerprint(), Promise.resolve(getDeviceName())]).then(([fp, name]) => {
      setDeviceFingerprint(fp)
      setDeviceName(name)
      setDeviceReady(true)
    })
  }, [])

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const handleCheckIn = async () => {
    setErrorMsg(null)
    try {
      const result = await checkInMut.mutateAsync({ deviceFingerprint, deviceName })
      toast(
        result.status === 'late'
          ? 'Checked in — marked as late'
          : 'Checked in successfully — have a great day!',
        result.status === 'late' ? 'warning' : 'success',
      )
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      const msg  = err instanceof Error ? err.message : 'Check-in failed'
      if (code === 'outside_window') {
        setErrorMsg(msg)
      } else if (code === 'wrong_network') {
        setErrorMsg('You must be connected to the office WiFi to check in.')
      } else if (code === 'duplicate') {
        setErrorMsg('You have already checked in today.')
      } else {
        setErrorMsg(msg || 'Check-in failed. Please try again or contact HR.')
      }
    }
  }

  const handleCheckOut = async () => {
    if (!today?.id) return
    setErrorMsg(null)
    try {
      await checkOutMut.mutateAsync(today.id)
      toast('Checked out — see you tomorrow!', 'success')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      const msg  = err instanceof Error ? err.message : 'Check-out failed'
      if (code === 'early_checkout') {
        setErrorMsg(msg || 'You cannot check out before work ends. Submit an early departure exception request if needed.')
      } else if (code === 'duplicate_checkout') {
        setErrorMsg('You have already checked out today.')
      } else {
        toast('Check-out failed. Please try again.', 'error')
      }
    }
  }

  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  if (todayLoading) {
    return (
      <div className="bg-surface-1 border border-border-default rounded-xl p-8 flex flex-col items-center gap-6">
        <div className="w-24 h-24 rounded-full bg-surface-2 animate-pulse" />
      </div>
    )
  }

  /* ── Already checked in ── */
  if (today) {
    const checkedOut = Boolean(today.check_out)
    const isLate = today.status === 'late'
    return (
      <div className="bg-surface-1 border border-border-default rounded-xl p-8 flex flex-col items-center gap-5">
        <div className="text-center">
          <h2 className="font-display font-bold text-[18px] text-text-1">Your Attendance</h2>
          <p className="font-mono text-[12px] text-text-4 mt-1">{dateStr}</p>
        </div>

        {today.device_flagged && (
          <div className="w-full flex items-start gap-3 bg-warning/8 border border-warning/25 rounded-md px-4 py-3">
            <AlertTriangle size={15} className="text-warning flex-shrink-0 mt-0.5" />
            <p className="font-ui text-[12.5px] text-warning">
              Unrecognised device — HR has been notified and will review it shortly.
            </p>
          </div>
        )}

        {errorMsg && (
          <div className="w-full flex items-start gap-3 bg-error/8 border border-error/25 rounded-md px-4 py-3">
            <XCircle size={15} className="text-error flex-shrink-0 mt-0.5" />
            <p className="font-ui text-[12.5px] text-error">{errorMsg}</p>
          </div>
        )}

        <div className={cn(
          'w-24 h-24 rounded-full border-2 flex items-center justify-center',
          checkedOut
            ? 'bg-text-4/10 border-text-4/20'
            : isLate
              ? 'bg-warning/15 border-warning/40'
              : 'bg-success/15 border-success/40',
        )}>
          <CheckCircle2 size={40} className={checkedOut ? 'text-text-4' : isLate ? 'text-warning' : 'text-success'} />
        </div>

        <div className="text-center">
          <p className={cn(
            'font-display font-bold text-[18px]',
            checkedOut ? 'text-text-2' : isLate ? 'text-warning' : 'text-success',
          )}>
            {checkedOut ? 'Day Complete' : isLate ? 'Checked In (Late)' : 'Checked In'}
          </p>
          <p className="font-mono text-[13px] text-text-3 mt-0.5">
            {formatTime(today.check_in)}
            {checkedOut && today.check_out && <> → {formatTime(today.check_out)}</>}
          </p>
        </div>

        {!checkedOut && (
          <Button variant="secondary" onClick={handleCheckOut} disabled={checkOutMut.isPending}>
            <LogOut size={15} />
            {checkOutMut.isPending ? 'Checking out…' : 'Check Out'}
          </Button>
        )}

        <div className="flex items-center gap-5 text-[11.5px] font-mono text-text-4">
          {today.wifi_validated
            ? <span className="flex items-center gap-1.5"><Wifi size={12} className="text-success" /> Office WiFi</span>
            : <span className="flex items-center gap-1.5"><WifiOff size={12} /> No WiFi check</span>
          }
        </div>
      </div>
    )
  }

  /* ── Not yet checked in ── */
  return (
    <div className="bg-surface-1 border border-border-default rounded-xl p-8 flex flex-col items-center gap-5">
      <div className="text-center">
        <h2 className="font-display font-bold text-[18px] text-text-1">Your Attendance</h2>
        <p className="font-mono text-[12px] text-text-4 mt-1">{dateStr}</p>
      </div>

      {errorMsg && (
        <div className="w-full flex items-start gap-3 bg-error/8 border border-error/25 rounded-md px-4 py-3">
          <XCircle size={15} className="text-error flex-shrink-0 mt-0.5" />
          <p className="font-ui text-[12.5px] text-error">{errorMsg}</p>
        </div>
      )}

      <button
        onClick={handleCheckIn}
        disabled={!deviceReady || checkInMut.isPending}
        className={cn(
          'w-24 h-24 rounded-full border-2 flex items-center justify-center transition-all duration-200',
          'border-brand-red/50 bg-brand-red/10 hover:bg-brand-red/20 hover:border-brand-red hover:scale-105 active:scale-95',
          (!deviceReady || checkInMut.isPending) && 'opacity-70 cursor-not-allowed',
        )}
      >
        {checkInMut.isPending
          ? <span className="w-7 h-7 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
          : <MapPin size={36} className="text-brand-red" />
        }
      </button>

      <div className="text-center">
        <p className="font-display font-bold text-[18px] text-text-1">Check In</p>
        <p className="font-mono text-[13px] text-text-3 mt-0.5">{time}</p>
      </div>

      {deviceReady && (
        <div className="flex items-center gap-1.5 font-mono text-[10.5px] text-text-4">
          <Fingerprint size={11} />
          <span>{deviceName} · {deviceFingerprint.slice(0, 12)}…</span>
        </div>
      )}

      <div className="flex items-center gap-6 text-[12px] font-mono text-text-3">
        <span className="flex items-center gap-1.5"><Wifi size={12} className="text-success" /> Office Network Required</span>
      </div>
    </div>
  )
}


// ── Summary stats ─────────────────────────────────────────────────────────────

function SummaryStats({ records }: { records: AttendanceRow[] }) {
  const present = records.filter((r) => r.status === 'present').length
  const late    = records.filter((r) => r.status === 'late').length
  const wfh     = records.filter((r) => r.status === 'wfh').length

  const stats = [
    { label: 'Present',   value: present,               cls: 'text-success' },
    { label: 'Late',      value: late,                   cls: 'text-warning' },
    { label: 'WFH',       value: wfh,                    cls: 'text-service-dev' },
    { label: 'Days Recorded', value: records.length,     cls: 'text-text-2' },
  ]

  return (
    <div className="grid grid-cols-4 gap-3">
      {stats.map((s) => (
        <Card key={s.label} className="text-center py-4">
          <p className={cn('font-display font-bold text-h2 leading-none', s.cls)}>{s.value}</p>
          <p className="font-ui text-caption text-text-4 mt-1">{s.label}</p>
        </Card>
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
    <>
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
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EmployeeAttendancePage() {
  const { data: history = [], isLoading } = useMyAttendanceHistory(30)

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="My Attendance" />

      <div className="p-8 flex flex-col gap-6 max-w-content mx-auto w-full">
        <CheckInCard />

        {/* OOO active state — shown only when employee has an approved OOO today */}
        <OooSection />

        {/* Exception requests */}
        <MyExceptionsSection />

        {/* Summary stats */}
        {!isLoading && history.length > 0 && <SummaryStats records={history} />}

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
