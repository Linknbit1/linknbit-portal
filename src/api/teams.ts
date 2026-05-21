import { supabase } from '../lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '../types/database'

export type Team = Tables<'teams'>
export type TeamInsert = TablesInsert<'teams'>
export type TeamUpdate = TablesUpdate<'teams'>

export async function fetchTeams(): Promise<Team[]> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('name')
  if (error) throw error
  return data
}

export async function createTeam(payload: TeamInsert): Promise<Team> {
  const { data, error } = await supabase
    .from('teams')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTeam(id: string, payload: TeamUpdate): Promise<Team> {
  const { data, error } = await supabase
    .from('teams')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}
