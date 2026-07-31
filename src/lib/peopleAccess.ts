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

// NOTE: "can this role manage people at all?" is now a feature flag —
// use useCanManagePeople() from src/hooks/useRoleFlags.ts. What remains here is the
// authority HIERARCHY (who outranks whom), which is not a toggleable capability.

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

// ── Account lifecycle status ──────────────────────────────────────────────────
// Derived from the auth timestamps synced onto the profile (see migration
// 20260617130000). Tells whether an invite reached the user and whether they've
// ever signed in — so a failed invite can be re-sent.
export type AccountStatus = 'invited' | 'verified' | 'onboarded'

export function accountStatus(p: {
  last_sign_in_at: string | null
  email_confirmed_at: string | null
}): AccountStatus {
  if (p.last_sign_in_at) return 'onboarded'
  if (p.email_confirmed_at) return 'verified'
  return 'invited'
}

/** Can the actor set another user's password? (Excludes self — handled in the UI.) */
export const canSetPassword = (actor: string | null | undefined, targetRole: string): boolean =>
  canManageTarget(actor, targetRole)

/** Can the actor re-send an invite to a user who hasn't onboarded yet? */
export const canResendInvite = (actor: string | null | undefined, targetRole: string): boolean =>
  canManageTarget(actor, targetRole)

/**
 * Is this one of the nine built-in roles? Custom roles created in Settings ▸ Roles
 * have their own slugs, and are styled from their database colour instead of the
 * fixed token per built-in.
 */
export function isUserRole(r: string): r is UserRole {
  switch (r) {
    case 'super_admin': case 'admin': case 'project_manager': case 'team_lead':
    case 'employee': case 'hr': case 'finance': case 'client_owner': case 'client_member':
      return true
    default: return false
  }
}

/**
 * Narrow a free-form role string to the UserRole union (for RoleBadge etc.).
 *
 * Anything unrecognised collapses to employee, so only pass slugs already known
 * to be built-in — a custom role would otherwise be mislabelled rather than
 * merely unstyled. Use `isUserRole` to branch.
 */
export function toUserRole(r: string): UserRole {
  return isUserRole(r) ? r : 'employee'
}
