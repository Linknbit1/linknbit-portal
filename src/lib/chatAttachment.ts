// Client-side rules for chat file uploads. Deliberately separate from
// src/lib/attachment.ts (project/task files): chat allows much larger files and
// a wider media set, and merging the two would loosen the stricter project-file
// rules. Keep in sync with the chat-attachments bucket's file_size_limit and
// allowed_mime_types (create_chat_attachments_bucket migration).
export const MAX_CHAT_ATTACHMENT_MB = 100

/**
 * Above this, uploads go through the resumable (TUS) endpoint so a dropped
 * connection resumes instead of restarting. Below it, a single request is
 * simpler and slightly faster — which covers the common case (screenshots).
 */
export const RESUMABLE_THRESHOLD_BYTES = 10 * 1024 * 1024

const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/heic', 'image/avif',
  'video/mp4', 'video/webm', 'video/quicktime',
  'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm', 'audio/ogg',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv', 'text/markdown',
  'application/json',
  'application/zip', 'application/x-zip-compressed', 'application/gzip',
])

// Browsers report inconsistent (or empty) MIME types for some documents, so a
// known extension is accepted too. Must stay a subset of the bucket allowlist.
const ALLOWED_EXT = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'heic', 'avif',
  'mp4', 'webm', 'mov',
  'mp3', 'm4a', 'wav', 'oga', 'opus',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'csv', 'txt', 'md', 'markdown', 'json',
  'zip', 'gz',
])

const EXT_MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
  webp: 'image/webp', svg: 'image/svg+xml', heic: 'image/heic', avif: 'image/avif',
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
  mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', oga: 'audio/ogg', opus: 'audio/ogg',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain', csv: 'text/csv', md: 'text/markdown', markdown: 'text/markdown',
  json: 'application/json', zip: 'application/zip', gz: 'application/gzip',
}

/** Returns an error message if the file can't be uploaded, or null when it's fine. */
export function validateChatAttachmentFile(file: File): string | null {
  if (file.size > MAX_CHAT_ATTACHMENT_MB * 1024 * 1024) {
    return `${file.name} is too large (max ${MAX_CHAT_ATTACHMENT_MB} MB)`
  }
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (ALLOWED_MIME.has(file.type) || ALLOWED_EXT.has(ext) || !file.type) return null
  return `${file.name} isn't a supported file type`
}

/**
 * Storage object keys reject a lot of characters — notably the narrow no-break
 * space (U+202F) macOS puts in screenshot names, which fails with InvalidKey.
 * Only the path is sanitised; the row keeps the original name for display.
 */
export function safeStorageName(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  const base = dot > 0 ? fileName.slice(0, dot) : fileName
  const ext = dot > 0 ? fileName.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : ''

  const cleanedBase = base
    .normalize('NFKD')
    // Drop accents/marks that survive the decomposition above.
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 80)

  const safeBase = cleanedBase || 'file'
  return ext ? `${safeBase}.${ext}` : safeBase
}

/** Storage rejects application/octet-stream, so derive a type when the browser gives none. */
export function chatContentType(file: File): string {
  if (file.type && ALLOWED_MIME.has(file.type)) return file.type
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return EXT_MIME[ext] ?? file.type ?? 'application/octet-stream'
}
