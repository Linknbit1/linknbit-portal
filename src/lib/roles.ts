/**
 * The client/staff line — the one thing in the portal still decided by which
 * role somebody holds.
 *
 * It is not a capability and no permission could express it: it is the boundary
 * the whole permission system sits inside, mirroring `is_internal()` in SQL.
 * Everything else that used to live here — isAuthoritative(), the management
 * role lists, showsInlineTeamAttendance() — is now a permission. See the
 * Permission Rules section of CLAUDE.md.
 */
const CLIENT_PORTAL_ROLES: readonly string[] = ['client_owner', 'client_member']

export const isClientRole = (role: string | null | undefined): boolean =>
  !!role && CLIENT_PORTAL_ROLES.includes(role)

export const isInternalRole = (role: string | null | undefined): boolean =>
  !!role && !CLIENT_PORTAL_ROLES.includes(role)
