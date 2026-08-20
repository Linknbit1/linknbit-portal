import { validateImageFile } from './imageFile'

export const MAX_AVATAR_MB = 10
export const MAX_AVATAR_BYTES = MAX_AVATAR_MB * 1024 * 1024

export function validateAvatarFile(file: File): string | null {
  return validateImageFile(file, MAX_AVATAR_MB)
}
