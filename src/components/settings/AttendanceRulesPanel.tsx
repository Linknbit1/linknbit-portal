import { SettingsTab } from '../../pages/admin/AttendancePage'

/**
 * Attendance configuration, in Settings.
 *
 * A thin wrapper rather than a copy: the form is the one the Attendance module
 * has always used, so there is exactly one place where work hours, the lunch
 * break, grace and the office network are edited. Moving the markup here would
 * have left two forms writing the same row.
 */
export function AttendanceRulesPanel() {
  return <SettingsTab />
}
