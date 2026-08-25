import { useState } from 'react'
import type { ReactNode } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import {
  Users, Home, Plane, AlertCircle, Smartphone, Palmtree, Hourglass,
  CalendarClock, Calendar, CalendarCheck, Inbox, CalendarDays,
} from 'lucide-react'
import { MobileHub, HubRow, type HubRowItem } from '../components/layout/MobileHub'
import { StackScreen } from '../components/layout/StackScreen'
import { Topbar } from '../components/layout/Topbar'
import { PeriodStepper } from '../components/ui/PeriodStepper'
import { useAuthContext } from '../context/AuthContext'
import { useIsDesktop } from '../hooks/useMediaQuery'
import { MGMT_ROLES } from '../constants/roles'
import { useMyMonthlyAttendance } from '../hooks/useAttendance'
import {
  useAllWfhRequests, useAllLeaveRequests, useAllAttendanceExceptions, useAllOvertimeRequests,
} from '../hooks/useAttendance'

// Admin tab components (reused as full-screen sections on mobile)
import {
  DailyRecordsTab, WFHRequestsTab, LeaveTab, ExceptionsTab, EnrolledDevicesTab,
  HolidaysTab, OvertimeTab, ReportsTab, SettingsTab,
} from './admin/AttendancePage'
// Employee section components
import {
  WfhSection, LeaveSection, MyExceptionsSection, OvertimeSection, UpcomingScheduleSection,
  OooSection, SummaryStats, HistoryTable, MyAttendanceSections,
} from './employee/AttendancePage'
import { AttendanceCheckInCard } from '../components/shared/AttendanceCheckInCard'
import { TodayRoster } from '../components/shared/TodayRoster'
import { AttendanceRequests } from '../components/shared/AttendanceRequests'
import { AttendanceCalendar } from '../components/shared/AttendanceCalendar'
import { BiometricTerminalsTab } from '../components/shared/BiometricTerminalsTab'
import { MyDevicesCard } from '../components/shared/MyDevicesCard'
import {
  TeamRoster, TeamWfhList, TeamLeaveList, TeamExceptionsList, TeamOvertimeList,
} from '../components/shared/TeamAttendancePanel'
import { showsInlineTeamAttendance } from '../lib/roles'

interface SectionEntry {
  title: string
  render: () => ReactNode
}

/**
 * Sections any internal role may open. The desktop branch below otherwise only
 * resolves ADMIN_SECTIONS, which would bounce the four non-management roles off
 * a row their own sidebar offers them. `day_roster` does its own gating — it
 * withholds the private detail rather than the whole screen — so the route does
 * not need to.
 */
const OPEN_SECTIONS: Record<string, SectionEntry> = {
  today:    { title: 'Today',    render: () => <TodayRoster /> },
  calendar: { title: 'Calendar', render: () => <AttendanceCalendar /> },
  requests: { title: 'Requests', render: () => <AttendanceRequests /> },
}

const ADMIN_SECTIONS: Record<string, SectionEntry> = {
  ...OPEN_SECTIONS,
  records:    { title: 'Daily Records',    render: () => <DailyRecordsTab /> },
  wfh:        { title: 'WFH Requests',     render: () => <WFHRequestsTab /> },
  leave:      { title: 'Leave',            render: () => <LeaveTab /> },
  exceptions: { title: 'Exceptions',       render: () => <ExceptionsTab /> },
  devices:    { title: 'Enrolled Devices', render: () => <EnrolledDevicesTab /> },
  terminals:  { title: 'Terminals',        render: () => <BiometricTerminalsTab /> },
  schedule:   { title: 'Schedule',         render: () => <HolidaysTab /> },
  overtime:   { title: 'Overtime',         render: () => <OvertimeTab /> },
  reports:    { title: 'Reports',          render: () => <ReportsTab /> },
  settings:   { title: 'Settings',         render: () => <SettingsTab /> },
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** Month state + a ready-to-render prev/next stepper, shared by the mobile hub and history screen. */
function useMonthFilter() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1) // 1-indexed

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

  const stepper = (
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
  )

  return { year, month, periodLabel, stepper }
}

function EmployeeHistoryScreen() {
  const { year, month, periodLabel, stepper } = useMonthFilter()
  const { data: history = [] } = useMyMonthlyAttendance(year, month)
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">{stepper}</div>
      <HistoryTable records={history} periodLabel={periodLabel} />
    </div>
  )
}

