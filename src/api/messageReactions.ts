import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'

export type MessageReactionRow = Tables<'message_reactions'>

export interface ReactionWithProfile extends MessageReactionRow {
  profile: { id: string; name: string } | null
}

export async function fetchChannelReactions(channelId: string): Promise<ReactionWithProfile[]> {
  const { data, error } = await supabase
    .from('message_reactions')
    .select('*, profile:profiles(id,name)')
    .eq('channel_id', channelId)
  if (error) throw error
  return data
}

/**
 * Adds the reaction, or removes it when the caller already reacted with that
 * emoji. Done in one RPC so a double-click can't race, and so channel_id stays
 * server-derived. Resolves true when added, false when removed.
 */
export async function toggleReaction(messageId: string, emoji: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('fn_toggle_reaction', {
    p_message_id: messageId,
    p_emoji: emoji,
  })
  if (error) throw error
  return data
}
