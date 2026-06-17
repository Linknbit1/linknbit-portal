import type { ReactNode } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import {
  Users, Home, Plane, AlertCircle, Smartphone, Palmtree, Hourglass, BarChart2,
  Settings as SettingsIcon, CalendarClock,
} from 'lucide-react'
import { MobileHub, type HubRowItem } from '../components/layout/MobileHub'
import { StackScreen } from '../components/layout/StackScreen'
import { useAuthContext } from '../context/AuthContext'
import { useIsDesktop } from '../hooks/useMediaQuery'
import { MGMT_ROLES } from '../constants/roles'
import { useMyAttendanceHistory } from '../hooks/useAttendance'
import {
  useAllWfhRequests, useAllLeaveRequests, useAllAttendanceExceptions, useAllOvertimeRequests,
} from '../hooks/useAttendance'
import { useEnrolledDevices } from '../hooks/useEnrolledDevices'

// Admin tab components (reused as full-screen sections on mobile)
import {
  DailyRecordsTab, WFHRequestsTab, LeaveTab, ExceptionsTab, EnrolledDevicesTab,
  HolidaysTab, OvertimeTab, ReportsTab, SettingsTab,
} from './admin/AttendancePage'
// Employee section components
import {
  WfhSection, LeaveSection, MyExceptionsSection, OvertimeSection, UpcomingScheduleSection,
  OooSection, SummaryStats, HistoryTable,
} from './employee/AttendancePage'
import { AttendanceCheckInCard } from '../components/shared/AttendanceCheckInCard'
import { MyDevicesCard } from '../components/shared/MyDevicesCard'
import { TeamAttendancePanel } from '../components/shared/TeamAttendancePanel'

interface SectionEntry {
  title: string
  render: () => ReactNode
}

const ADMIN_SECTIONS: Record<string, SectionEntry> = {
  records:    { title: 'Daily Records',    render: () => <DailyRecordsTab /> },
  wfh:        { title: 'WFH Requests',     render: () => <WFHRequestsTab /> },
  leave:      { title: 'Leave',            render: () => <LeaveTab /> },
  exceptions: { title: 'Exceptions',       render: () => <ExceptionsTab /> },
  devices:    { title: 'Enrolled Devices', render: () => <EnrolledDevicesTab /> },
  schedule:   { title: 'Schedule',         render: () => <HolidaysTab /> },
  overtime:   { title: 'Overtime',         render: () => <OvertimeTab /> },
  reports:    { title: 'Reports',          render: () => <ReportsTab /> },
  settings:   { title: 'Settings',         render: () => <SettingsTab /> },
}

function EmployeeHistoryScreen() {
  const { data: history = [] } = useMyAttendanceHistory(30)
  return <HistoryTable records={history} />
}

const EMPLOYEE_SECTIONS: Record<string, SectionEntry> = {
  history:    { title: 'History',          render: () => <EmployeeHistoryScreen /> },
  wfh:        { title: 'WFH Requests',     render: () => <WfhSection /> },
  leave:      { title: 'Leave',            render: () => <LeaveSection /> },
  exceptions: { title: 'Exceptions',       render: () => <MyExceptionsSection /> },
  overtime:   { title: 'Overtime',         render: () => <OvertimeSection /> },
  schedule:   { title: 'Schedule',         render: () => <UpcomingScheduleSection /> },
  team:       { title: 'Team Attendance',  render: () => <TeamAttendancePanel /> },
  devices:    { title: 'My Devices',       render: () => <MyDevicesCard /> },
}

function AdminAttendanceHub() {
  const { data: pendingWfh = [] } = useAllWfhRequests('pending')
  const { data: pendingLeave = [] } = useAllLeaveRequests('pending')
  const { data: pendingExc = [] } = useAllAttendanceExceptions({ status: 'pending' })
  const { data: pendingOt = [] } = useAllOvertimeRequests('pending')
  const { data: devices = [] } = useEnrolledDevices()
  const pendingDevices = devices.filter((d) => !d.approved_by && d.is_active).length

  const items: HubRowItem[] = [
    { to: '/attendance/records',    label: 'Daily Records',    icon: Users },
    { to: '/attendance/wfh',        label: 'WFH Requests',     icon: Home,        badge: pendingWfh.length },
    { to: '/attendance/leave',      label: 'Leave',            icon: Plane,       badge: pendingLeave.length },
    { to: '/attendance/exceptions', label: 'Exceptions',       icon: AlertCircle, badge: pendingExc.length },
    { to: '/attendance/devices',    label: 'Enrolled Devices', icon: Smartphone,  badge: pendingDevices },
    { to: '/attendance/schedule',   label: 'Schedule',         icon: Palmtree },
    { to: '/attendance/overtime',   label: 'Overtime',         icon: Hourglass,   badge: pendingOt.length },
    { to: '/attendance/reports',    label: 'Reports',          icon: BarChart2 },
    { to: '/attendance/settings',   label: 'Settings',         icon: SettingsIcon },
  ]
  return <MobileHub title="Attendance" items={items} />
}

function EmployeeAttendanceHub() {
  const { data: history = [], isLoading } = useMyAttendanceHistory(30)
  const { profile } = useAuthContext()
  const canSeeTeam = profile?.role === 'team_lead' || profile?.role === 'project_manager'

  const items: HubRowItem[] = [
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
      {!isLoading && <SummaryStats records={history} />}
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

  if (isDesktop) return <Navigate to="/attendance" replace />

  const isMgmt = MGMT_ROLES.includes(profile?.role ?? '')
  const map = isMgmt ? ADMIN_SECTIONS : EMPLOYEE_SECTIONS
  const entry = section ? map[section] : undefined

  // Guard the team section to leads / PMs.
  const canSeeTeam = profile?.role === 'team_lead' || profile?.role === 'project_manager'
  if (!entry || (section === 'team' && !canSeeTeam)) return <Navigate to="/attendance" replace />

  return <StackScreen title={entry.title}>{entry.render()}</StackScreen>
}