const EMPLOYEE_SECTIONS: Record<string, SectionEntry> = {
  ...OPEN_SECTIONS,
  history:    { title: 'History',          render: () => <EmployeeHistoryScreen /> },
  wfh:        { title: 'WFH Requests',     render: () => <WfhSection /> },
  leave:      { title: 'Leave',            render: () => <LeaveSection /> },
  exceptions: { title: 'Exceptions',       render: () => <MyExceptionsSection /> },
  overtime:   { title: 'Overtime',         render: () => <OvertimeSection /> },
  schedule:   { title: 'Schedule',         render: () => <UpcomingScheduleSection /> },
  devices:    { title: 'My Devices',       render: () => <MyDevicesCard /> },
}

// Team Attendance (team_lead / PM): its own sub-hub of stack screens so the lead
// drills into Today's Roster, WFH, Leave, etc. instead of in-card tabs. Each list
// is cardless content, so we wrap it in a card inside the stack screen.
const TEAM_SECTIONS: { key: string; title: string; label: string; icon: typeof Users; render: () => ReactNode }[] = [
  { key: 'roster',     title: "Today's Roster", label: "Today's Roster", icon: Users,       render: () => <TeamRoster /> },
  { key: 'wfh',        title: 'WFH Requests',   label: 'WFH Requests',   icon: Home,        render: () => <TeamWfhList /> },
  { key: 'leave',      title: 'Leave',          label: 'Leave',          icon: Plane,       render: () => <TeamLeaveList /> },
  { key: 'exceptions', title: 'Exceptions',     label: 'Exceptions',     icon: AlertCircle, render: () => <TeamExceptionsList /> },
  { key: 'overtime',   title: 'Overtime',       label: 'Overtime',       icon: Hourglass,   render: () => <TeamOvertimeList /> },
]

function TeamCard({ children }: { children: ReactNode }) {
  return <div className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">{children}</div>
}

/** Mobile team sub-hub: /attendance/team → rows that push /attendance/team/:sub. */
function TeamHub() {
  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Team Attendance" back="/attendance" />
      <div className="px-4 py-5 flex flex-col gap-2.5 w-full max-w-content mx-auto">
        {TEAM_SECTIONS.map((s) => (
          <HubRow key={s.key} to={`/attendance/team/${s.key}`} label={s.label} icon={s.icon} />
        ))}
      </div>
    </div>
  )
}

function AdminAttendanceHub() {
  const { data: pendingWfh = [] } = useAllWfhRequests('pending')
  const { data: pendingLeave = [] } = useAllLeaveRequests('pending')
  const { data: pendingExc = [] } = useAllAttendanceExceptions({ status: 'pending' })
  const { data: pendingOt = [] } = useAllOvertimeRequests('pending')
  // The four queues are one row now, so their counts sum onto it.
  const pendingRequests =
    pendingWfh.length + pendingLeave.length + pendingExc.length + pendingOt.length

  const items: HubRowItem[] = [
    { to: '/attendance/today',      label: 'Today',            icon: CalendarCheck },
    { to: '/attendance/calendar',   label: 'Calendar',         icon: CalendarDays },
    { to: '/attendance/requests',   label: 'Requests',         icon: Inbox, badge: pendingRequests },
    // Managers file their own requests too — this is their self-service view.
    { to: '/attendance/me',         label: 'My Attendance',    icon: CalendarClock },
    { to: '/attendance/records',    label: 'Daily Records',    icon: Users },
  ]
  return (
    <MobileHub title="Attendance" items={items}>
      <AttendanceCheckInCard />
      <OooSection />
    </MobileHub>
  )
}

