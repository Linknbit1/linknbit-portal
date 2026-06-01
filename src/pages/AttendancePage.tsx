import { useAuthContext } from '../context/AuthContext'
import { ATTENDANCE_ADMIN_ROLES } from '../constants/roles'
import AdminAttendancePage from './admin/AttendancePage'
import EmployeeAttendancePage from './employee/AttendancePage'

export default function AttendancePage() {
  const { profile } = useAuthContext()
  const role = profile?.role ?? ''
  return ATTENDANCE_ADMIN_ROLES.includes(role)
    ? <AdminAttendancePage />
    : <EmployeeAttendancePage />
}
