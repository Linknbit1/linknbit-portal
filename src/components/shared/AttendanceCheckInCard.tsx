import { useState, useEffect, type ReactNode } from 'react'
import {
  MapPin, CheckCircle2, LogOut, Wifi, WifiOff,
  AlertCircle, Fingerprint, Palmtree, Calendar,
  Home, Plane, XCircle, Clock, ShieldX,
} from 'lucide-react'
import {
  useMyTodayAttendance,
  useCheckIn,
  useCheckOut,
  useAttendanceSettings,
  useHolidays,
  useWorkingSaturdays,
} from '../../hooks/useAttendance'
import { useCurrentDevice } from '../../hooks/useCurrentDevice'
import { useRegisterDevice } from '../../hooks/useEnrolledDevices'
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
      <AlertCircle size={14} className="text-error shrink-0 mt-0.5" />
      <p className="font-ui text-[12px] text-error">{msg}</p>
    </div>
  )
}

type DeviceNoticeTone = 'info' | 'pending' | 'blocked'

const DEVICE_NOTICE_TONE: Record<DeviceNoticeTone, { ring: string; fg: string }> = {
  info:    { ring: 'bg-brand-red/10 border-brand-red/30', fg: 'text-brand-red' },
  pending: { ring: 'bg-warning/10 border-warning/30',     fg: 'text-warning' },
  blocked: { ring: 'bg-error/10 border-error/30',         fg: 'text-error' },
}

function DeviceNotice({
  tone, icon: Icon, title, body, action,
}: {
  tone: DeviceNoticeTone
  icon: typeof Fingerprint
  title: string
  body: string
  action?: ReactNode
}) {
  const t = DEVICE_NOTICE_TONE[tone]
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className={cn('size-24 rounded-full border-2 flex items-center justify-center', t.ring)}>
        <Icon size={38} className={t.fg} />
      </div>
      <div className="max-w-[280px]">
        <p className={cn('font-display font-bold text-[18px]', t.fg)}>{title}</p>
        <p className="font-ui text-[12.5px] text-text-3 mt-1">{body}</p>
      </div>
      {action}
    </div>
  )
}

// Shared root for both the live card and its skeleton — a fixed min-height with
// vertical centering keeps every state (and the loading skeleton) the same
// height, so the summary cards below never shift when data resolves.
const CARD_ROOT_CLS =
  'bg-surface-1 border border-border-default rounded-xl p-8 flex flex-col items-center justify-center gap-6 min-h-[392px]'

function CheckInCardSkeleton() {
  return (
    <div className={cn(CARD_ROOT_CLS, 'animate-pulse')}>
      {/* Date header */}
      <div className="flex flex-col items-center gap-1.5">
        <div className="h-[18px] w-40 rounded bg-surface-2" />
        <div className="h-3 w-52 rounded bg-surface-2" />
      </div>
      {/* Action circle */}
      <div className="size-24 rounded-full bg-surface-2" />
      {/* Title + time */}
      <div className="flex flex-col items-center gap-1.5">
        <div className="h-[18px] w-28 rounded bg-surface-2" />
        <div className="h-3.5 w-20 rounded bg-surface-2" />
      </div>
      {/* Device fingerprint line */}
      <div className="h-3 w-44 rounded bg-surface-2" />
      {/* Footer */}
      <div className="h-3 w-56 rounded bg-surface-2" />
    </div>
  )
}

