import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'

export type RoleFeatureFlagRow = Tables<'role_feature_flags'>

export async function fetchRoleFlags(): Promise<RoleFeatureFlagRow[]> {
  const { data, error } = await supabase.from('role_feature_flags').select('*')
  if (error) throw error
  return data
}

// Upsert, not update: an `.update()` against a (role, feature_key) pair that has no
// row matches zero rows and returns NO error, so the optimistic UI would report a
// successful toggle that never persisted. The table's PK is (role, feature_key).
export async function updateRoleFlag(
  role: string,
  featureKey: string,
  enabled: boolean,
  updatedBy: string,
): Promise<void> {
  const { error } = await supabase
    .from('role_feature_flags')
    .upsert(
      { role, feature_key: featureKey, enabled, updated_by: updatedBy, updated_at: new Date().toISOString() },
      { onConflict: 'role,feature_key' },
    )
  if (error) throw error
}
