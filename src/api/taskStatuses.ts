import { supabase } from '../lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '../types/database'

export type TaskStatusRow = Tables<'task_statuses'>

export async function fetchTaskStatuses(): Promise<TaskStatusRow[]> {
  const { data, error } = await supabase
    .from('task_statuses')
    .select('*')
    .order('sort_order')
  if (error) throw error
  return data
}

export async function createTaskStatus(payload: TablesInsert<'task_statuses'>): Promise<TaskStatusRow> {
  const { data, error } = await supabase.from('task_statuses').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function updateTaskStatus(
  key: string,
  updates: TablesUpdate<'task_statuses'>,
): Promise<TaskStatusRow> {
  const { data, error } = await supabase
    .from('task_statuses')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('key', key)
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Deletes a column. Refused by the foreign key while any task still sits in it,
 * which is the answer we want: the alternative is silently moving somebody's
 * work somewhere they did not put it.
 */
export async function deleteTaskStatus(key: string): Promise<void> {
  const { error } = await supabase.from('task_statuses').delete().eq('key', key)
  if (error) throw error
}

/**
 * Marks one column as the review column, clearing whichever held it.
 *
 * Two statements rather than one because a partial unique index enforces "at
 * most one", so the old holder has to let go before the new one takes it.
 */
export async function setReviewStatus(key: string | null): Promise<void> {
  const { error: clearErr } = await supabase
    .from('task_statuses')
    .update({ is_review: false })
    .eq('is_review', true)
  if (clearErr) throw clearErr
  if (!key) return

  const { error } = await supabase.from('task_statuses').update({ is_review: true }).eq('key', key)
  if (error) throw error
}