export function AttendanceCheckInCard() {
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
  const registerMut = useRegisterDevice()

  const { fingerprint, deviceName: deviceNameVal, ready: deviceReady, status: deviceStatus, canCheckIn } =
    useCurrentDevice()

  const [errorMsg, setErrorMsg]           = useState<string | null>(null)
  const [clock, setClock]                 = useState('')

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
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      const msg  = err instanceof Error ? err.message : 'Check-in failed'
      if      (code === 'outside_window')      setErrorMsg(msg)
      else if (code === 'wrong_network')       setErrorMsg('You must be on the office WiFi to check in.')
      else if (code === 'duplicate')           setErrorMsg('You have already checked in today.')
      else if (code === 'on_leave')            setErrorMsg('You are on approved leave today.')
      else if (code === 'holiday')             setErrorMsg(msg || 'Check-in is not allowed on a holiday.')
      else if (code === 'device_unregistered') setErrorMsg('This device isn’t registered. Register it below, then ask an admin to approve it.')
      else if (code === 'device_pending')      setErrorMsg('This device is awaiting admin approval.')
      else if (code === 'device_blocked')      setErrorMsg('This device has been blocked. Contact your admin to use it.')
      else                                     setErrorMsg(msg || 'Check-in failed. Please try again.')
    }
  }

  const handleRegister = async () => {
    setErrorMsg(null)
    try {
      const res = await registerMut.mutateAsync({ deviceFingerprint: fingerprint, deviceName: deviceNameVal })
      toast(
        res.status === 'approved'
          ? 'Device registered and approved — you can check in now.'
          : 'Device registered — an admin will review it shortly.',
        'success',
      )
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      const msg  = err instanceof Error ? err.message : 'Registration failed'
      if (code === 'device_blocked') setErrorMsg('This device has been blocked. Contact your admin to use it.')
      else                           setErrorMsg(msg || 'Registration failed. Please try again.')
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

  if (isLoading) return <CheckInCardSkeleton />

  return (
    <div className={CARD_ROOT_CLS}>

      {/* Date header */}
      <div className="text-center">
        <h2 className="font-display font-bold text-[18px] text-text-1">Your Attendance</h2>
        <p className="font-mono text-[12px] text-text-4 mt-1">{dateLabel}</p>
      </div>

      {/* ── Holiday ── */}
      {todayHoliday && (
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="size-24 rounded-full bg-text-4/10 border-2 border-text-4/20 flex items-center justify-center">
            <Palmtree size={40} className="text-text-3" />
          </div>
          <div>
            <p className="font-display font-bold text-[18px] text-text-2">Public Holiday</p>
            <p className="font-ui text-[13px] text-text-3 mt-0.5">{todayHoliday.name} — enjoy your day off!</p>
          </div>
        </div>
      )}

      {/* ── Day off (Sunday or non-working Saturday) ── */}
      {!todayHoliday && isDayOff && (
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="size-24 rounded-full bg-service-dev/10 border-2 border-service-dev/20 flex items-center justify-center">
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

      {/* ── Non-attendance day states (absent / leave / WFH) ── */}
      {/* A row can exist without a real check-in: the daily absence job inserts an
          'absent' row, and approved Leave/WFH sync 'leave'/'wfh' rows. Render the
          actual status instead of treating any row as "Checked In". */}
      {!todayHoliday && !isDayOff && today && !today.check_in && (() => {
        const meta = today.status === 'wfh'
          ? { icon: Home, ring: 'bg-service-dev/10 border-service-dev/30', fg: 'text-service-dev', title: 'Working From Home', sub: today.note || 'Approved work-from-home day.' }
          : today.status === 'leave'
          ? { icon: Plane, ring: 'bg-service-design/10 border-service-design/30', fg: 'text-service-design', title: 'On Leave', sub: today.note || 'Approved leave for today.' }
          : { icon: XCircle, ring: 'bg-error/10 border-error/30', fg: 'text-error', title: 'Marked Absent', sub: 'No check-in was recorded for today.' }
        return (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className={cn('size-24 rounded-full border-2 flex items-center justify-center', meta.ring)}>
              <meta.icon size={40} className={meta.fg} />
            </div>
            <div>
              <p className={cn('font-display font-bold text-[18px]', meta.fg)}>{meta.title}</p>
              <p className="font-ui text-[13px] text-text-3 mt-0.5">{meta.sub}</p>
            </div>
            {/* WFH days can still be checked in to track worked hours (no office WiFi). */}
            {today.status === 'wfh' && (
              <>
                {errorMsg && <ErrorBanner msg={errorMsg} />}
                {canCheckIn ? (
                  <Button size="sm" onClick={handleCheckIn} disabled={!deviceReady || checkInMut.isPending}>
                    <MapPin size={14} />
                    {checkInMut.isPending ? 'Checking in…' : 'Check In (WFH)'}
                  </Button>
                ) : (
                  <p className="font-ui text-[11.5px] text-text-4 max-w-[260px]">
                    Approve this device under “My Devices” to log your work-from-home hours.
                  </p>
                )}
                <p className="font-mono text-[10.5px] text-text-4">Office WiFi not required for WFH</p>
              </>
            )}
          </div>
        )
      })()}

      {/* ── Checked in (real self/admin check-in with a timestamp) ── */}
      {!todayHoliday && !isDayOff && today && today.check_in && (() => {
        const checkedOut = Boolean(today.check_out)
        const isLate     = today.status === 'late'
        return (
          <>
            {errorMsg && <ErrorBanner msg={errorMsg} />}

            <div className={cn(
              'size-24 rounded-full border-2 flex items-center justify-center',
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
      {!todayHoliday && !isDayOff && !today && (
        <>
          {isWorkingSat && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-service-mkt/10 border border-service-mkt/25 text-[11px] font-mono font-semibold text-service-mkt">
              <Calendar size={11} /> Working Saturday
            </div>
          )}
          {errorMsg && <ErrorBanner msg={errorMsg} />}

          {/* Device gating — only admins and approved devices reach the check-in button. */}
          {deviceReady && !canCheckIn && deviceStatus === 'unregistered' ? (
            <DeviceNotice
              tone="info"
              icon={Fingerprint}
              title="Register this device"
              body="Check-in is only allowed from devices an admin has approved. Register this device, then an admin will review it."
              action={
                <Button size="sm" onClick={handleRegister} disabled={registerMut.isPending}>
                  <Fingerprint size={14} />
                  {registerMut.isPending ? 'Registering…' : 'Register this device'}
                </Button>
              }
            />
          ) : deviceReady && !canCheckIn && deviceStatus === 'pending' ? (
            <DeviceNotice
              tone="pending"
              icon={Clock}
              title="Awaiting approval"
              body="This device is registered and waiting for an admin to approve it. You can check in once it’s approved."
            />
          ) : deviceReady && !canCheckIn && deviceStatus === 'blocked' ? (
            <DeviceNotice
              tone="blocked"
              icon={ShieldX}
              title="Device blocked"
              body="An admin has blocked this device. Contact your admin or use an approved device to check in."
            />
          ) : (
            <>
              <button
                onClick={handleCheckIn}
                disabled={!deviceReady || checkInMut.isPending}
                className={cn(
                  'size-24 rounded-full border-2 flex items-center justify-center transition-all duration-200',
                  'border-brand-red/50 bg-brand-red/10 hover:bg-brand-red/20 hover:border-brand-red hover:scale-105 active:scale-95',
                  (!deviceReady || checkInMut.isPending) && 'opacity-70 cursor-not-allowed',
                )}
              >
                {checkInMut.isPending
                  ? <span className="size-7 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
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
        </>
      )}

    </div>
  )
}
