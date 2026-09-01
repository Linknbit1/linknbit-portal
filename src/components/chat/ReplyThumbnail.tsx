import { fileKind } from '../../lib/attachment'
import { useChatAttachmentUrl } from '../../hooks/useMessageAttachments'
import type { MessageAttachmentRow } from '../../api/messageAttachments'

/**
 * The picture a reply is answering, at quote size.
 *
 * A reply to a screenshot used to read "Zain Malik — Attachment", which names
 * the wrong thing: the message WAS the image, so the quote has to show it or it
 * identifies nothing. Renders only for images; a PDF has no thumbnail worth
 * fetching a signed URL for, and its filename already carries the meaning.
 */
export function ReplyThumbnail({ attachment }: { attachment?: MessageAttachmentRow | null }) {
  const isImage = !!attachment && fileKind(attachment.mime_type, attachment.file_name) === 'image'
  const { data: url } = useChatAttachmentUrl(isImage ? attachment.storage_path : null)

  if (!isImage) return null

  // The placeholder holds the space while the signed URL is minted, so the
  // quote does not jump sideways the moment it arrives.
  return url
    ? <img src={url} alt="" className="size-7 shrink-0 rounded-xs border border-border-subtle object-cover" />
    : <span className="size-7 shrink-0 rounded-xs border border-border-subtle bg-surface-3" />
}
