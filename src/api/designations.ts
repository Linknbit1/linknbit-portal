import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'

export type Designation = Tables<'designations'>

export interface DesignationUsage { people: number }

export function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export async function fetchDesignations(): Promise<Designation[]> {
  const { data, error } = await supabase
    .from('designations')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw error
  return data
}

export async function createDesignation(input: { name: string }): Promise<Designation> {
  const { data, error } = await supabase
    .from('designations')
    .insert({ name: input.name.trim(), slug: slugify(input.name) })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateDesignation(
  id: string,
  updates: { name?: string; is_active?: boolean },
): Promise<Designation> {
  const { data, error } = await supabase.from('designations').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteDesignation(id: string): Promise<void> {
  const { error } = await supabase.from('designations').delete().eq('id', id)
  if (error) throw error
}

// Count employees still assigned this designation — surfaced as a warning before
// deletion (the FK is ON DELETE SET NULL, so removal won't error, just unset).
export async function fetchDesignationUsage(id: string): Promise<DesignationUsage> {
  const { count, error } = await supabase
    .from('profiles').select('id', { count: 'exact', head: true }).eq('designation_id', id)
  if (error) throw error
  return { people: count ?? 0 }
}
