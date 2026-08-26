// Authoritative (management) roles get the management experience and can
// see People / Teams. Everyone else (employee, finance, clients) gets the
// individual-contributor experience. Team Lead / PM are authoritative but see
// scoped data — that scoping is layered on inside the relevant pages.
export const AUTHORITATIVE_ROLES = [
  'super_admin', 'admin', 'hr', 'project_manager', 'team_lead',
] as const

export const isAuthoritative = (role: string | null | undefined): boolean =>
  !!role && (AUTHORITATIVE_ROLES as readonly string[]).includes(role)

/**
 * Roles that still get the inline "My Team" panel inside Attendance. Team leads
 * were dropped once /teams/:id gained an Attendance tab: that page is pinned to a
 * specific team, which is what a lead actually wants, and keeping both meant the
 * same rosters in two places. PMs oversee several teams and have no single "my
 * team" to be sent to, so they keep the cross-team panel.
 */
export const showsInlineTeamAttendance = (role: string | null | undefined): boolean =>
  role === 'project_manager'
