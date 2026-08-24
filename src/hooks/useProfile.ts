import { useMutation } from '@tanstack/react-query'
import type { ThemeId } from '../constants/themes'
import { updateOwnProfile, updateOwnTheme, uploadAvatar, updatePassword } from '../api/profile'

interface SaveProfileInput {
  userId: string
  name?: string
  /** New avatar file to upload; omit/null to leave the avatar unchanged. */
  avatarFile?: File | null
  bio?: string | null
  age?: number | null
  phone?: string | null
  jobTitle?: string | null
  location?: string | null
  skills?: string[]
  techStacks?: string[]
}

/**
 * Save the signed-in user's own profile: optionally upload a new avatar, then
 * persist the personal fields. Callers should refresh the auth profile on success.
 */
export function useSaveProfile() {
  return useMutation({
    mutationFn: async ({ userId, name, avatarFile, bio, age, phone, jobTitle, location, skills, techStacks }: SaveProfileInput) => {
      const updates: Parameters<typeof updateOwnProfile>[1] = {}
      if (name !== undefined) updates.name = name
      if (bio !== undefined) updates.bio = bio
      if (age !== undefined) updates.age = age
      if (phone !== undefined) updates.phone = phone
      if (jobTitle !== undefined) updates.job_title = jobTitle
      if (location !== undefined) updates.location = location
      if (skills !== undefined) updates.skills = skills
      if (techStacks !== undefined) updates.tech_stacks = techStacks
      if (avatarFile) updates.avatar_url = await uploadAvatar(userId, avatarFile)
      return updateOwnProfile(userId, updates)
    },
  })
}

/**
 * Save the signed-in user's colour theme. The caller refreshes the auth profile
 * on success, which is what re-runs AppShell's effect and swaps the <html> class.
 */
export function useUpdateTheme() {
  return useMutation({
    mutationFn: ({ userId, theme }: { userId: string; theme: ThemeId }) =>
      updateOwnTheme(userId, theme),
  })
}

/** Change the signed-in user's password. */
export function useUpdatePassword() {
  return useMutation({
    mutationFn: (newPassword: string) => updatePassword(newPassword),
  })
}
