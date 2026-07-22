// Client-side helpers for task/project file attachments. Mirrors the avatar
// validation approach (src/lib/avatar.ts) but for the broader file set the
// `attachments` bucket accepts. Keep the limit in sync with the bucket's
// file_size_limit set in the create_attachments_bucket migration.
export const MAX_ATTACHMENT_MB = 25

const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
  'video/mp4', 'video/webm', 'video/quicktime', 'video/ogg',
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

export type FileKind = 'image' | 'video' | 'pdf' | 'doc' | 'sheet' | 'slides' | 'archive' | 'text' | 'other'

export function fileKind(mimeType: string | null, fileName: string): FileKind {
  const mt = mimeType ?? ''
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  if (mt.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'image'
  if (mt.startsWith('video/') || ['mp4', 'webm', 'mov', 'ogv'].includes(ext)) return 'video'
  if (mt === 'application/pdf' || ext === 'pdf') return 'pdf'
  if (mt.includes('word') || ['doc', 'docx'].includes(ext)) return 'doc'
  if (mt.includes('sheet') || mt.includes('excel') || ['xls', 'xlsx', 'csv'].includes(ext)) return 'sheet'
  if (mt.includes('presentation') || mt.includes('powerpoint') || ['ppt', 'pptx'].includes(ext)) return 'slides'
  if (mt.includes('zip') || ['zip', 'rar', '7z'].includes(ext)) return 'archive'
  if (mt.startsWith('text/') || ['txt', 'md'].includes(ext)) return 'text'
  return 'other'
}

/**
 * How an uploaded file should render in the in-app viewer. image/video/pdf preview
 * natively from a signed URL; everything else (Office docs, archives) is download-only
 * — the browser can't render them and we keep the file inside our own storage.
 */
export type PreviewMode = 'image' | 'video' | 'pdf' | 'download'

export function previewMode(mimeType: string | null, fileName: string): PreviewMode {
  const k = fileKind(mimeType, fileName)
  if (k === 'image') return 'image'
  if (k === 'video') return 'video'
  if (k === 'pdf') return 'pdf'
  return 'download'
}

/**
 * Turns a Google Docs/Sheets/Slides/Drive share link into an embeddable preview URL,
 * or null if the URL isn't a recognised embeddable Google document. Uses the doc's
 * own /preview route, which honours the document's existing sharing permissions —
 * nothing is exposed beyond what the link already grants.
 */
export function embeddableLinkUrl(url: string): string | null {
  const m = url.match(/https:\/\/docs\.google\.com\/(document|spreadsheets|presentation)\/d\/([^/?#]+)/)
  if (m) return `https://docs.google.com/${m[1]}/d/${m[2]}/preview`
  const drive = url.match(/https:\/\/drive\.google\.com\/file\/d\/([^/?#]+)/)
  if (drive) return `https://drive.google.com/file/d/${drive[1]}/preview`
  return null
}
