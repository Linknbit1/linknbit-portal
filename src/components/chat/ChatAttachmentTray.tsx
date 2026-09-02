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
  /**
   * Object URL for a staged image, so it can be shown before it has finished
   * uploading. Owned by the composer, which revokes it when the file is taken
   * back out or the message is sent.
   */
  previewUrl?: string
  error?: string
}

interface ChatAttachmentTrayProps {
  pending: PendingUpload[]
  onRemove: (localId: string) => void
}

/** Returns the element, not the component: a capitalised local rendered as a
 *  tag reads to React as a component created during render. */
function kindIcon(mimeType: string, name: string, className: string) {
  const props = { size: 14, className }
  switch (fileKind(mimeType, name)) {
    case 'image': return <ImageIcon {...props} />
    case 'video': return <FileVideo {...props} />
    case 'audio': return <FileAudio {...props} />
    default: return <FileIcon {...props} />
  }
}

/** The X in the corner of a staged file, on both shapes below. */
function RemoveButton({ name, onClick, floating }: { name: string; onClick: () => void; floating?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label={`Remove ${name}`}
      className={cn(
        'flex size-5 shrink-0 items-center justify-center rounded-sm transition-colors',
        floating
          ? 'absolute right-1.5 top-1.5 bg-overlay-scrim text-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
          : 'text-text-3 hover:bg-surface-3 hover:text-text-1',
      )}
    >
      <X size={12} />
    </button>
  )
}

function UploadBar({ progress }: { progress: number }) {
  return (
    <span
      className="absolute bottom-0 left-0 h-0.5 bg-brand-red transition-[width] duration-200"
      style={{ width: `${progress}%` }}
    />
  )
}

/**
 * An image staged for sending, shown at a size you can actually check before
 * you send it — a pasted screenshot is usually the whole message, and a chip
 * saying "image.png" tells you nothing about whether you pasted the right one.
 *
 * `object-contain` rather than cover: a cropped preview of a tall screenshot
 * hides the part you were most likely checking.
 */
function ImagePreview({ file, onRemove }: { file: PendingUpload; onRemove: () => void }) {
  const uploading = file.attachmentId === null && !file.error

  return (
    <figure
      className={cn(
        'group relative flex size-40 flex-col overflow-hidden rounded-md border bg-surface-inset',
        file.error ? 'border-error-border' : 'border-border-default',
      )}
    >
      <img
        src={file.previewUrl}
        alt={file.name}
        className={cn('min-h-0 flex-1 object-contain', uploading && 'opacity-60')}
      />

      {uploading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Loader2 size={20} className="animate-spin text-text-1" />
        </span>
      )}

      <figcaption className="shrink-0 border-t border-border-default bg-surface-2 px-2 py-1">
        <span className="block truncate font-ui text-[11px] text-text-2">{file.name}</span>
        <span className="block font-mono text-[9.5px] text-text-4">
          {file.error ? file.error : uploading ? `${file.progress}%` : formatFileSize(file.size)}
        </span>
      </figcaption>

      <RemoveButton name={file.name} onClick={onRemove} floating />
      {uploading && <UploadBar progress={file.progress} />}
    </figure>
  )
}

/** Anything without a picture to show: a row saying what it is and how big. */
function FileChip({ file, onRemove }: { file: PendingUpload; onRemove: () => void }) {
  const uploading = file.attachmentId === null && !file.error

  return (
    <div
      className={cn(
        'relative flex max-w-56 items-center gap-2 overflow-hidden rounded-md border bg-surface-2 py-1.5 pl-2 pr-1.5',
        file.error ? 'border-error-border' : 'border-border-default',
      )}
    >
      {uploading
        ? <Loader2 size={14} className="shrink-0 animate-spin text-text-3" />
        : kindIcon(file.mimeType, file.name, cn('shrink-0', file.error ? 'text-error' : 'text-text-3'))}

      <span className="min-w-0 flex-1">
        <span className="block truncate font-ui text-[12px] text-text-1">{file.name}</span>
        <span className="block font-mono text-[10px] text-text-4">
          {file.error ? file.error : uploading ? `${file.progress}%` : formatFileSize(file.size)}
        </span>
      </span>

      <RemoveButton name={file.name} onClick={onRemove} />
      {uploading && <UploadBar progress={file.progress} />}
    </div>
  )
}

/**
 * Files staged in the composer, shown above the input until the message is sent.
 * Images get a real preview; everything else stays a chip, because there is
 * nothing to look at and the name is the whole story.
 */
export function ChatAttachmentTray({ pending, onRemove }: ChatAttachmentTrayProps) {
  if (pending.length === 0) return null

  return (
    <div className="mb-2 flex flex-wrap items-end gap-2">
      {pending.map((p) => (
        p.previewUrl
          ? <ImagePreview key={p.localId} file={p} onRemove={() => onRemove(p.localId)} />
          : <FileChip key={p.localId} file={p} onRemove={() => onRemove(p.localId)} />
      ))}
    </div>
  )
}
