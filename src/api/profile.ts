import { supabase } from '../lib/supabase'
import type { Tables, TablesUpdate } from '../types/database'

type ProfileSelfUpdate = Pick<TablesUpdate<'profiles'>, 'name' | 'avatar_url'>

/**
 * Update the signed-in user's own profile. RLS (p_profiles_self_update) restricts
 * this to the caller's row and forbids changing the role, so only personal fields
 * (name, avatar) can be written here.
 */
export async function updateOwnProfile(
  userId: string,
  updates: ProfileSelfUpdate,
): Promise<Tables<'profiles'>> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Upload an avatar to the public 'avatars' bucket under the user's folder; returns the public URL. */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
  const path = `${userId}/avatar-${Date.now()}.${ext}`
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, cacheControl: '3600' })
  if (error) throw error
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return data.publicUrl
}
