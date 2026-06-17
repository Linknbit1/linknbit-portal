import { useAuthContext } from '../context/AuthContext'
import { MGMT_ROLES } from '../constants/roles'
import { useIsDesktop } from '../hooks/useMediaQuery'
import AdminAttendancePage from './admin/AttendancePage'
import EmployeeAttendancePage from './employee/AttendancePage'
import { AttendanceHub } from './AttendanceMobile'

// Super Admin, Admin, and HR get the full management view; everyone else gets
// the employee self-service view. On mobile both render a hub → stack screens.
export default function AttendancePage() {
  const { profile } = useAuthContext()
  const isDesktop = useIsDesktop()
  const role = profile?.role ?? ''

  if (!isDesktop) return <AttendanceHub />

  return MGMT_ROLES.includes(role)
    ? <AdminAttendancePage />
    : <EmployeeAttendancePage />
}
