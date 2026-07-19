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
