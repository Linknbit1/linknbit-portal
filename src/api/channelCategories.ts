import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'

export type ChannelCategoryRow = Tables<'channel_categories'>

/**
 * Sidebar headings for channels. Ordered by `position`, then name so a set of
 * freshly created categories (all position 0) still lists predictably instead
 * of reshuffling between loads.
 */
export async function fetchChannelCategories(): Promise<ChannelCategoryRow[]> {
  const { data, error } = await supabase
    .from('channel_categories')
    .select('*')
    .order('position', { ascending: true })
    .order('name', { ascending: true })
  if (error) throw error
  return data
}

export async function createChannelCategory(name: string): Promise<ChannelCategoryRow> {
  const { data: auth } = await supabase.auth.getUser()
  // New categories land at the bottom; reordering is a separate, explicit act.
  const { data: last } = await supabase
    .from('channel_categories')
    .select('position')
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data, error } = await supabase
    .from('channel_categories')
    .insert({ name: name.trim(), position: (last?.position ?? 0) + 1, created_by: auth.user?.id ?? null })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function renameChannelCategory(id: string, name: string): Promise<void> {
  const { error } = await supabase.from('channel_categories').update({ name: name.trim() }).eq('id', id)
  if (error) throw error
}

/**
 * Removes the heading only. `channels.category_id` is ON DELETE SET NULL, so the
 * channels inside drop back to Uncategorised rather than disappearing with it.
 */
export async function deleteChannelCategory(id: string): Promise<void> {
  const { error } = await supabase.from('channel_categories').delete().eq('id', id)
  if (error) throw error
}

/** Moves a channel under a heading, or out of one when `categoryId` is null. */
export async function setChannelCategory(channelId: string, categoryId: string | null): Promise<void> {
  const { error } = await supabase.from('channels').update({ category_id: categoryId }).eq('id', channelId)
  if (error) throw error
}
