import { supabase } from '../lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '../types/database'

export type StageRow = Tables<'stages'>

export async function fetchStages(projectId: string): Promise<StageRow[]> {
  const { data, error } = await supabase
    .from('stages')
    .select('*')
    .eq('project_id', projectId)
    .order('order_index', { ascending: true })
  if (error) throw error
  return data
}

export async function createStage(payload: TablesInsert<'stages'>): Promise<StageRow> {
  const { data, error } = await supabase.from('stages').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function updateStage(id: string, updates: TablesUpdate<'stages'>): Promise<StageRow> {
  const { data, error } = await supabase.from('stages').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteStage(id: string): Promise<void> {
  const { error } = await supabase.from('stages').delete().eq('id', id)
  if (error) throw error
}

/** Persist a new stage order (called after drag-reorder). */
export async function reorderStages(orderedIds: string[]): Promise<void> {
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from('stages').update({ order_index: index }).eq('id', id).then(({ error }) => {
        if (error) throw error
      }),
    ),
  )
}
