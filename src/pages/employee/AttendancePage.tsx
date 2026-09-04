import {
  CalendarCheck,
  Home,
  LogIn,
  LogOut,
  MapPin,
  Palmtree,
  Calendar,
} from 'lucide-react'
import { Topbar } from '../../components/layout/Topbar'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import {
  useMyMonthlyAttendance,
  useMyExceptions,
  useOooDepart,
  useOooReturn,
  useHolidays,
  useWorkingSaturdays,
  useCompanyWfhDays,
} from '../../hooks/useAttendance'
import { AttendanceCheckInCard } from '../../components/shared/AttendanceCheckInCard'
import { MyDevicesCard } from '../../components/shared/MyDevicesCard'
import { useToast } from '../../components/ui/toast-context'
import { cn } from '../../lib/cn'
import { AttendanceChips } from '../../components/shared/AttendanceChips'
import type { AttendanceRow } from '../../api/attendance'

function localToday(): string {
  return new Intl.DateTimeFormat('en-CA').format(new Date())
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function calcHours(checkIn: string | null, checkOut: string | null, excludedMinutes = 0): string {
  if (!checkIn || !checkOut) return '-'
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
              <span className={cn('text-[10px] font-mono font-semibold px-2 py-0.5 rounded-sm border shrink-0', meta.pill)}>
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
                  {row.device_name ?? '-'}
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
      toast('Out of office logged, see you back soon!', 'success')
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
              ? `Departed at ${new Date(todayOoo.actual_departure).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}, tap "I'm Back" when you return`
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
  // This month, fixed. The month stepper and the Present/Late/Absent/Leave
  // cards that sat above the history table are gone: the page is a place to
  // file and track your own requests, and a month of counts was a second,
  // quieter version of the report that already lives under Reports.
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1 // 1-indexed

  const { data: history = [], isLoading } = useMyMonthlyAttendance(year, month)

  const periodLabel = `${MONTH_NAMES[month - 1]} ${year}`

  return (
      <div className="px-4 py-6 lg:px-8 lg:py-7 flex flex-col gap-6">
        <AttendanceCheckInCard />

        {/* Facts about your own attendance, and nothing you file. The four
            request sections that used to sit here — WFH, leave, exceptions,
            overtime — were a second copy of the queue at /attendance/requests,
            each with its own form and its own history of the same rows. Filing,
            editing and withdrawing all happen there now, for everybody, and the
            leave balances went with them: they belong beside the picker that
            spends one, not on a page you cannot request from.

            The Teams panel went the same way. It was unscoped, so it showed
            exactly what Today and Requests already show this reader. A team's
            own attendance still lives on that team's page.

            Ordering is by how often it is read: what is happening now, what is
            coming, what has already happened, and last the devices — set once
            when you enrol a phone and rarely looked at again. */}
        <UpcomingScheduleSection />

        {/* OOO active state — shown only when employee has an approved OOO today */}
        <OooSection />

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

        <MyDevicesCard />
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
