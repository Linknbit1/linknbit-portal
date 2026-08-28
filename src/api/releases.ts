import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'

export type ReleaseAnnouncement = Tables<'release_announcements'>

/** Which versions have already been pushed out as a notification. */
export async function fetchReleaseAnnouncements(): Promise<ReleaseAnnouncement[]> {
  const { data, error } = await supabase
    .from('release_announcements')
    .select('*')
    .order('announced_at', { ascending: false })
  if (error) throw error
  return data
}

/**
 * Records that this person has opened the changelog at `version`, which is what
 * puts the sidebar dot out. Deliberately not a profile update: the RPC writes
 * one column and nothing else.
 */
export async function markReleaseSeen(version: string): Promise<void> {
  const { error } = await supabase.rpc('mark_release_seen', { p_version: version })
  if (error) throw error
}

/** Notifies every active internal user. Refused if this version already went out. */
export async function announceRelease(
  version: string,
  title: string,
  body: string,
): Promise<number> {
  const { data, error } = await supabase.rpc('announce_release', {
    p_version: version,
    p_title: title,
    p_body: body,
  })
  if (error) throw error
  return data ?? 0
}
