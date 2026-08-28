import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'

export type ParticipationModule   = Tables<'participation_modules'>
export type ParticipationOverride = Tables<'participation_overrides'>
export type ParticipationDefault  = Tables<'participation_role_defaults'>

export async function fetchParticipationModules(): Promise<ParticipationModule[]> {
  const { data, error } = await supabase
    .from('participation_modules')
    .select('*')
    .order('sort_order')
  if (error) throw error
  return data
}

export async function fetchParticipationRoleDefaults(): Promise<ParticipationDefault[]> {
  const { data, error } = await supabase.from('participation_role_defaults').select('*')
  if (error) throw error
  return data
}

export async function fetchParticipationOverrides(): Promise<ParticipationOverride[]> {
  const { data, error } = await supabase.from('participation_overrides').select('*')
  if (error) throw error
  return data
}

/**
 * Sets one person's answer for one module.
 *
 * `null` removes the override rather than storing "yes", so the row goes back to
 * following its role default. Storing a redundant yes would freeze the person
 * against a later change to that default without anyone realising.
 */
export async function setParticipationOverride(
  moduleKey: string,
  profileId: string,
  isRequired: boolean | null,
  note?: string,
): Promise<void> {
  if (isRequired === null) {
    const { error } = await supabase
      .from('participation_overrides')
      .delete()
      .eq('module_key', moduleKey)
      .eq('profile_id', profileId)
    if (error) throw error
    return
  }

  const { data: auth } = await supabase.auth.getUser()
  const { error } = await supabase
    .from('participation_overrides')
    .upsert(
      {
        module_key: moduleKey,
        profile_id: profileId,
        is_required: isRequired,
        note: note?.trim() || null,
        updated_by: auth.user?.id ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'module_key,profile_id' },
    )
  if (error) throw error
}

/** Sets the default for a whole role, which every person on it follows. */
export async function setParticipationRoleDefault(
  moduleKey: string,
  role: string,
  isRequired: boolean,
): Promise<void> {
  const { data: auth } = await supabase.auth.getUser()
  const { error } = await supabase
    .from('participation_role_defaults')
    .upsert(
      {
        module_key: moduleKey,
        role,
        is_required: isRequired,
        updated_by: auth.user?.id ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'module_key,role' },
    )
  if (error) throw error
}
