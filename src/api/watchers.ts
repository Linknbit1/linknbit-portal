import { supabase } from '../lib/supabase'

/** Whether the signed-in user is watching (subscribed to) a project. */
export async function fetchIsWatching(projectId: string): Promise<boolean> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return false
  const { count, error } = await supabase
    .from('project_watchers')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('profile_id', auth.user.id)
  if (error) throw error
  return (count ?? 0) > 0
}

export async function watchProject(projectId: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('Not signed in')
  const { error } = await supabase.from('project_watchers').insert({ project_id: projectId, profile_id: auth.user.id })
  // 23505 = already watching — treat as success.
  if (error && error.code !== '23505') throw error
}

export async function unwatchProject(projectId: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('Not signed in')
  const { error } = await supabase
    .from('project_watchers')
    .delete()
    .eq('project_id', projectId)
    .eq('profile_id', auth.user.id)
  if (error) throw error
}
