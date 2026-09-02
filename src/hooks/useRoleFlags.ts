import { ADMINISTRATOR } from '../api/permissions'
import { useMemo } from 'react'
import { useMyPermissions, useMyRoleRank, useRoles } from './usePermissions'
import { INTERNAL_ROLES, type Authority, type InternalRole } from '../lib/peopleAccess'

/**
 * Capability checks for the signed-in user.
 *
 * These mirror the SQL `has_feature()` helper by construction: both resolve the
 * union of permissions across every role the user holds, and both treat the
 * `administrator` permission as granting everything. The resolution itself
 * happens server-side in `my_permissions()`, so the UI cannot drift from RLS.
 *
 * The hook names and signatures here are unchanged from the role-flag era on
 * purpose - 21 files consume them.
 *
 * See docs/permission-model-v2.md.
 */

export interface FeatureAccess {
  allowed: boolean
  /** True until permissions have loaded. Guards should render a spinner, not redirect. */
  isLoading: boolean
}

export function useFeatureAccess(featureKey: string): FeatureAccess {
  const { data: permissions, isLoading } = useMyPermissions()

  if (!permissions) return { allowed: false, isLoading }

  const allowed =
    permissions.includes(ADMINISTRATOR) || permissions.includes(featureKey)
  return { allowed, isLoading: false }
}

/**
 * Returns false while permissions are still loading — fine for hiding a button,
 * but NOT for gating navigation or a route (that would flash then redirect).
 * Use `useFeatureAccess` there so you can wait on `isLoading`.
 */
export function useCanAccess(featureKey: string): boolean {
  return useFeatureAccess(featureKey).allowed
}

/**
 * Any one of these keys is enough. Mirrors the nav's array form of `feature`,
 * for a screen two different capabilities can open — a standup board reachable
 * by whoever reviews everyone's and by whoever reviews their team's.
 */
export function useAnyFeatureAccess(featureKeys: readonly string[]): FeatureAccess {
  const { data: permissions, isLoading } = useMyPermissions()

  if (!permissions) return { allowed: false, isLoading }

  const allowed =
    permissions.includes(ADMINISTRATOR) || featureKeys.some((key) => permissions.includes(key))
  return { allowed, isLoading: false }
}

export function useCanAccessAny(featureKeys: readonly string[]): boolean {
  return useAnyFeatureAccess(featureKeys).allowed
}

// ── Named capability hooks ────────────────────────────────────────────────────

export const useCanManagePeople = () => useCanAccess('can_manage_people')
export const useCanManageClients = () => useCanAccess('can_manage_clients')
export const useCanManageAttendance = () => useCanAccess('can_manage_attendance')
export const useCanApproveRequests = () => useCanAccess('can_approve_requests')
export const useCanApproveTasks = () => useCanAccess('can_approve_tasks')
export const useCanManageProjects = () => useCanAccess('can_manage_projects')
export const useCanGovernGamification = () => useCanAccess('can_govern_gamification')
export const useCanRecognize = () => useCanAccess('can_recognize')
export const useCanManageRoles = () => useCanAccess('can_manage_roles')

/** Confidentiality domains a document can belong to. */
export type ConfidentialScope = 'project' | 'hr' | 'finance' | 'legal'

/**
 * Whether the user may open confidential documents in a given domain.
 *
 * Mirrors the SQL `can_view_confidential_scope()` helper: the master key grants
 * every domain, otherwise the domain-specific key is required. Project files
 * default to the `project` domain, which is why that is the default here.
 */
export function useCanViewConfidential(scope: ConfidentialScope = 'project'): boolean {
  const master = useCanAccess('can_view_confidential')
  const scoped = useCanAccess(`can_view_confidential_${scope}`)
  return master || scoped
}

/**
 * Cash payouts may be fulfilled by gamification governors and by Finance.
 * Previously a hardcoded `role === 'finance'` check; now a real permission so
 * it can be granted to a custom role without touching code.
 */
export const useCanFulfillPayouts = () => useCanAccess('can_fulfill_payouts')

// ── Authority (rank, not permission) ─────────────────────────────────────────
// Rank answers "may I act on somebody who holds that role", which no capability
// key can express — see lib/peopleAccess. Every screen that manages a person
// asks it through this hook so they all read the same ladder.

export function useAuthority(): Authority {
  const myRank = useMyRoleRank()
  const { data: allRoles = [] } = useRoles()
  return useMemo(
    () => ({
      myRank,
      rankOf: (slug: string) => allRoles.find((r) => r.slug === slug)?.position,
      ladder: allRoles
        .filter((r) => INTERNAL_ROLES.includes(r.slug as InternalRole))
        .map((r) => ({ slug: r.slug, position: r.position })),
    }),
    [myRank, allRoles],
  )
}

/**
 * May the signed-in user log in as this person?
 *
 * Both halves have to hold: the `can_impersonate` permission, and standing —
 * you may step into an account below you, never a peer's and never one above.
 * Mirrors what auth-impersonate enforces server-side, so the control only
 * appears where the edge function would actually mint a session.
 */
export function useCanImpersonate(
  person: { id: string; role: string; is_active: boolean } | null | undefined,
  myId: string | undefined,
): boolean {
  const allowed = useCanAccess('can_impersonate')
  const { myRank, rankOf } = useAuthority()
  if (!person || !allowed || person.id === myId || !person.is_active) return false
  const targetRank = rankOf(person.role)
  // Strictly below, not outranks(): equal rank is enough to edit somebody, but
  // not to become them.
  return targetRank !== undefined && myRank > targetRank
}
