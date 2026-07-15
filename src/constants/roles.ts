export const MGMT_ROLES: readonly string[] = ['super_admin', 'admin', 'hr']
// Everyone internal can open Settings — the personal sections (My Devices,
// Notifications) belong to all staff. The admin-only sections filter themselves
// in-page via visibleSectionsFor(), so widening the route is safe: HR still
// can't see Services, an employee only sees their own two sections.
export const SETTINGS_ROLES: readonly string[] = [
  'super_admin', 'admin', 'hr', 'project_manager', 'team_lead', 'employee', 'finance',
]
