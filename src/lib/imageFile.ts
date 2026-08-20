/** Shared client-side guard for image uploads (avatars, reward artwork, …). */

/** Mime types every image bucket in the project accepts. */
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const

/**
 * Validate a picked file before it reaches Storage. Returns an error message to
 * show the user, or null when the file is fine.
 *
 * The bucket enforces the same limits server-side; this only exists so a 5 MB
 * screenshot fails instantly instead of after a slow upload.
 */
export function validateImageFile(file: File, maxMb: number): string | null {
  if (!file.type.startsWith('image/')) return 'Please choose an image file'
  const accepted: readonly string[] = ACCEPTED_IMAGE_TYPES
  if (!accepted.includes(file.type)) return 'Use a JPG, PNG, WebP or GIF image'
  if (file.size > maxMb * 1024 * 1024) return `Image must be under ${maxMb} MB`
  return null
}
