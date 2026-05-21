import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'

export type NotificationRow = Tables<'notifications'>

export async function fetchNotifications(profileId: string): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(30)
  if (error) throw error
  return data
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id)
  if (error) throw error
}

export async function markAllRead(profileId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('profile_id', profileId)
    .eq('read', false)
  if (error) throw error
}
