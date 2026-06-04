import { useAuthContext } from '../context/AuthContext'
import { MGMT_ROLES } from '../constants/roles'
import AdminAttendancePage from './admin/AttendancePage'
import EmployeeAttendancePage from './employee/AttendancePage'

// Super Admin, Admin, and HR get the full management view; everyone else gets
// the employee self-service view.
export default function AttendancePage() {
  const { profile } = useAuthContext()
  const role = profile?.role ?? ''
  return MGMT_ROLES.includes(role)
    ? <AdminAttendancePage />
    : <EmployeeAttendancePage />
}
