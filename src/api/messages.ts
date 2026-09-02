import { supabase } from '../lib/supabase'
import { linkAttachmentsToMessage } from './messageAttachments'
import type { Tables, Json } from '../types/database'

export type MessageRow = Tables<'messages'>

/** Just enough of the answered message to render a quote above the reply. */
export interface RepliedMessage {
  id: string
  body_text: string
  deleted_at: string | null
  author: { id: string; name: string } | null
}

export interface MessageWithAuthor extends MessageRow {
  author: { id: string; name: string; avatar_url: string | null; role: string } | null
  /** Null when this message answers nothing. A deleted original still arrives,
   *  carrying its deleted_at, so the quote can say so rather than go missing. */
  reply_to: RepliedMessage | null
}

export interface CreateMessageArgs {
  bodyText: string
  bodyDoc: Json | null
  /** Rows already uploaded by the composer, linked to this message on send. */
  attachmentIds?: string[]
  /** The message this answers, if any. */
  replyToId?: string | null
}

export const MESSAGE_PAGE_SIZE = 50

/**
 * One page of a channel's history, oldest-first for rendering. `before` pages
 * backwards through older messages as the user scrolls up.
 *
 * The quoted message is fetched separately rather than embedded. PostgREST can
 * express a self-referential embed, but not unambiguously here: hinting by the
 * constraint name is rejected outright (PGRST200 — there is no relationship
 * between 'messages' and 'messages' by that name), and hinting by the column
 * resolves the relationship in the wrong direction, returning the replies TO a
 * message rather than the one it answers. Since most messages have no replies,
 * that came back empty, and every quote in the app read as a deleted message.
 *
 * A second query costs one round trip when a page contains replies at all, and
 * says exactly what it wants.
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

  const parents = await fetchRepliedMessages(
    [...new Set(data.flatMap((m) => (m.reply_to_id ? [m.reply_to_id] : [])))],
  )

  return data
    .map((m) => ({ ...m, reply_to: m.reply_to_id ? parents.get(m.reply_to_id) ?? null : null }))
    .reverse()
}

/**
 * The messages a page of replies points at, by id. Only one level is followed,
 * so a reply to a reply quotes what it answers rather than the whole chain.
 */
async function fetchRepliedMessages(ids: string[]): Promise<Map<string, RepliedMessage>> {
  if (ids.length === 0) return new Map()

  const { data, error } = await supabase
    .from('messages')
    .select('id,body_text,deleted_at,author:profiles!messages_author_id_fkey(id,name)')
    .in('id', ids)
  if (error) throw error

  return new Map(data.map((m) => [m.id, m]))
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
      reply_to_id: args.replyToId ?? null,
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

export interface MessageSearchHit {
  id: string
  channel_id: string
  body_text: string
  created_at: string
  author: { id: string; name: string; avatar_url: string | null } | null
}

/**
 * Full-text-ish search across every message the caller can see — RLS already
 * limits this to their own channels, so no channel filter is needed here.
 * Matches on the plain-text mirror of the message body.
 */
export async function searchMessages(query: string, limit = 30): Promise<MessageSearchHit[]> {
  const term = query.trim()
  if (term.length < 2) return []

  // Escape the LIKE wildcards so a literal % or _ doesn't match everything.
  const escaped = term.replace(/[%_]/g, (c) => `\\${c}`)

  const { data, error } = await supabase
    .from('messages')
    .select('id, channel_id, body_text, created_at, author:profiles(id,name,avatar_url)')
    .is('deleted_at', null)
    .ilike('body_text', `%${escaped}%`)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
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
 * Soft delete: the row stays so the thread keeps its shape ("message deleted"),
 * while its files go for good, which also clears them from the conversation's
 * Media/Links/Files panel.
 *
 * The files used to be purged here, before this update. That put them in front
 * of the thing that might fail, so a rejected delete left the message standing
 * with its attachments already destroyed. trg_messages_purge_attachments now
 * does it inside the same transaction as the stamp, so the two cannot disagree,
 * and it also covers deletions this function is not involved in.
 */
export async function softDeleteMessage(id: string): Promise<void> {
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

/**
 * Winds the caller's read marker back so the conversation reads as unread again.
 * With no anchor it starts from the newest message.
 */
export async function markChannelUnread(channelId: string, beforeMessageId?: string): Promise<void> {
  const { error } = await supabase.rpc('fn_mark_channel_unread', {
    p_channel_id: channelId,
    p_before_message_id: beforeMessageId ?? undefined,
  })
  if (error) throw error
}
