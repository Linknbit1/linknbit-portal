import { useState, useEffect } from 'react'
import {
  MapPin, CheckCircle2, LogOut, Wifi, WifiOff,
  AlertCircle, Fingerprint, Palmtree, Calendar,
} from 'lucide-react'
import {
  useMyTodayAttendance,
  useCheckIn,
  useCheckOut,
  useAttendanceSettings,
  useHolidays,
  useWorkingSaturdays,
} from '../../hooks/useAttendance'
import { getDeviceFingerprint, getDeviceName } from '../../lib/deviceUtils'
import { useCanAccess } from '../../hooks/useRoleFlags'
import { useToast } from '../ui/toast-context'
import { Button } from '../ui/Button'
import { cn } from '../../lib/cn'

function fmtHHMM(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

function fmtIso(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function sessionDuration(checkIn: string, checkOut: string): string {
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime()
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  return `${h}h ${m}m`
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div className="w-full flex items-start gap-2.5 bg-error/8 border border-error/25 rounded-md px-3.5 py-2.5">
      <AlertCircle size={14} className="text-error flex-shrink-0 mt-0.5" />
      <p className="font-ui text-[12px] text-error">{msg}</p>
    </div>
  )
}

export function AttendanceCheckInCard() {
  const canMarkAttendance = useCanAccess('can_mark_attendance')
  const toast = useToast()

  const now = new Date()
  const year = now.getFullYear()
  const todayStr = `${year}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const { data: today, isLoading } = useMyTodayAttendance()
  const { data: settings }         = useAttendanceSettings()
  const { data: holidays = [] }    = useHolidays(year)
  const { data: workingSats = [] } = useWorkingSaturdays(year)
  const checkInMut  = useCheckIn()
  const checkOutMut = useCheckOut()

  const [fingerprint, setFingerprint] = useState('')
  const [deviceNameVal, setDeviceNameVal] = useState('')
  const [deviceReady, setDeviceReady]     = useState(false)
  const [errorMsg, setErrorMsg]           = useState<string | null>(null)
  const [clock, setClock]                 = useState('')

  useEffect(() => {
    Promise.all([getDeviceFingerprint(), Promise.resolve(getDeviceName())]).then(([fp, name]) => {
      setFingerprint(fp)
      setDeviceNameVal(name)
      setDeviceReady(true)
    })
  }, [])

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  // Schedule context
  const todayHoliday    = holidays.find((h) => h.date === todayStr)
  const dow             = now.getDay()
  const isSunday        = dow === 0
  const isSaturday      = dow === 6
  const workingSatSet   = new Set(workingSats.map((s) => s.date))
  const isWorkingSat    = isSaturday && (!!settings?.saturday_working || workingSatSet.has(todayStr))
  const isDayOff        = isSunday || (isSaturday && !isWorkingSat)

  const workStart = settings?.work_start_time?.slice(0, 5) ?? '09:00'
  const workEnd   = settings?.work_end_time?.slice(0, 5)   ?? '18:00'
  const grace     = settings?.grace_period_min ?? 15

  const dateLabel = now.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  const handleCheckIn = async () => {
    setErrorMsg(null)
    try {
      const result = await checkInMut.mutateAsync({ deviceFingerprint: fingerprint, deviceName: deviceNameVal })
      toast(
        result.status === 'late' ? 'Checked in — marked as late' : 'Checked in successfully!',
        result.status === 'late' ? 'warning' : 'success',
      )
      if (result.device_flagged) toast('Unrecognised device — HR has been notified.', 'warning')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      const msg  = err instanceof Error ? err.message : 'Check-in failed'
      if      (code === 'outside_window') setErrorMsg(msg)
      else if (code === 'wrong_network')  setErrorMsg('You must be on the office WiFi to check in.')
      else if (code === 'duplicate')      setErrorMsg('You have already checked in today.')
      else if (code === 'device_blocked') setErrorMsg('This device is blocked. Contact HR to reactivate it.')
      else                                setErrorMsg(msg || 'Check-in failed. Please try again.')
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
      if      (code === 'early_checkout')     setErrorMsg(msg || 'Cannot check out before work ends.')
      else if (code === 'duplicate_checkout') setErrorMsg('Already checked out today.')
      else toast('Check-out failed. Please try again.', 'error')
    }
  }

  if (!canMarkAttendance) return null

  return (
    <div className="bg-surface-1 border border-border-default rounded-xl p-8 flex flex-col items-center gap-6">

      {/* Date header */}
      <div className="text-center">
        <h2 className="font-display font-bold text-[18px] text-text-1">Your Attendance</h2>
        <p className="font-mono text-[12px] text-text-4 mt-1">{dateLabel}</p>
      </div>

      {/* ── Loading ── */}
      {isLoading && (
        <div className="w-24 h-24 rounded-full bg-surface-2 animate-pulse" />
      )}

      {/* ── Holiday ── */}
      {!isLoading && todayHoliday && (
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-24 h-24 rounded-full bg-text-4/10 border-2 border-text-4/20 flex items-center justify-center">
            <Palmtree size={40} className="text-text-3" />
          </div>
          <div>
            <p className="font-display font-bold text-[18px] text-text-2">Public Holiday</p>
            <p className="font-ui text-[13px] text-text-3 mt-0.5">{todayHoliday.name} — enjoy your day off!</p>
          </div>
        </div>
      )}

      {/* ── Day off (Sunday or non-working Saturday) ── */}
      {!isLoading && !todayHoliday && isDayOff && (
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-24 h-24 rounded-full bg-service-dev/10 border-2 border-service-dev/20 flex items-center justify-center">
            <Calendar size={40} className="text-service-dev" />
          </div>
          <div>
            <p className="font-display font-bold text-[18px] text-service-dev">Weekend</p>
            <p className="font-ui text-[13px] text-text-3 mt-0.5">
              {isSunday ? 'Sundays are off — see you tomorrow!' : 'Saturdays are off — see you Monday!'}
            </p>
          </div>
        </div>
      )}

      {/* ── Checked in ── */}
      {!isLoading && !todayHoliday && !isDayOff && today && (() => {
        const checkedOut = Boolean(today.check_out)
        const isLate     = today.status === 'late'
        return (
          <>
            {today.device_flagged && (
              <div className="w-full flex items-start gap-2.5 bg-warning/8 border border-warning/25 rounded-md px-3.5 py-2.5">
                <AlertCircle size={14} className="text-warning flex-shrink-0 mt-0.5" />
                <p className="font-ui text-[12px] text-warning">Unrecognised device — HR has been notified and will review it.</p>
              </div>
            )}
            {errorMsg && <ErrorBanner msg={errorMsg} />}

            <div className={cn(
              'w-24 h-24 rounded-full border-2 flex items-center justify-center',
              checkedOut ? 'bg-text-4/10 border-text-4/20'
                : isLate ? 'bg-warning/15 border-warning/40'
                : 'bg-success/15 border-success/40',
            )}>
              <CheckCircle2 size={40} className={checkedOut ? 'text-text-4' : isLate ? 'text-warning' : 'text-success'} />
            </div>

            <div className="text-center">
              <p className={cn('font-display font-bold text-[18px]',
                checkedOut ? 'text-text-2' : isLate ? 'text-warning' : 'text-success',
              )}>
                {checkedOut ? 'Day Complete' : isLate ? 'Checked In (Late)' : 'Checked In'}
              </p>
              <p className="font-mono text-[13px] text-text-3 mt-0.5">
                {today.check_in && fmtIso(today.check_in)}
                {checkedOut && today.check_out && (
                  <> → {fmtIso(today.check_out)}
                    <span className="text-text-4 ml-1.5">
                      · {sessionDuration(today.check_in!, today.check_out)}
                    </span>
                  </>
                )}
              </p>
            </div>

            {!checkedOut && (
              <Button variant="secondary" size="sm" onClick={handleCheckOut} disabled={checkOutMut.isPending}>
                <LogOut size={14} />
                {checkOutMut.isPending ? 'Checking out…' : 'Check Out'}
              </Button>
            )}

            <div className="flex items-center gap-5 text-[11.5px] font-mono text-text-4">
              {today.wifi_validated
                ? <span className="flex items-center gap-1.5"><Wifi size={12} className="text-success" /> Office WiFi</span>
                : <span className="flex items-center gap-1.5"><WifiOff size={12} /> No WiFi check</span>
              }
            </div>
          </>
        )
      })()}

      {/* ── Not checked in ── */}
      {!isLoading && !todayHoliday && !isDayOff && !today && (
        <>
          {isWorkingSat && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-service-mkt/10 border border-service-mkt/25 text-[11px] font-mono font-semibold text-service-mkt">
              <Calendar size={11} /> Working Saturday
            </div>
          )}
          {errorMsg && <ErrorBanner msg={errorMsg} />}

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
            <p className="font-mono text-[13px] text-text-3 mt-0.5">{clock}</p>
          </div>

          {deviceReady && (
            <div className="flex items-center gap-1.5 font-mono text-[10.5px] text-text-4">
              <Fingerprint size={11} />
              <span>{deviceNameVal} · {fingerprint.slice(0, 12)}…</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[11.5px] font-mono text-text-3">
            <span className="flex items-center gap-1.5"><Wifi size={12} className="text-success" /> Office Network Required</span>
            <span className="text-text-4">{fmtHHMM(workStart)} – {fmtHHMM(workEnd)} · {grace}m grace</span>
          </div>
        </>
      )}

    </div>
  )
}
