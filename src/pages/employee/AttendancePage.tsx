import { useState, useEffect } from 'react'
import {
  CalendarCheck,
  Clock,
  LogIn,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Wifi,
  WifiOff,
  Fingerprint,
  Monitor,
} from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { useMyTodayAttendance, useMyAttendanceHistory, useCheckIn, useCheckOut } from '../../hooks/useAttendance'
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

  useEffect(() => {
    Promise.all([getDeviceFingerprint(), Promise.resolve(getDeviceName())]).then(([fp, name]) => {
      setDeviceFingerprint(fp)
      setDeviceName(name)
      setDeviceReady(true)
    })
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
      const body = (err as { context?: { body?: string } }).context?.body
      let parsed: { error?: string; code?: string } = {}
      try { parsed = body ? JSON.parse(body) : {} } catch { /* empty */ }

      const code = parsed.code
      if (code === 'outside_window') {
        setErrorMsg(parsed.error ?? 'Check-in is outside the allowed time window.')
      } else if (code === 'wrong_network') {
        setErrorMsg('You must be connected to the office WiFi to check in.')
      } else if (code === 'duplicate') {
        setErrorMsg('You have already checked in today.')
      } else {
        setErrorMsg('Check-in failed. Please try again or contact HR.')
      }
    }
  }

  const handleCheckOut = async () => {
    if (!today?.id) return
    try {
      await checkOutMut.mutateAsync(today.id)
      toast('Checked out — see you tomorrow!', 'success')
    } catch {
      toast('Check-out failed. Please try again.', 'error')
    }
  }

  if (todayLoading) {
    return (
      <Card className="animate-pulse">
        <div className="h-20 bg-surface-2 rounded-md" />
      </Card>
    )
  }

  const isCheckedIn = !!today
  const isCheckedOut = isCheckedIn && !!today.check_out

  return (
    <div className="space-y-3">
      {/* Device-flagged banner */}
      {today?.device_flagged && (
        <div className="flex items-start gap-3 bg-warning/8 border border-warning/25 rounded-md px-4 py-3">
          <AlertTriangle size={16} className="text-warning flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-ui font-semibold text-[13px] text-warning">Unrecognised device</p>
            <p className="font-ui text-[12px] text-text-3 mt-0.5">
              Your check-in was recorded from a device that HR hasn't approved yet. An admin will review it shortly.
            </p>
          </div>
        </div>
      )}

      {/* Error banner */}
      {errorMsg && (
        <div className="flex items-start gap-3 bg-error/8 border border-error/25 rounded-md px-4 py-3">
          <XCircle size={16} className="text-error flex-shrink-0 mt-0.5" />
          <p className="font-ui text-[13px] text-error">{errorMsg}</p>
        </div>
      )}

      <Card className="relative overflow-hidden">
        {/* Ambient glow */}
        {isCheckedIn && !isCheckedOut && (
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-success/10 rounded-full blur-2xl pointer-events-none" />
        )}

        <div className="relative flex items-center gap-5">
          {/* Status icon */}
          <div className={cn(
            'w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0',
            isCheckedOut
              ? 'bg-text-4/10'
              : isCheckedIn
                ? today.status === 'late'
                  ? 'bg-warning/15'
                  : 'bg-success/15'
                : 'bg-surface-2',
          )}>
            {isCheckedIn ? (
              today.status === 'late'
                ? <Clock size={26} className="text-warning" />
                : <CheckCircle2 size={26} className="text-success" />
            ) : (
              <CalendarCheck size={26} className="text-text-4" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            {isCheckedIn ? (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-display font-bold text-h4 text-text-1">
                    {isCheckedOut ? 'Day Complete' : today.status === 'late' ? 'Checked In — Late' : 'Checked In'}
                  </p>
                  <StatusPill status={today.status} />
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="flex items-center gap-1.5 font-mono text-[12px] text-text-3">
                    <LogIn size={12} className="text-success" />
                    {formatTime(today.check_in)}
                  </span>
                  {today.check_out && (
                    <span className="flex items-center gap-1.5 font-mono text-[12px] text-text-3">
                      <LogOut size={12} className="text-error" />
                      {formatTime(today.check_out)}
                    </span>
                  )}
                  {today.check_out && (
                    <span className="font-mono text-[12px] text-text-3">
                      {calcHours(today.check_in, today.check_out)} worked
                    </span>
                  )}
                  {today.wifi_validated && (
                    <span className="flex items-center gap-1 font-mono text-[11px] text-success">
                      <Wifi size={11} /> Office WiFi
                    </span>
                  )}
                  {!today.wifi_validated && (
                    <span className="flex items-center gap-1 font-mono text-[11px] text-text-4">
                      <WifiOff size={11} /> No WiFi check
                    </span>
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="font-display font-bold text-h4 text-text-1 mb-1">Not checked in yet</p>
                <div className="flex items-center gap-2 font-mono text-[12px] text-text-4">
                  <Monitor size={12} />
                  <span className={deviceReady ? 'text-text-3' : 'opacity-50'}>{deviceReady ? deviceName : 'Detecting device…'}</span>
                </div>
              </>
            )}
          </div>

          {/* Action button */}
          <div className="flex-shrink-0">
            {!isCheckedIn ? (
              <Button
                onClick={handleCheckIn}
                disabled={!deviceReady || checkInMut.isPending}
                size="md"
              >
                <LogIn size={15} />
                {checkInMut.isPending ? 'Checking in…' : 'Check In'}
              </Button>
            ) : !isCheckedOut ? (
              <Button
                variant="secondary"
                onClick={handleCheckOut}
                disabled={checkOutMut.isPending}
                size="md"
              >
                <LogOut size={15} />
                {checkOutMut.isPending ? 'Checking out…' : 'Check Out'}
              </Button>
            ) : (
              <span className="font-mono text-[11px] text-text-4 text-right block">
                Day complete
              </span>
            )}
          </div>
        </div>

        {/* Device fingerprint footer */}
        {!isCheckedIn && deviceReady && (
          <div className="mt-3 pt-3 border-t border-border-subtle flex items-center gap-1.5 font-mono text-[10.5px] text-text-4">
            <Fingerprint size={11} />
            <span>Device ID: {deviceFingerprint.slice(0, 16)}…</span>
          </div>
        )}
      </Card>
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EmployeeAttendancePage() {
  const { data: history = [], isLoading } = useMyAttendanceHistory(30)

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="My Attendance" />

      <div className="p-8 flex flex-col gap-6 max-w-content mx-auto w-full">
        {/* Page header */}
        <div>
          <h1 className="font-display font-bold text-h2 text-text-1 tracking-tight">My Attendance</h1>
          <p className="font-ui text-body-sm text-text-3 mt-1">Check in from the office, track your history, and monitor your attendance streak.</p>
        </div>

        {/* Today's check-in card */}
        <CheckInCard />

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
