// Role-based access for People & Teams management.
// Mirrors the SQL helpers can_manage_target() / can_grant_role() and the
// authority model enforced by the admin_*_profile RPCs.
import type { UserRole } from '../types'

export const INTERNAL_ROLES = [
  'super_admin', 'admin', 'project_manager', 'team_lead', 'employee', 'hr', 'finance',
] as const
export type InternalRole = (typeof INTERNAL_ROLES)[number]

const has = (list: readonly string[], role: string | null | undefined): boolean =>
  !!role && list.includes(role)

/** HR + Admins manage the directory (invite, role/team/service, activate). */
export const canManagePeople = (role: string | null | undefined): boolean =>
  has(['super_admin', 'admin', 'hr'], role)

export const canInvite = canManagePeople

/** Only super_admin/admin may edit personal details (name, avatar). HR cannot. */
export const canEditDetails = (role: string | null | undefined): boolean =>
  has(['super_admin', 'admin'], role)

/** Can the actor manage (role/team/active) a user who currently holds targetRole? */
export function canManageTarget(actor: string | null | undefined, targetRole: string): boolean {
  if (actor === 'super_admin') return true
  if (actor === 'admin') return targetRole !== 'super_admin'
  if (actor === 'hr') return targetRole !== 'super_admin' && targetRole !== 'admin'
  return false
}

/** Roles the actor is allowed to grant. */
export function assignableRoles(actor: string | null | undefined): InternalRole[] {
  if (actor === 'super_admin') return [...INTERNAL_ROLES]
  if (actor === 'admin') return INTERNAL_ROLES.filter((r) => r !== 'super_admin')
  if (actor === 'hr') return INTERNAL_ROLES.filter((r) => r !== 'super_admin' && r !== 'admin')
  return []
}

/** Narrow a free-form role string to the UserRole union (for RoleBadge etc.). */
export function toUserRole(r: string): UserRole {
  switch (r) {
    case 'super_admin': case 'admin': case 'project_manager': case 'team_lead':
    case 'employee': case 'hr': case 'finance': case 'client_owner': case 'client_member':
      return r
    default: return 'employee'
  }
}
