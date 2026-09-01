import { ADMINISTRATOR } from '../api/permissions'
import { useMyPermissions } from './usePermissions'

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
