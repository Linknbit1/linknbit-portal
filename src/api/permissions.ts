import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'

export type PermissionRow = Tables<'permissions'>
export type RoleRow = Tables<'roles'>
export type RolePermissionRow = Tables<'role_permissions'>
export type ProfileRoleRow = Tables<'profile_roles'>

/** Permission that grants every other permission, including ones added later. */
export const ADMINISTRATOR = 'administrator'

/**
 * Effective permission keys for the signed-in user: the union across every role
 * they hold. Resolved server-side by the `my_permissions()` RPC so the UI and
 * RLS can never disagree about the resolution rules.
 */
export async function fetchMyPermissions(): Promise<string[]> {
  const { data, error } = await supabase.rpc('my_permissions')
  if (error) throw error
  return data ?? []
}

export async function fetchPermissionCatalog(): Promise<PermissionRow[]> {
  const { data, error } = await supabase
    .from('permissions')
    .select('*')
    .order('sort_order')
  if (error) throw error
  return data
}

export async function fetchRoles(): Promise<RoleRow[]> {
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .order('position', { ascending: false })
  if (error) throw error
  return data
}

export async function fetchRolePermissions(): Promise<RolePermissionRow[]> {
  const { data, error } = await supabase.from('role_permissions').select('*')
  if (error) throw error
  return data
}

export async function fetchProfileRoles(): Promise<ProfileRoleRow[]> {
  const { data, error } = await supabase.from('profile_roles').select('*')
  if (error) throw error
  return data
}

export interface CreateRoleInput {
  slug: string
  name: string
  color?: string | null
  position: number
}

export async function createRole(input: CreateRoleInput): Promise<RoleRow> {
  const { data, error } = await supabase.from('roles').insert(input).select().single()
  if (error) throw error
  return data
}

export interface UpdateRoleInput {
  id: string
  name?: string
  color?: string | null
  position?: number
}

export async function updateRole({ id, ...patch }: UpdateRoleInput): Promise<void> {
  const { error } = await supabase.from('roles').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteRole(id: string): Promise<void> {
  const { error } = await supabase.from('roles').delete().eq('id', id)
  if (error) throw error
}

/**
 * Grant or revoke a single permission on a role. Presence of the row is the
 * grant, so revoking is a delete rather than a flag flip.
 */
export async function setRolePermission(
  roleId: string,
  permissionKey: string,
  granted: boolean,
): Promise<void> {
  if (granted) {
    const { error } = await supabase
      .from('role_permissions')
      .upsert({ role_id: roleId, permission_key: permissionKey }, { onConflict: 'role_id,permission_key' })
    if (error) throw error
    return
  }
  const { error } = await supabase
    .from('role_permissions')
    .delete()
    .eq('role_id', roleId)
    .eq('permission_key', permissionKey)
  if (error) throw error
}

export async function assignRole(profileId: string, roleId: string, grantedBy: string): Promise<void> {
  const { error } = await supabase
    .from('profile_roles')
    .upsert(
      { profile_id: profileId, role_id: roleId, granted_by: grantedBy },
      { onConflict: 'profile_id,role_id' },
    )
  if (error) throw error
}

export async function revokeRole(profileId: string, roleId: string): Promise<void> {
  const { error } = await supabase
    .from('profile_roles')
    .delete()
    .eq('profile_id', profileId)
    .eq('role_id', roleId)
  if (error) throw error
}
