import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ADMINISTRATOR,
  assignRole,
  createRole,
  deleteRole,
  fetchMyPermissions,
  fetchPermissionCatalog,
  fetchProfileRoles,
  fetchRolePermissions,
  fetchRoles,
  revokeRole,
  setRolePermission,
  updateRole,
  type CreateRoleInput,
  type UpdateRoleInput,
} from '../api/permissions'
import { useAuthContext } from '../context/AuthContext'

export const PERMISSION_KEYS = {
  mine: ['permissions', 'mine'] as const,
  catalog: ['permissions', 'catalog'] as const,
  roles: ['permissions', 'roles'] as const,
  rolePermissions: ['permissions', 'role_permissions'] as const,
  profileRoles: ['permissions', 'profile_roles'] as const,
}

/**
 * The signed-in user's effective permissions, resolved server-side.
 *
 * Cached for five minutes to match the old flag-matrix behaviour. Role changes
 * invalidate it through the mutation hooks below; a change made by someone else
 * lands on the next refetch.
 */
export function useMyPermissions() {
  const { accessToken } = useAuthContext()
  return useQuery({
    queryKey: PERMISSION_KEYS.mine,
    queryFn: fetchMyPermissions,
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
  })
}

export function usePermissionCatalog() {
  const { accessToken } = useAuthContext()
  return useQuery({
    queryKey: PERMISSION_KEYS.catalog,
    queryFn: fetchPermissionCatalog,
    enabled: !!accessToken,
    staleTime: 60 * 60 * 1000,
  })
}

export function useRoles() {
  const { accessToken } = useAuthContext()
  return useQuery({
    queryKey: PERMISSION_KEYS.roles,
    queryFn: fetchRoles,
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
  })
}

export function useRolePermissions() {
  const { accessToken } = useAuthContext()
  return useQuery({
    queryKey: PERMISSION_KEYS.rolePermissions,
    queryFn: fetchRolePermissions,
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
  })
}

export function useProfileRoles() {
  const { accessToken } = useAuthContext()
  return useQuery({
    queryKey: PERMISSION_KEYS.profileRoles,
    queryFn: fetchProfileRoles,
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Every role mutation can change the acting user's own capabilities, so all of
 * them invalidate the whole permissions namespace rather than a single key.
 */
function useInvalidatePermissions() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ['permissions'] })
}

export function useCreateRole() {
  const invalidate = useInvalidatePermissions()
  return useMutation({
    mutationFn: (input: CreateRoleInput) => createRole(input),
    onSuccess: invalidate,
  })
}

export function useUpdateRole() {
  const invalidate = useInvalidatePermissions()
  return useMutation({
    mutationFn: (input: UpdateRoleInput) => updateRole(input),
    onSuccess: invalidate,
  })
}

export function useDeleteRole() {
  const invalidate = useInvalidatePermissions()
  return useMutation({
    mutationFn: (id: string) => deleteRole(id),
    onSuccess: invalidate,
  })
}

export function useSetRolePermission() {
  const invalidate = useInvalidatePermissions()
  return useMutation({
    mutationFn: ({ roleId, permissionKey, granted }: { roleId: string; permissionKey: string; granted: boolean }) =>
      setRolePermission(roleId, permissionKey, granted),
    onSuccess: invalidate,
  })
}

export function useAssignRole() {
  const invalidate = useInvalidatePermissions()
  const { profile } = useAuthContext()
  return useMutation({
    mutationFn: ({ profileId, roleId }: { profileId: string; roleId: string }) =>
      assignRole(profileId, roleId, profile?.id ?? ''),
    onSuccess: invalidate,
  })
}

export function useRevokeRole() {
  const invalidate = useInvalidatePermissions()
  return useMutation({
    mutationFn: ({ profileId, roleId }: { profileId: string; roleId: string }) =>
      revokeRole(profileId, roleId),
    onSuccess: invalidate,
  })
}

export { ADMINISTRATOR }
