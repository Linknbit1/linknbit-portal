export const MGMT_ROLES: readonly string[] = ['super_admin', 'admin', 'hr']

/**
 * Roles whose /attendance landing is the management view. HR manages attendance
 * but is also a tracked employee, so HR lands on their own record instead and
 * reaches the management sections through the sidebar (or "My Attendance" on
 * mobile). Everyone with `can_manage_attendance` can still open /attendance/me.
 */
export const ATTENDANCE_ADMIN_LANDING_ROLES: readonly string[] = ['super_admin', 'admin']
// Everyone internal can open Settings — the personal sections (My Devices,
// Notifications) belong to all staff. The admin-only sections filter themselves
// in-page via visibleSectionsFor(), so widening the route is safe: HR still
// can't see Services, an employee only sees their own two sections.
export const SETTINGS_ROLES: readonly string[] = [
  'super_admin', 'admin', 'hr', 'project_manager', 'team_lead', 'employee', 'finance',
]

/**
 * Roles that review other people's standups. Leads and PMs are included but see
 * only their own team — that scoping lives in RLS, not here.
 */
export const STANDUP_REVIEW_ROLES: readonly string[] = [
  'super_admin', 'admin', 'hr', 'project_manager', 'team_lead',
]

/** Client-portal roles. The /client/* tree is restricted to these. */
export const CLIENT_ROLES: readonly string[] = ['client_owner', 'client_member']

/**
 * Roles a chat channel can be granted to. Client-portal roles are excluded —
 * chat is internal-only, and the channel_roles CHECK constraint enforces the
 * same list server-side.
 */
export const CHANNEL_ROLE_OPTIONS: readonly string[] = [
  'super_admin', 'admin', 'project_manager', 'team_lead', 'employee', 'hr', 'finance',
]
