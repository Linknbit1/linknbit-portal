import { supabase } from '../lib/supabase'

export interface ChannelUnread {
  channel_id: string
  unread_count: number
}

/** One round-trip for every channel with unread messages — feeds both the nav badge and per-row badges. */
export async function fetchChatUnreadCounts(): Promise<ChannelUnread[]> {
  const { data, error } = await supabase.rpc('fn_chat_unread_counts')
  if (error) throw error
  return (data ?? []).map((r) => ({ channel_id: r.channel_id, unread_count: Number(r.unread_count) }))
}
