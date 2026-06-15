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
export async function fetchServiceUsage(slug: string): Promise<ServiceUsage> {
  const [people, teams] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('service_type', slug),
    supabase.from('teams').select('id', { count: 'exact', head: true }).eq('service_type', slug),
  ])
  if (people.error) throw people.error
  if (teams.error) throw teams.error
  return { people: people.count ?? 0, teams: teams.count ?? 0 }
}