function EmployeeAttendanceHub() {
  const { year, month, stepper } = useMonthFilter()
  const { data: history = [], isLoading } = useMyMonthlyAttendance(year, month)
  const { profile } = useAuthContext()
  const canSeeTeam = showsInlineTeamAttendance(profile?.role)

  const items: HubRowItem[] = [
    { to: '/attendance/today',      label: 'Today',          icon: CalendarCheck },
    { to: '/attendance/calendar',   label: 'Calendar',       icon: CalendarDays },
    { to: '/attendance/requests',   label: 'Requests',       icon: Inbox },
    { to: '/attendance/history',    label: 'History',        icon: CalendarClock },
    { to: '/attendance/wfh',        label: 'WFH Requests',   icon: Home },
    { to: '/attendance/leave',      label: 'Leave',          icon: Plane },
    { to: '/attendance/exceptions', label: 'Exceptions',     icon: AlertCircle },
    { to: '/attendance/overtime',   label: 'Overtime',       icon: Hourglass },
    { to: '/attendance/schedule',   label: 'Schedule',       icon: Palmtree },
    ...(canSeeTeam ? [{ to: '/attendance/team', label: 'Team Attendance', icon: Users }] : []),
    { to: '/attendance/devices',    label: 'My Devices',     icon: Smartphone },
  ]

  return (
    <MobileHub title="My Attendance" items={items}>
      <AttendanceCheckInCard />
      <OooSection />
      <div className="flex flex-wrap items-center gap-3">{stepper}</div>
      {!isLoading && <SummaryStats records={history} year={year} month={month} />}
    </MobileHub>
  )
}

/** Mobile-only landing for /attendance: role-aware hub. */
export function AttendanceHub() {
  const { profile } = useAuthContext()
  return MGMT_ROLES.includes(profile?.role ?? '') ? <AdminAttendanceHub /> : <EmployeeAttendanceHub />
}

/** Mobile-only /attendance/:section stack screen; redirects on desktop. */
export function AttendanceSectionScreen() {
  const isDesktop = useIsDesktop()
  const { profile } = useAuthContext()
  const { section } = useParams()

  const isMgmtRole = MGMT_ROLES.includes(profile?.role ?? '')

  // Self-service view for the roles whose /attendance is the management landing.
  // Same on both breakpoints — only the back affordance differs.
  if (section === 'me') {
    return (
      <div className="flex flex-col flex-1">
        <Topbar title="My Attendance" back={isDesktop ? false : '/attendance'} />
        <MyAttendanceSections />
      </div>
    )
  }

  // Desktop: each section is a full page of its own (the sidebar dropdown
  // navigates here rather than switching an in-page tab).
  if (isDesktop) {
    const desktopEntry = section
      ? (OPEN_SECTIONS[section] ?? (isMgmtRole ? ADMIN_SECTIONS[section] : undefined))
      : undefined
    if (!desktopEntry) return <Navigate to="/attendance" replace />
    return (
      <div className="flex flex-col flex-1">
        <Topbar title={desktopEntry.title} />
        <div className="px-4 py-6 lg:px-8 lg:py-7 flex flex-col gap-6">
          <h2 className="font-display font-bold text-[22px] text-text-1">{desktopEntry.title}</h2>
          {/* Managers check in/out here too — Daily Records is the landing page. */}
          {section === 'records' && <AttendanceCheckInCard />}
          {desktopEntry.render()}
        </div>
      </div>
    )
  }

  const canSeeTeam = showsInlineTeamAttendance(profile?.role)

  // Team Attendance is its own sub-hub of stack screens (not a single panel).
  if (section === 'team') {
    return canSeeTeam ? <TeamHub /> : <Navigate to="/attendance" replace />
  }

  const isMgmt = MGMT_ROLES.includes(profile?.role ?? '')
  const map = isMgmt ? ADMIN_SECTIONS : EMPLOYEE_SECTIONS
  const entry = section ? map[section] : undefined
  if (!entry) return <Navigate to="/attendance" replace />

  return <StackScreen title={entry.title}>{entry.render()}</StackScreen>
}

/** Mobile-only /attendance/team/:sub stack screen; redirects on desktop. */
export function TeamAttendanceSectionScreen() {
  const isDesktop = useIsDesktop()
  const { profile } = useAuthContext()
  const { sub } = useParams()

  if (isDesktop) return <Navigate to="/attendance" replace />

  const canSeeTeam = showsInlineTeamAttendance(profile?.role)
  if (!canSeeTeam) return <Navigate to="/attendance" replace />

  const entry = TEAM_SECTIONS.find((s) => s.key === sub)
  if (!entry) return <Navigate to="/attendance/team" replace />

  return <StackScreen title={entry.title}><TeamCard>{entry.render()}</TeamCard></StackScreen>
}
