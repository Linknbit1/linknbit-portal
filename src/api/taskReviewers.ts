import { supabase } from '../lib/supabase'
import type { PersonMini } from './projects'

/**
 * Replace a task's reviewer set.
 *
 * No mirrored column to keep in step, unlike assignees: reviewers were added
 * after the single-value era, so the join table is the only place they live.
 */
export async function setTaskReviewers(taskId: string, profileIds: string[]): Promise<void> {
  const ids = [...new Set(profileIds.filter(Boolean))]

  const { data: current, error: readError } = await supabase
    .from('task_reviewers')
    .select('profile_id')
    .eq('task_id', taskId)
  if (readError) throw readError

  const have = new Set((current ?? []).map((r) => r.profile_id))
  const toAdd = ids.filter((id) => !have.has(id))
  const toRemove = [...have].filter((id) => !ids.includes(id))

  if (toAdd.length > 0) {
    const { error } = await supabase
      .from('task_reviewers')
      .insert(toAdd.map((profile_id) => ({ task_id: taskId, profile_id })))
    if (error) throw error
  }

  if (toRemove.length > 0) {
    const { error } = await supabase
      .from('task_reviewers')
      .delete()
      .eq('task_id', taskId)
      .in('profile_id', toRemove)
    if (error) throw error
  }
}

export async function fetchTaskReviewers(taskId: string): Promise<PersonMini[]> {
  const { data, error } = await supabase
    .from('task_reviewers')
    .select('profile:profiles(id,name,avatar_url,is_active)')
    .eq('task_id', taskId)
  if (error) throw error
  return data.flatMap((r) => (r.profile ? [r.profile] : []))
}
