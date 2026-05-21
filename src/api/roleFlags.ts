import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'

export type RoleFeatureFlagRow = Tables<'role_feature_flags'>

export async function fetchRoleFlags(): Promise<RoleFeatureFlagRow[]> {
  const { data, error } = await supabase.from('role_feature_flags').select('*')
  if (error) throw error
  return data
}

export async function updateRoleFlag(
  role: string,
  featureKey: string,
  enabled: boolean,
  updatedBy: string,
): Promise<void> {
  const { error } = await supabase
    .from('role_feature_flags')
    .update({ enabled, updated_by: updatedBy, updated_at: new Date().toISOString() })
    .eq('role', role)
    .eq('feature_key', featureKey)
  if (error) throw error
}
