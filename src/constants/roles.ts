/**
 * Roles as data, not as rules.
 *
 * Everything that used to live here was a gate — MGMT_ROLES, SETTINGS_ROLES,
 * ATTENDANCE_ADMIN_LANDING_ROLES, STANDUP_REVIEW_ROLES, CLIENT_ROLES — and every
 * one is now a permission. See the Permission Rules section of CLAUDE.md, and
 * `lib/roles.ts` for the client/staff boundary, which is the one exception.
 *
 * What remains is a list of options for a picker, which is a fact about the
 * shape of the org rather than a decision about what anyone may do.
 */

/**
 * Roles a chat channel can be granted to. Client-portal roles are excluded —
 * chat is internal-only, and the channel_roles CHECK constraint enforces the
 * same list server-side.
 */
export const CHANNEL_ROLE_OPTIONS: readonly string[] = [
  'super_admin', 'admin', 'project_manager', 'team_lead', 'employee', 'hr', 'finance',
]
