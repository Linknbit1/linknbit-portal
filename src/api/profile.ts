import { supabase } from '../lib/supabase'
import type { Tables, TablesUpdate } from '../types/database'
import type { ThemeId } from '../constants/themes'

type ProfileSelfUpdate = Pick<
  TablesUpdate<'profiles'>,
  'name' | 'avatar_url' | 'bio' | 'age' | 'phone' | 'job_title' | 'location' | 'skills' | 'tech_stacks'
>

/**
 * Update the signed-in user's own profile. RLS (p_profiles_self_update) restricts
 * this to the caller's row and forbids changing the role, so only personal fields
 * can be written here.
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

/**
 * Set the signed-in user's colour theme.
 *
 * Separate from `updateOwnProfile` because it is a one-field write from a
 * different surface: the picker applies instantly and saves in the background,
 * so it must not carry the personal-details form's payload with it.
 *
 * `theme` is constrained in the database to the ids in `src/constants/themes.ts`
 * — an unknown value is rejected by `profiles_theme_check` rather than silently
 * stored and then ignored by the UI.
 */
export async function updateOwnTheme(
  userId: string,
  theme: ThemeId,
): Promise<Tables<'profiles'>> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ theme })
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Change the signed-in user's password via Supabase Auth. */
export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
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
