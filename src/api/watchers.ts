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

/**
 * A task subscription is three-state, because assignees and the task's creator
 * are subscribed implicitly with no row of their own:
 *   'on'      — an explicit opt-in row
 *   'muted'   — an explicit opt-out, which overrides the implicit subscription
 *   'default' — no row; you get activity only if you're an assignee or creator
 */
export type TaskWatchState = 'on' | 'muted' | 'default'

export async function fetchTaskWatchState(taskId: string): Promise<TaskWatchState> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return 'default'
  const { data, error } = await supabase
    .from('task_watchers')
    .select('muted')
    .eq('task_id', taskId)
    .eq('profile_id', auth.user.id)
    .maybeSingle()
  if (error) throw error
  if (!data) return 'default'
  return data.muted ? 'muted' : 'on'
}

/** Writes (or clears) the explicit row. `state: 'default'` hands you back to the implicit rule. */
export async function setTaskWatchState(taskId: string, state: TaskWatchState): Promise<void> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('Not signed in')

  if (state === 'default') {
    const { error } = await supabase
      .from('task_watchers')
      .delete()
      .eq('task_id', taskId)
      .eq('profile_id', auth.user.id)
    if (error) throw error
    return
  }

  const { error } = await supabase
    .from('task_watchers')
    .upsert(
      { task_id: taskId, profile_id: auth.user.id, muted: state === 'muted' },
      { onConflict: 'task_id,profile_id' },
    )
  if (error) throw error
}
