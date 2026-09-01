import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ADMINISTRATOR,
  assignRole,
  createRole,
  deleteRole,
  fetchMyPermissions,
  fetchMyRoleRank,
  fetchProfilesWithFeature,
  fetchPermissionCatalog,
  fetchProfileRoles,
  fetchRolePermissions,
  fetchRoles,
  revokeRole,
  setRolePermission,
  updateRole,
  type CreateRoleInput,
  type RoleRow,
  type UpdateRoleInput,
} from '../api/permissions'
import { useAuthContext } from '../context/AuthContext'

export const PERMISSION_KEYS = {
  mine: ['permissions', 'mine'] as const,
  myRank: ['permissions', 'my-rank'] as const,
  holders: (key: string) => ['permissions', 'holders', key] as const,
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
/**
 * The signed-in user's rank in the role ladder. Used wherever the question is
 * "may I act on somebody who holds that role?" — which is about standing, not
 * about a capability, and so is the one thing permissions cannot express.
 */
export function useMyRoleRank(): number {
  const { accessToken } = useAuthContext()
  const { data } = useQuery({
    queryKey: PERMISSION_KEYS.myRank,
    queryFn: fetchMyRoleRank,
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
  })
  return data ?? -1
}

/** Ids of everyone holding a permission. For pickers whose question is "who may be chosen". */
export function useProfilesWithFeature(key: string): ReadonlySet<string> {
  const { data = [] } = useQuery({
    queryKey: PERMISSION_KEYS.holders(key),
    queryFn: () => fetchProfilesWithFeature(key),
    staleTime: 5 * 60 * 1000,
  })
  return useMemo(() => new Set(data), [data])
}

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
 * Every role each profile holds, ranked most authority first.
 *
 * A person can hold several roles, but `profiles.role` only ever carries the
 * highest-ranked *system* one — so anything custom is invisible to callers that
 * read that column. This joins the two cached catalogues instead.
 *
 * RLS already strips assignments of hidden roles from the response, so whatever
 * arrives here is safe to render.
 */
export function useRolesByProfile(): Map<string, RoleRow[]> {
  const { data: roles = [] } = useRoles()
  const { data: assignments = [] } = useProfileRoles()

  return useMemo(() => {
    const byId = new Map(roles.map((r) => [r.id, r]))
    const held = new Map<string, RoleRow[]>()
    for (const a of assignments) {
      const role = byId.get(a.role_id)
      if (!role) continue
      const list = held.get(a.profile_id)
      if (list) list.push(role)
      else held.set(a.profile_id, [role])
    }
    for (const list of held.values()) list.sort((a, b) => b.position - a.position)
    return held
  }, [roles, assignments])
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
