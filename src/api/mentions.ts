import { supabase } from '../lib/supabase'

export type MentionSource = 'comment' | 'task' | 'project'

/**
 * Ensure a mention row exists for each mentioned person on a source (comment /
 * task doc / project doc), excluding the author and anyone already recorded.
 * The AFTER INSERT trigger notifies newly-inserted recipients — so calling this
 * repeatedly on autosave only notifies people the *first* time they're tagged.
 */
export async function syncMentions(
  sourceType: MentionSource,
  sourceId: string,
  projectId: string,
  profileIds: string[],
): Promise<void> {
  const { data: auth } = await supabase.auth.getUser()
  const self = auth.user?.id ?? null
  const targets = [...new Set(profileIds)].filter((id) => id && id !== self)
  if (targets.length === 0) return

  const { data: existing, error: exErr } = await supabase
    .from('mentions')
    .select('profile_id')
    .eq('source_type', sourceType)
    .eq('source_id', sourceId)
  if (exErr) throw exErr

  const have = new Set((existing ?? []).map((r) => r.profile_id))
  const rows = targets
    .filter((id) => !have.has(id))
    .map((id) => ({ source_type: sourceType, source_id: sourceId, project_id: projectId, profile_id: id, created_by: self }))
  if (rows.length === 0) return

  const { error } = await supabase.from('mentions').insert(rows)
  if (error) throw error
}

/**
 * Task ids the given person has been @mentioned on — directly on the task doc, or
 * in one of its comments.
 *
 * Two round trips because a comment mention records the comment id, so it has to
 * be resolved to the task it belongs to. Me Mode pairs this with assignment: being
 * tagged in a thread is how work reaches you when nobody assigned it.
 */
export async function fetchMentionedTaskIds(profileId: string): Promise<string[]> {
  if (!profileId) return []

  const { data: rows, error } = await supabase
    .from('mentions')
    .select('source_type, source_id')
    .eq('profile_id', profileId)
    .in('source_type', ['task', 'comment'])
  if (error) throw error

  const taskIds = new Set<string>()
  const commentIds: string[] = []
  for (const r of rows) {
    if (r.source_type === 'task') taskIds.add(r.source_id)
    else commentIds.push(r.source_id)
  }

  if (commentIds.length > 0) {
    const { data: comments, error: cErr } = await supabase
      .from('comments')
      .select('task_id')
      .in('id', commentIds)
      .not('task_id', 'is', null)
    if (cErr) throw cErr
    for (const c of comments) if (c.task_id) taskIds.add(c.task_id)
  }

  return [...taskIds]
}
