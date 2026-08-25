import { supabase } from '../lib/supabase'
import type { Tables, TablesInsert } from '../types/database'

export type NavPin = Tables<'nav_pins'>

export async function fetchNavPins(): Promise<NavPin[]> {
  const { data, error } = await supabase
    .from('nav_pins')
    .select('*')
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export interface CreatePinPayload {
  profileId: string
  label: string
  path: string
  icon?: string | null
  position?: number
}

export async function createNavPin(payload: CreatePinPayload): Promise<NavPin> {
  const row: TablesInsert<'nav_pins'> = {
    profile_id: payload.profileId,
    label: payload.label.trim().slice(0, 60),
    path: payload.path,
    icon: payload.icon ?? null,
    position: payload.position ?? 0,
  }
  const { data, error } = await supabase.from('nav_pins').insert(row).select().single()
  if (error) throw error
  return data
}

export async function deleteNavPin(id: string): Promise<void> {
  const { error } = await supabase.from('nav_pins').delete().eq('id', id)
  if (error) throw error
}

/** Persists a whole reordering in one round trip. */
export async function reorderNavPins(ordered: { id: string; position: number }[]): Promise<void> {
  await Promise.all(
    ordered.map(({ id, position }) =>
      supabase.from('nav_pins').update({ position }).eq('id', id).then(({ error }) => {
        if (error) throw error
      }),
    ),
  )
}
