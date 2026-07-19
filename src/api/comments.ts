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

export async function deleteComment(id: string): Promise<void> {
  const { error } = await supabase.from('comments').delete().eq('id', id)
  if (error) throw error
}
