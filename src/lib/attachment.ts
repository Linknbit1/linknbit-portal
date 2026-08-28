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
  'text/plain', 'text/csv', 'text/markdown', 'text/x-markdown', 'text/tab-separated-values',
  'application/json',
  'application/zip', 'application/x-zip-compressed',
])

// Fallback allow-by-extension — browsers report inconsistent (or empty) MIME types
// for docs/markdown/csv, so we also accept by a known extension. Must stay a subset
// of the bucket's allowed_mime_types or the upload still fails server-side.
const ALLOWED_EXT = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg',
  'mp4', 'webm', 'mov', 'ogv',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'csv', 'tsv', 'txt', 'md', 'markdown', 'json',
  'zip', 'rar', '7z',
])

/** Returns an error message if the file can't be uploaded, or null when it's fine. */
export function validateAttachmentFile(file: File): string | null {
  if (file.size > MAX_ATTACHMENT_MB * 1024 * 1024) {
    return `File is too large (max ${MAX_ATTACHMENT_MB} MB)`
  }
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  // Accept by MIME, by known extension, or when the browser couldn't detect a type.
  if (ALLOWED_MIME.has(file.type) || ALLOWED_EXT.has(ext) || !file.type) return null
  return 'Unsupported file type'
}

const EXT_MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', ogv: 'video/ogg',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  csv: 'text/csv', tsv: 'text/tab-separated-values', txt: 'text/plain',
  md: 'text/markdown', markdown: 'text/markdown', json: 'application/json',
  zip: 'application/zip',
}

/**
 * A content-type for the upload derived from the extension when the browser reports
 * none — otherwise storage falls back to application/octet-stream, which the bucket's
 * MIME allowlist rejects (e.g. some browsers leave `.md` files typeless).
 */
export function inferContentType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  return EXT_MIME[ext] ?? 'application/octet-stream'
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export type FileKind = 'image' | 'video' | 'audio' | 'pdf' | 'doc' | 'sheet' | 'slides' | 'archive' | 'text' | 'other'

export function fileKind(mimeType: string | null, fileName: string): FileKind {
  const mt = mimeType ?? ''
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  if (mt.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'image'
  if (mt.startsWith('video/') || ['mp4', 'webm', 'mov', 'ogv'].includes(ext)) return 'video'
  // Audio only reaches here from the chat bucket — the project `attachments`
  // bucket doesn't allow it.
  if (mt.startsWith('audio/') || ['mp3', 'wav', 'm4a', 'oga', 'opus'].includes(ext)) return 'audio'
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
// image/video/pdf render natively; docx (via mammoth) / csv / text are parsed in the
// browser so the file never leaves our storage; everything else is download-only.
export type PreviewMode = 'image' | 'video' | 'audio' | 'pdf' | 'docx' | 'xlsx' | 'csv' | 'markdown' | 'text' | 'download'

export function previewMode(mimeType: string | null, fileName: string): PreviewMode {
  const mt = mimeType ?? ''
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  const k = fileKind(mimeType, fileName)
  if (k === 'image') return 'image'
  if (k === 'video') return 'video'
  if (k === 'audio') return 'audio'
  if (k === 'pdf') return 'pdf'
  if (ext === 'docx' || mt.includes('wordprocessingml')) return 'docx'
  if (ext === 'xlsx' || mt.includes('spreadsheetml')) return 'xlsx'
  if (ext === 'csv' || mt === 'text/csv') return 'csv'
  if (ext === 'md' || ext === 'markdown' || mt === 'text/markdown' || mt === 'text/x-markdown') return 'markdown'
  if (k === 'text' || mt.startsWith('text/')) return 'text'
  // Legacy .doc/.xls, .pptx, archives → no safe in-browser render yet.
  return 'download'
}

/** Minimal CSV parser (handles quoted fields + escaped quotes) for the in-app viewer. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else inQuotes = false
      } else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (c !== '\r') field += c
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  return rows
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
