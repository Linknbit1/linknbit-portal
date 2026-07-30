import { Download, File as FileIcon, FileText, FileSpreadsheet, Presentation, FileArchive, FileVideo, FileAudio, Loader2 } from 'lucide-react'
import { useToast } from '../ui/toast-context'
import { useChatAttachmentUrl } from '../../hooks/useMessageAttachments'
import { getChatAttachmentUrl } from '../../api/messageAttachments'
import { fileKind, formatFileSize, type FileKind } from '../../lib/attachment'
import type { MessageAttachmentRow } from '../../api/messageAttachments'

const KIND_ICON: Record<FileKind, typeof FileIcon> = {
  image: FileIcon, video: FileVideo, audio: FileAudio, pdf: FileText, doc: FileText,
  sheet: FileSpreadsheet, slides: Presentation, archive: FileArchive, text: FileText, other: FileIcon,
}

interface MessageAttachmentProps {
  attachment: MessageAttachmentRow
}

/**
 * Images/video/audio preview inline; everything else is a compact card that
 * opens the file via a fresh signed URL. The shared FileViewer isn't reused
 * here because it resolves URLs from the project `attachments` bucket only.
 */
export function MessageAttachment({ attachment }: MessageAttachmentProps) {
  const toast = useToast()
  const kind = fileKind(attachment.mime_type, attachment.file_name)
  const inline = kind === 'image' || kind === 'video' || kind === 'audio'
  const { data: url, isLoading } = useChatAttachmentUrl(inline ? attachment.storage_path : null)

  // Signed URLs are short-lived, so mint a fresh one at click time.
  const openFile = async () => {
    if (!attachment.storage_path) return
    try {
      const fresh = await getChatAttachmentUrl(attachment.storage_path)
      window.open(fresh, '_blank', 'noopener,noreferrer')
    } catch {
      toast('Could not open that file', 'error')
    }
  }

  if (inline) {
    if (isLoading || !url) {
      return (
        <div className="mt-1.5 h-32 w-56 rounded-md bg-surface-2 border border-border-default flex items-center justify-center">
          <Loader2 size={16} className="text-text-4 animate-spin" />
        </div>
      )
    }
    if (kind === 'image') {
      return (
        <button
          onClick={openFile}
          className="mt-1.5 block max-w-sm rounded-md overflow-hidden border border-border-default hover:border-border-strong transition-colors"
        >
          <img src={url} alt={attachment.file_name} className="max-h-64 w-auto max-w-full object-cover" />
        </button>
      )
    }
    if (kind === 'video') {
      return (
        <video src={url} controls className="mt-1.5 max-h-64 w-full max-w-sm rounded-md border border-border-default">
          <track kind="captions" />
        </video>
      )
    }
    return (
      <audio src={url} controls className="mt-1.5 w-full max-w-sm">
        <track kind="captions" />
      </audio>
    )
  }

  const Icon = KIND_ICON[kind]
  return (
    <button
      onClick={openFile}
      className="mt-1.5 flex items-center gap-2.5 px-3 py-2 rounded-md bg-surface-2 border border-border-default hover:border-border-strong transition-colors max-w-xs w-full text-left"
    >
      <Icon size={18} className="shrink-0 text-text-3" />
      <span className="min-w-0 flex-1">
        <span className="block font-ui text-[12.5px] text-text-1 truncate">{attachment.file_name}</span>
        <span className="block font-mono text-[10px] text-text-4">{formatFileSize(attachment.file_size)}</span>
      </span>
      <Download size={14} className="shrink-0 text-text-4" />
    </button>
  )
}
