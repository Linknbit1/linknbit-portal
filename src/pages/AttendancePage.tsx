import { Navigate } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext'
import { MGMT_ROLES } from '../constants/roles'
import { useIsDesktop } from '../hooks/useMediaQuery'
import EmployeeAttendancePage from './employee/AttendancePage'
import { AttendanceHub } from './AttendanceMobile'

// Super Admin, Admin, and HR get the full management view; everyone else gets
// the employee self-service view. On mobile both render a hub → stack screens.
export default function AttendancePage() {
  const { profile } = useAuthContext()
  const isDesktop = useIsDesktop()
  const role = profile?.role ?? ''

  if (!isDesktop) return <AttendanceHub />

  // Desktop management has no combined "Attendance" page any more — each section
  // is its own page, so land on Daily Records (the sidebar dropdown mirrors this).
  return MGMT_ROLES.includes(role)
    ? <Navigate to="/attendance/records" replace />
    : <EmployeeAttendancePage />
}
