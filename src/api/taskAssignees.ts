import { supabase } from '../lib/supabase'
import type { PersonMini } from './projects'

/**
 * Replace a task's assignee set. `tasks.assignee_id` is kept in sync with the
 * first assignee so existing single-assignee reads (board/list cards, filters)
 * keep working.
 */
export async function setTaskAssignees(taskId: string, profileIds: string[]): Promise<void> {
  const ids = [...new Set(profileIds)]

  const { error: delErr } = await supabase
    .from('task_assignees')
    .delete()
    .eq('task_id', taskId)
    .not('profile_id', 'in', `(${ids.length ? ids.join(',') : '00000000-0000-0000-0000-000000000000'})`)
  if (delErr) throw delErr

  if (ids.length) {
    const { error } = await supabase
      .from('task_assignees')
      .upsert(ids.map((profile_id) => ({ task_id: taskId, profile_id })), { onConflict: 'task_id,profile_id' })
    if (error) throw error
  }

  const { error: taskErr } = await supabase
    .from('tasks')
    .update({ assignee_id: ids[0] ?? null })
    .eq('id', taskId)
  if (taskErr) throw taskErr
}

export async function fetchTaskAssignees(taskId: string): Promise<PersonMini[]> {
  const { data, error } = await supabase
    .from('task_assignees')
    .select('profile:profiles(id,name,avatar_url)')
    .eq('task_id', taskId)
  if (error) throw error
  return data.flatMap((r) => (r.profile ? [r.profile] : []))
}
