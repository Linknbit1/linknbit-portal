import { useMemo, useState } from 'react'
import { Image as ImageIcon, Link2, File as FileIcon, ExternalLink, Trash2 } from 'lucide-react'
import { Skeleton } from '../ui/Skeleton'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useToast } from '../ui/toast-context'
import { MessageAttachment } from './MessageAttachment'
import { useAuthContext } from '../../context/AuthContext'
import { useCanAccess } from '../../hooks/useRoleFlags'
import { useMessageAttachments, useDeleteChatAttachment } from '../../hooks/useMessageAttachments'
import { getChatAttachmentUrl } from '../../api/messageAttachments'
import { cn } from '../../lib/cn'
import { fileKind, formatFileSize } from '../../lib/attachment'
import { formatRelativeTime } from '../../lib/utils'
import type { MessageAttachmentRow } from '../../api/messageAttachments'

export type ChannelFileTab = 'media' | 'links' | 'files'

/** Exported so the info panel can render these alongside its Members tab. */
export const CHANNEL_FILE_TABS: { id: ChannelFileTab; label: string; icon: typeof ImageIcon }[] = [
  { id: 'media', label: 'Media', icon: ImageIcon },
  { id: 'links', label: 'Links', icon: Link2 },
  { id: 'files', label: 'Files', icon: FileIcon },
]

/** Splits a conversation's shared items the way WhatsApp does. */
function bucketOf(a: MessageAttachmentRow): ChannelFileTab {
  if (a.kind === 'link') return 'links'
  const kind = fileKind(a.mime_type, a.file_name)
  return kind === 'image' || kind === 'video' ? 'media' : 'files'
}

interface ChannelFilesPanelProps {
  channelId: string
  /** Controlled by the info panel, which owns the shared tab strip. */
  tab: ChannelFileTab
}

export function ChannelFilesPanel({ channelId, tab }: ChannelFilesPanelProps) {
  const toast = useToast()
  const { profile } = useAuthContext()
  const canDeleteAny = useCanAccess('can_administer_channels')
  const [confirming, setConfirming] = useState<MessageAttachmentRow | null>(null)
  const { data: attachments = [], isLoading } = useMessageAttachments(channelId)
  const { mutate: deleteAttachment, isPending: deleting } = useDeleteChatAttachment()

  // Matches the RLS rule: your own uploads, or a moderator.
  const canDelete = (a: MessageAttachmentRow) => a.uploader_id === profile?.id || canDeleteAny

  const confirmDelete = () => {
    if (!confirming) return
    deleteAttachment(
      { id: confirming.id, storagePath: confirming.storage_path, channelId },
      {
        onSuccess: () => { toast('File removed', 'success'); setConfirming(null) },
        onError: () => toast('Could not remove that file', 'error'),
      },
    )
  }

  const shown = useMemo(
    () => attachments.filter((a) => bucketOf(a) === tab).slice().reverse(),
    [attachments, tab],
  )

  const openFile = async (a: MessageAttachmentRow) => {
    if (a.kind === 'link' && a.link_url) {
      window.open(a.link_url, '_blank', 'noopener,noreferrer')
      return
    }
    if (!a.storage_path) return
    try {
      const url = await getChatAttachmentUrl(a.storage_path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      toast('Could not open that file', 'error')
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : shown.length === 0 ? (
          <p className="font-ui text-[12px] text-text-4 text-center py-10">
            No {tab} shared in this conversation yet.
          </p>
        ) : tab === 'media' ? (
          <div className="grid grid-cols-2 gap-2">
            {shown.map((a) => (
              <div key={a.id} className="group relative">
                <MessageAttachment attachment={a} />
                {canDelete(a) && (
                  <button
                    onClick={() => setConfirming(a)}
                    aria-label={`Remove ${a.file_name}`}
                    className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-sm bg-bg-base/80 text-text-2 opacity-100 transition-opacity hover:text-error lg:opacity-0 lg:group-hover:opacity-100 lg:focus:opacity-100"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col">
            {shown.map((a) => (
              <div key={a.id} className="group flex items-center gap-1 rounded-md hover:bg-surface-2 transition-colors">
                <button
                  onClick={() => openFile(a)}
                  className="flex flex-1 min-w-0 items-center gap-2.5 p-2 text-left"
                >
                  {a.kind === 'link'
                    ? <Link2 size={16} className="shrink-0 text-text-3" />
                    : <FileIcon size={16} className="shrink-0 text-text-3" />}
                  <span className="min-w-0 flex-1">
                    <span className="block font-ui text-[12.5px] text-text-1 truncate">
                      {a.kind === 'link' ? a.link_url : a.file_name}
                    </span>
                    <span className="block font-mono text-[10px] text-text-4">
                      {a.kind === 'link' ? formatRelativeTime(a.created_at) : `${formatFileSize(a.file_size)} · ${formatRelativeTime(a.created_at)}`}
                    </span>
                  </span>
                  <ExternalLink size={13} className="shrink-0 text-text-4" />
                </button>
                {canDelete(a) && (
                  <button
                    onClick={() => setConfirming(a)}
                    aria-label={`Remove ${a.file_name}`}
                    className="mr-1 flex size-7 shrink-0 items-center justify-center rounded-sm text-text-4 opacity-100 transition-opacity hover:bg-surface-3 hover:text-error lg:opacity-0 lg:group-hover:opacity-100 lg:focus:opacity-100"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirming !== null}
        onClose={() => setConfirming(null)}
        onConfirm={confirmDelete}
        isPending={deleting}
        title="Remove file"
        message={
          confirming
            ? `"${confirming.file_name}" will be removed from this conversation for everyone, including the message it was sent with.`
            : ''
        }
        confirmLabel="Remove"
        danger
      />
    </div>
  )
}
