import { useAuthContext } from '../context/AuthContext'
import { ATTENDANCE_ADMIN_ROLES } from '../components/layout/RoleGuard'
import AdminAttendancePage from './admin/AttendancePage'
import EmployeeAttendancePage from './employee/AttendancePage'

export default function AttendancePage() {
  const { profile } = useAuthContext()
  const role = profile?.role ?? ''
  return (ATTENDANCE_ADMIN_ROLES as string[]).includes(role)
    ? <AdminAttendancePage />
    : <EmployeeAttendancePage />
}
