import { useMutation } from '@tanstack/react-query'
import { updateOwnProfile, uploadAvatar } from '../api/profile'

interface SaveProfileInput {
  userId: string
  name?: string
  /** New avatar file to upload; omit/null to leave the avatar unchanged. */
  avatarFile?: File | null
}

/**
 * Save the signed-in user's own profile: optionally upload a new avatar, then
 * persist name / avatar_url. Callers should refresh the auth profile on success.
 */
export function useSaveProfile() {
  return useMutation({
    mutationFn: async ({ userId, name, avatarFile }: SaveProfileInput) => {
      const updates: { name?: string; avatar_url?: string } = {}
      if (name !== undefined) updates.name = name
      if (avatarFile) updates.avatar_url = await uploadAvatar(userId, avatarFile)
      return updateOwnProfile(userId, updates)
    },
  })
}
