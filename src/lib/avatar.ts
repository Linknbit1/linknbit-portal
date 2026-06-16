export const MAX_AVATAR_MB = 10
export const MAX_AVATAR_BYTES = MAX_AVATAR_MB * 1024 * 1024

export function validateAvatarFile(file: File): string | null {
  if (!file.type.startsWith('image/')) return 'Please choose an image file'
  if (file.size > MAX_AVATAR_BYTES) return `Image must be under ${MAX_AVATAR_MB} MB`
  return null
}
