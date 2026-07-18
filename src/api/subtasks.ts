import { supabase } from '../lib/supabase'
import type { Tables, TablesUpdate } from '../types/database'

export type SubtaskRow = Tables<'subtasks'>

export async function fetchSubtasks(taskId: string): Promise<SubtaskRow[]> {
  const { data, error } = await supabase
    .from('subtasks')
    .select('*')
    .eq('task_id', taskId)
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function createSubtask(taskId: string, title: string, assigneeId?: string): Promise<SubtaskRow> {
  const { data, error } = await supabase
    .from('subtasks')
    .insert({ task_id: taskId, title, assignee_id: assigneeId ?? null })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function toggleSubtask(id: string, completed: boolean): Promise<SubtaskRow> {
  const { data, error } = await supabase.from('subtasks').update({ completed }).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function updateSubtask(id: string, updates: TablesUpdate<'subtasks'>): Promise<SubtaskRow> {
  const { data, error } = await supabase.from('subtasks').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteSubtask(id: string): Promise<void> {
  const { error } = await supabase.from('subtasks').delete().eq('id', id)
  if (error) throw error
}
