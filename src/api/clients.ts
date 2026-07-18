import { supabase } from '../lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '../types/database'

export type ClientRow = Tables<'clients'>

export interface ClientWithStats extends ClientRow {
  account_manager: { id: string; name: string; avatar_url: string | null } | null
  project_count: number
}

export async function fetchClients(): Promise<ClientWithStats[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('*, account_manager:profiles!clients_account_manager_id_fkey(id,name,avatar_url), project_count:projects(count)')
    .is('deleted_at', null)
    .order('name', { ascending: true })
  if (error) throw error
  return data.map(({ project_count, ...rest }) => ({ ...rest, project_count: project_count[0]?.count ?? 0 }))
}

export async function fetchClient(id: string): Promise<ClientWithStats | null> {
  const { data, error } = await supabase
    .from('clients')
    .select('*, account_manager:profiles!clients_account_manager_id_fkey(id,name,avatar_url), project_count:projects(count)')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const { project_count, ...rest } = data
  return { ...rest, project_count: project_count[0]?.count ?? 0 }
}

export async function createClient(payload: TablesInsert<'clients'>): Promise<ClientRow> {
  const { data, error } = await supabase.from('clients').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function updateClient(id: string, updates: TablesUpdate<'clients'>): Promise<ClientRow> {
  const { data, error } = await supabase.from('clients').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

/** Soft delete — keeps history and satisfies the admin-only trash policy. */
export async function deleteClient(id: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser()
  const { error } = await supabase
    .from('clients')
    .update({ deleted_at: new Date().toISOString(), deleted_by: auth.user?.id ?? null })
    .eq('id', id)
  if (error) throw error
}
