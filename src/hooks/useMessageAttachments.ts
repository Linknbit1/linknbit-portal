import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchMessageAttachments, uploadChatAttachment, deleteMessageAttachment, getChatAttachmentUrl,
} from '../api/messageAttachments'
import { MESSAGE_KEYS } from './useMessages'

export const MESSAGE_ATTACHMENT_KEYS = {
  byChannel: (channelId: string) => ['message-attachments', channelId] as const,
  url: (storagePath: string) => ['chat-attachment-url', storagePath] as const,
}

export function useMessageAttachments(channelId: string | undefined) {
  return useQuery({
    queryKey: MESSAGE_ATTACHMENT_KEYS.byChannel(channelId ?? ''),
    queryFn: () => fetchMessageAttachments(channelId!),
    enabled: !!channelId,
    staleTime: 10_000,
  })
}

export function useUploadChatAttachment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ file, channelId, onProgress }: { file: File; channelId: string; onProgress?: (p: number) => void }) =>
      uploadChatAttachment(file, { channelId, onProgress }),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: MESSAGE_ATTACHMENT_KEYS.byChannel(v.channelId) })
    },
  })
}

export function useDeleteChatAttachment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, storagePath }: { id: string; storagePath: string | null; channelId: string }) =>
      deleteMessageAttachment(id, storagePath),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: MESSAGE_ATTACHMENT_KEYS.byChannel(v.channelId) })
      qc.invalidateQueries({ queryKey: MESSAGE_KEYS.byChannel(v.channelId) })
    },
  })
}

/** Signed URLs expire (10 min), so cache them for slightly less than that. */
export function useChatAttachmentUrl(storagePath: string | null | undefined) {
  return useQuery({
    queryKey: MESSAGE_ATTACHMENT_KEYS.url(storagePath ?? ''),
    queryFn: () => getChatAttachmentUrl(storagePath!),
    enabled: !!storagePath,
    staleTime: 8 * 60_000,
    gcTime: 9 * 60_000,
  })
}
