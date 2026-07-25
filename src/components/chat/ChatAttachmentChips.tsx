import { X, Loader2, File as FileIcon, Image as ImageIcon, FileVideo, FileAudio } from 'lucide-react'
import { cn } from '../../lib/cn'
import { formatFileSize, fileKind } from '../../lib/attachment'

export interface PendingUpload {
  localId: string
  name: string
  size: number
  mimeType: string
  progress: number
  /** Set once the row exists in the DB; null while still uploading. */
  attachmentId: string | null
  error?: string
}

interface ChatAttachmentChipsProps {
  pending: PendingUpload[]
  onRemove: (localId: string) => void
}

function iconFor(mimeType: string, name: string) {
  switch (fileKind(mimeType, name)) {
    case 'image': return ImageIcon
    case 'video': return FileVideo
    case 'audio': return FileAudio
    default: return FileIcon
  }
}

/** Files staged in the composer, shown above the input until the message is sent. */
export function ChatAttachmentChips({ pending, onRemove }: ChatAttachmentChipsProps) {
  if (pending.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5 mb-2">
      {pending.map((p) => {
        const Icon = iconFor(p.mimeType, p.name)
        const uploading = p.attachmentId === null && !p.error
        return (
          <div
            key={p.localId}
            className={cn(
              'relative flex items-center gap-2 pl-2 pr-1.5 py-1.5 rounded-md border bg-surface-2 max-w-56 overflow-hidden',
              p.error ? 'border-error-border' : 'border-border-default',
            )}
          >
            {uploading
              ? <Loader2 size={14} className="shrink-0 text-text-3 animate-spin" />
              : <Icon size={14} className={cn('shrink-0', p.error ? 'text-error' : 'text-text-3')} />}

            <span className="min-w-0 flex-1">
              <span className="block font-ui text-[12px] text-text-1 truncate">{p.name}</span>
              <span className="block font-mono text-[10px] text-text-4">
                {p.error ? p.error : uploading ? `${p.progress}%` : formatFileSize(p.size)}
              </span>
            </span>

            <button
              onClick={() => onRemove(p.localId)}
              aria-label={`Remove ${p.name}`}
              className="shrink-0 size-5 rounded-sm flex items-center justify-center text-text-3 hover:text-text-1 hover:bg-surface-3 transition-colors"
            >
              <X size={12} />
            </button>

            {uploading && (
              <span
                className="absolute bottom-0 left-0 h-0.5 bg-brand-red transition-[width] duration-200"
                style={{ width: `${p.progress}%` }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
