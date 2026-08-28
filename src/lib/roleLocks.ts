/**
 * Permission toggles the UI must refuse to turn off.
 *
 * The database enforces the same rule (fn_assert_role_admin_exists): at least
 * one profile must always retain the ability to administer roles, or the org
 * loses access to the permissions screen with no in-app way back. This mirror
 * exists so the UI never offers a switch the server will reject.
 *
 * @param permissionKey     the permission being rendered
 * @param roleHasIt         whether this role currently grants it
 * @param adminCarrierCount how many roles still carry administrator or can_manage_roles
 */
export function isPermissionLocked(
  permissionKey: string,
  roleHasIt: boolean,
  adminCarrierCount: number,
): boolean {
  if (permissionKey === 'administrator' && roleHasIt) return true
  if (permissionKey === 'can_manage_roles' && roleHasIt && adminCarrierCount <= 1) return true
  return false
}

/** Explanation shown on a locked toggle. */
export const LOCKED_REASON = 'Always on, turning this off would lock everyone out'
