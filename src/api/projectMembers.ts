import { supabase } from '../lib/supabase'
import type { PersonMini } from './projects'

export interface ProjectMember extends PersonMini {
  role: string
  role_in_project: string | null
}

export async function fetchProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const { data, error } = await supabase
    .from('project_members')
    .select('role_in_project, profile:profiles(id,name,avatar_url,role)')
    .eq('project_id', projectId)
  if (error) throw error
  return data.flatMap((m) =>
    m.profile
      ? [{
          id: m.profile.id,
          name: m.profile.name,
          avatar_url: m.profile.avatar_url,
          role: m.profile.role,
          role_in_project: m.role_in_project,
        }]
      : [],
  )
}

export async function addProjectMember(projectId: string, profileId: string): Promise<void> {
  const { error } = await supabase
    .from('project_members')
    .upsert({ project_id: projectId, profile_id: profileId }, { onConflict: 'project_id,profile_id' })
  if (error) throw error
}

export async function removeProjectMember(projectId: string, profileId: string): Promise<void> {
  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('profile_id', profileId)
  if (error) throw error
}
