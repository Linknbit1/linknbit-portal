// Client-side helpers for task/project file attachments. Mirrors the avatar
// validation approach (src/lib/avatar.ts) but for the broader file set the
// `attachments` bucket accepts. Keep the limit in sync with the bucket's
// file_size_limit set in the create_attachments_bucket migration.
export const MAX_ATTACHMENT_MB = 25

const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv',
  'application/zip', 'application/x-zip-compressed',
])

/** Returns an error message if the file can't be uploaded, or null when it's fine. */
export function validateAttachmentFile(file: File): string | null {
  if (file.size > MAX_ATTACHMENT_MB * 1024 * 1024) {
    return `File is too large (max ${MAX_ATTACHMENT_MB} MB)`
  }
  // Some browsers leave type empty for uncommon files — allow if the size is ok.
  if (file.type && !ALLOWED_MIME.has(file.type)) {
    return 'Unsupported file type'
  }
  return null
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export type FileKind = 'image' | 'pdf' | 'doc' | 'sheet' | 'slides' | 'archive' | 'text' | 'other'

export function fileKind(mimeType: string | null, fileName: string): FileKind {
  const mt = mimeType ?? ''
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  if (mt.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'image'
  if (mt === 'application/pdf' || ext === 'pdf') return 'pdf'
  if (mt.includes('word') || ['doc', 'docx'].includes(ext)) return 'doc'
  if (mt.includes('sheet') || mt.includes('excel') || ['xls', 'xlsx', 'csv'].includes(ext)) return 'sheet'
  if (mt.includes('presentation') || mt.includes('powerpoint') || ['ppt', 'pptx'].includes(ext)) return 'slides'
  if (mt.includes('zip') || ['zip', 'rar', '7z'].includes(ext)) return 'archive'
  if (mt.startsWith('text/') || ['txt', 'md'].includes(ext)) return 'text'
  return 'other'
}
