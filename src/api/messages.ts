import { supabase } from '../lib/supabase'
import { linkAttachmentsToMessage, purgeMessageAttachments } from './messageAttachments'
import type { Tables, Json } from '../types/database'

export type MessageRow = Tables<'messages'>

export interface MessageWithAuthor extends MessageRow {
  author: { id: string; name: string; avatar_url: string | null; role: string } | null
}

export interface CreateMessageArgs {
  bodyText: string
  bodyDoc: Json | null
  /** Rows already uploaded by the composer, linked to this message on send. */
  attachmentIds?: string[]
}

export const MESSAGE_PAGE_SIZE = 50

/**
 * One page of a channel's history, oldest-first for rendering. `before` pages
 * backwards through older messages as the user scrolls up.
 */
export async function fetchMessages(channelId: string, before?: string): Promise<MessageWithAuthor[]> {
  let query = supabase
    .from('messages')
    .select('*, author:profiles!messages_author_id_fkey(id,name,avatar_url,role)')
    .eq('channel_id', channelId)
    .order('created_at', { ascending: false })
    .limit(MESSAGE_PAGE_SIZE)

  if (before) query = query.lt('created_at', before)

  const { data, error } = await query
  if (error) throw error
  return data.reverse()
}

export async function createMessage(channelId: string, args: CreateMessageArgs): Promise<MessageRow> {
  const { data: auth } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('messages')
    .insert({
      channel_id: channelId,
      body_text: args.bodyText,
      body_doc: args.bodyDoc,
      author_id: auth.user?.id ?? null,
    })
    .select()
    .single()
  if (error) throw error

  if (args.attachmentIds && args.attachmentIds.length > 0) {
    await linkAttachmentsToMessage(args.attachmentIds, data.id)
  }

  // Bumps the channel so the conversation list re-sorts by recent activity.
  await supabase.from('channels').update({ updated_at: new Date().toISOString() }).eq('id', channelId)

  return data
}

export async function updateMessage(id: string, args: CreateMessageArgs): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .update({ body_text: args.bodyText, body_doc: args.bodyDoc })
    .eq('id', id)
  if (error) throw error
}

/**
 * Soft delete — the row stays so the thread keeps its shape ("message deleted"),
 * but any attached files are removed outright, so deleting a message also clears
 * it from the conversation's Media/Links/Files panel.
 */
export async function softDeleteMessage(id: string): Promise<void> {
  await purgeMessageAttachments(id)

  const { error } = await supabase
    .from('messages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function markChannelRead(channelId: string): Promise<void> {
  const { error } = await supabase.rpc('fn_mark_channel_read', { p_channel_id: channelId })
  if (error) throw error
}
