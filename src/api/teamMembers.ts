import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'

export type TeamMember = Tables<'team_members'>

export async function fetchTeamMembers(): Promise<TeamMember[]> {
  const { data, error } = await supabase.from('team_members').select('*')
  if (error) throw error
  return data
}

export async function addTeamMember(teamId: string, profileId: string): Promise<void> {
  const { error } = await supabase
    .from('team_members')
    .upsert({ team_id: teamId, profile_id: profileId }, { onConflict: 'team_id,profile_id' })
  if (error) throw error
}

export async function removeTeamMember(teamId: string, profileId: string): Promise<void> {
  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('profile_id', profileId)
  if (error) throw error
}

// Replace a profile's full set of team memberships in one call (used by the
// People edit/invite flows). Authority checks live in the SECURITY DEFINER RPC.
export async function setProfileTeams(profileId: string, teamIds: string[]): Promise<void> {
  const { error } = await supabase.rpc('set_profile_teams', {
    p_profile_id: profileId,
    p_team_ids: teamIds,
  })
  if (error) throw error
}
