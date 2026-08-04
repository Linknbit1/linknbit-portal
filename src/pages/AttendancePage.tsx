import { Navigate } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext'
import { ATTENDANCE_ADMIN_LANDING_ROLES } from '../constants/roles'
import { useIsDesktop } from '../hooks/useMediaQuery'
import EmployeeAttendancePage from './employee/AttendancePage'
import { AttendanceHub } from './AttendanceMobile'

// Only Super Admin and Admin land on the management view; everyone else — HR
// included, since HR is a tracked employee who also files their own requests —
// gets the self-service view. On mobile this renders a hub → stack screens.
export default function AttendancePage() {
  const { profile } = useAuthContext()
  const isDesktop = useIsDesktop()
  const role = profile?.role ?? ''

  if (!isDesktop) return <AttendanceHub />

  // Desktop management has no combined "Attendance" page any more — each section
  // is its own page, so land on Daily Records (the sidebar dropdown mirrors this).
  return ATTENDANCE_ADMIN_LANDING_ROLES.includes(role)
    ? <Navigate to="/attendance/records" replace />
    : <EmployeeAttendancePage />
}
