// Authority for People & Teams management.
// Mirrors the SQL helpers can_manage_target() / can_grant_role() and the
// authority model enforced by the admin_*_profile RPCs.
import type { UserRole } from '../types'

export const INTERNAL_ROLES = [
  'super_admin', 'admin', 'project_manager', 'team_lead', 'employee', 'hr', 'finance',
] as const
export type InternalRole = (typeof INTERNAL_ROLES)[number]

/**
 * Authority is a rank, not a name.
 *
 * `roles.position` is the ladder the Roles screen reorders, and `my_role_rank()`
 * is the caller's place on it — the same pair `can_manage_target()` and
 * `can_grant_role()` enforce in SQL, so the buttons this hides are the ones the
 * database would refuse anyway.
 *
 * Rank is deliberately not a permission: "may I act on somebody who holds that
 * role" is about standing between two people, which no capability key can say.
 * Whether you may manage people at all IS a permission — useCanManagePeople().
 */
export const outranks = (myRank: number, targetRank: number | undefined): boolean =>
  targetRank !== undefined && myRank >= targetRank

/** Roles the actor may grant: everything at or below their own rank. */
export function assignableRoleSlugs(
  myRank: number,
  roles: readonly { slug: string; position: number }[],
): string[] {
  return roles.filter((r) => r.position <= myRank).map((r) => r.slug)
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

/**
 * Setting a password and re-sending an invite are the same authority question as
 * managing somebody, so they ask it the same way.
 */
export const canActOnRank = outranks

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
