import * as tus from 'tus-js-client'
import { supabase } from '../lib/supabase'
import { chatContentType, safeStorageName, RESUMABLE_THRESHOLD_BYTES } from '../lib/chatAttachment'
import type { Tables } from '../types/database'

export type MessageAttachmentRow = Tables<'message_attachments'>

const BUCKET = 'chat-attachments'
const SIGNED_URL_TTL_SECONDS = 600

export interface UploadChatFileArgs {
  channelId: string
  onProgress?: (percent: number) => void
}

/**
 * Files attached to a live message, oldest first so they render in the order
 * sent. The inner join drops attachments whose message was deleted — belt and
 * braces alongside purgeMessageAttachments, which also covers rows written
 * before that cleanup existed.
 */
export async function fetchMessageAttachments(channelId: string): Promise<MessageAttachmentRow[]> {
  const { data, error } = await supabase
    .from('message_attachments')
    .select('*, messages!inner(deleted_at)')
    .eq('channel_id', channelId)
    .not('message_id', 'is', null)
    .is('messages.deleted_at', null)
    .order('created_at', { ascending: true })
  if (error) throw error
  // Drop the join payload so callers get a clean row.
  return data.map((row) => {
    const { messages, ...rest } = row
    void messages
    return rest
  })
}

async function insertRow(
  args: { channelId: string; uploaderId: string | null; file: File; path: string },
): Promise<MessageAttachmentRow> {
  const { data, error } = await supabase
    .from('message_attachments')
    .insert({
      channel_id: args.channelId,
      uploader_id: args.uploaderId,
      kind: 'file',
      file_name: args.file.name,
      file_size: args.file.size,
      mime_type: chatContentType(args.file),
      storage_path: args.path,
    })
    .select()
    .single()

  if (error) {
    // Don't leave an orphaned object behind if the metadata row fails.
    await supabase.storage.from(BUCKET).remove([args.path])
    throw error
  }
  return data
}

/** Single-request upload — used for everything under the resumable threshold. */
async function uploadSimple(file: File, path: string): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: chatContentType(file), upsert: false })
  if (error) throw error
}

/**
 * Resumable upload via Supabase Storage's TUS endpoint. Same bucket and the
 * same RLS — only the transfer protocol differs — so a dropped connection
 * resumes rather than restarting a large file from zero.
 */
async function uploadResumable(file: File, path: string, onProgress?: (percent: number) => void): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token
  if (!accessToken) throw new Error('not_authenticated')

  await new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/upload/resumable`,
      retryDelays: [0, 1000, 3000, 5000],
      headers: {
        authorization: `Bearer ${accessToken}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: BUCKET,
        objectName: path,
        contentType: chatContentType(file),
        cacheControl: '3600',
      },
      // Supabase's TUS endpoint requires exactly 6MB chunks.
      chunkSize: 6 * 1024 * 1024,
      onProgress: (sent, total) => onProgress?.(Math.round((sent / total) * 100)),
      onSuccess: () => resolve(),
      onError: (err) => reject(err),
    })
    upload.start()
  })
}

/**
 * Uploads a chat file and records it, unattached (message_id null) so the
 * composer can show it immediately; sending the message links it.
 */
export async function uploadChatAttachment(file: File, args: UploadChatFileArgs): Promise<MessageAttachmentRow> {
  const { data: auth } = await supabase.auth.getUser()
  const path = `${args.channelId}/${crypto.randomUUID()}-${safeStorageName(file.name)}`

  if (file.size > RESUMABLE_THRESHOLD_BYTES) {
    await uploadResumable(file, path, args.onProgress)
  } else {
    args.onProgress?.(50)
    await uploadSimple(file, path)
    args.onProgress?.(100)
  }

  return insertRow({ channelId: args.channelId, uploaderId: auth.user?.id ?? null, file, path })
}

/** Attaches freshly-uploaded rows to the message that was just created. */
export async function linkAttachmentsToMessage(attachmentIds: string[], messageId: string): Promise<void> {
  if (attachmentIds.length === 0) return
  const { error } = await supabase
    .from('message_attachments')
    .update({ message_id: messageId })
    .in('id', attachmentIds)
    .is('message_id', null)
  if (error) throw error
}

export async function deleteMessageAttachment(id: string, storagePath: string | null): Promise<void> {
  const { error } = await supabase.from('message_attachments').delete().eq('id', id)
  if (error) throw error
  if (storagePath) await supabase.storage.from(BUCKET).remove([storagePath])
}

/**
 * Removes every file belonging to a message, from both the table and storage.
 * Called when a message is deleted so its files also disappear from the
 * Media/Links/Files panel instead of lingering as orphans.
 */
export async function purgeMessageAttachments(messageId: string): Promise<void> {
  const { data, error } = await supabase
    .from('message_attachments')
    .select('id, storage_path')
    .eq('message_id', messageId)
  if (error) throw error
  if (data.length === 0) return

  const { error: deleteError } = await supabase
    .from('message_attachments')
    .delete()
    .eq('message_id', messageId)
  if (deleteError) throw deleteError

  const paths = data.flatMap((a) => (a.storage_path ? [a.storage_path] : []))
  if (paths.length > 0) await supabase.storage.from(BUCKET).remove(paths)
}

/** Short-lived signed URL — chat files are never public. */
export async function getChatAttachmentUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS)
  if (error) throw error
  return data.signedUrl
}
