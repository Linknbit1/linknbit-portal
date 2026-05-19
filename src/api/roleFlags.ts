import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'

export type RoleFeatureFlagRow = Tables<'role_feature_flags'>

export async function fetchRoleFlags(): Promise<RoleFeatureFlagRow[]> {
  const { data, error } = await supabase.from('role_feature_flags').select('*')
  if (error) throw error
  return data
}
