import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'

export type Service = Tables<'services'>

export interface ServiceUsage { people: number; teams: number }

export function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export async function fetchServices(): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw error
  return data
}

export async function createService(input: { name: string; color: string }): Promise<Service> {
  const { data, error } = await supabase
    .from('services')
    .insert({ name: input.name.trim(), slug: slugify(input.name), color: input.color })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateService(
  id: string,
  updates: { name?: string; color?: string; is_active?: boolean },
): Promise<Service> {
  const { data, error } = await supabase.from('services').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteService(id: string): Promise<void> {
  const { error } = await supabase.from('services').delete().eq('id', id)
  if (error) throw error
}

// Count records still pointing at a service slug — used to block deletion gracefully.
// Employees no longer carry a service (they have a designation), so only teams are
// counted; `people` stays 0 to preserve the ServiceUsage shape used by the UI.
export async function fetchServiceUsage(slug: string): Promise<ServiceUsage> {
  const { count, error } = await supabase
    .from('teams').select('id', { count: 'exact', head: true }).eq('service_type', slug)
  if (error) throw error
  return { people: 0, teams: count ?? 0 }
}
