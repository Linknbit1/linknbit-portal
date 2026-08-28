import { supabase } from '../lib/supabase'
import type { Tables, Json } from '../types/database'

export type CommentRow = Tables<'comments'>

export interface CommentWithAuthor extends CommentRow {
  author: { id: string; name: string; avatar_url: string | null; role: string } | null
}

export interface CreateCommentArgs {
  content: string
  doc: Json | null
  isInternal: boolean
}

export async function fetchComments(taskId: string): Promise<CommentWithAuthor[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('*, author:profiles!comments_author_id_fkey(id,name,avatar_url,role)')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

/**
 * The most recent time `profileId` commented on each of `taskIds`, keyed by task.
 * Tasks they have never commented on are simply absent.
 *
 * Used to decide whether an @mention is still waiting on them: being tagged is a
 * request for a reply, so a reply on the thread settles it — whether or not the
 * notification itself was ever opened.
 */
export async function fetchMyLatestCommentAt(
  profileId: string,
  taskIds: string[],
): Promise<Record<string, string>> {
  if (!profileId || taskIds.length === 0) return {}

  const { data, error } = await supabase
    .from('comments')
    .select('task_id, created_at')
    .eq('author_id', profileId)
    .in('task_id', taskIds)
    .order('created_at', { ascending: false })
  if (error) throw error

  const latest: Record<string, string> = {}
  // Newest first, so the first row seen for a task is its most recent comment.
  for (const row of data) {
    if (row.task_id && !(row.task_id in latest)) latest[row.task_id] = row.created_at
  }
  return latest
}

export async function createComment(taskId: string, args: CreateCommentArgs): Promise<CommentRow> {
  const { data: auth } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('comments')
    .insert({ task_id: taskId, content: args.content, doc: args.doc, is_internal: args.isInternal, author_id: auth.user?.id ?? null })
    .select()
    .single()
  if (error) throw error
  return data
}

export interface UpdateCommentArgs {
  content: string
  doc: Json | null
}

/**
 * Edit a comment's body. RLS (p_comments_update) already limits this to the
 * author or a can_moderate_comments holder, so there is no check to repeat here.
 * `updated_at` is what the UI reads to mark a comment as edited.
 */
export async function updateComment(id: string, args: UpdateCommentArgs): Promise<CommentRow> {
  const { data, error } = await supabase
    .from('comments')
    .update({ content: args.content, doc: args.doc, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteComment(id: string): Promise<void> {
  const { error } = await supabase.from('comments').delete().eq('id', id)
  if (error) throw error
}
