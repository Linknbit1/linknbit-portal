import { Navigate } from 'react-router-dom'
import { useCanAccess } from '../hooks/useRoleFlags'
import { useIsDesktop } from '../hooks/useMediaQuery'
import EmployeeAttendancePage from './employee/AttendancePage'
import { AttendanceHub } from './AttendanceMobile'

// Only Super Admin and Admin land on the management view; everyone else — HR
// included, since HR is a tracked employee who also files their own requests —
// gets the self-service view. On mobile this renders a hub → stack screens.
export default function AttendancePage() {
  const isDesktop = useIsDesktop()
  const canManageAttendance = useCanAccess('can_manage_attendance')

  if (!isDesktop) return <AttendanceHub />

  // Desktop management has no combined "Attendance" page any more — each section
  // is its own page. Land on Today: the roster answers the question people open
  // this section to ask, and Daily Records is one row away when it doesn't.
  return canManageAttendance
    ? <Navigate to="/attendance/today" replace />
    : <EmployeeAttendancePage />
}
