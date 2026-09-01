import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'

export type MessageReactionRow = Tables<'message_reactions'>

export interface ReactionWithProfile extends MessageReactionRow {
  profile: { id: string; name: string; avatar_url: string | null } | null
}

export async function fetchChannelReactions(channelId: string): Promise<ReactionWithProfile[]> {
  const { data, error } = await supabase
    .from('message_reactions')
    .select('*, profile:profiles(id,name,avatar_url)')
    .eq('channel_id', channelId)
  if (error) throw error
  return data
}

/**
 * Sets the caller's reaction on a message. One per person: the same emoji again
 * takes it off, a different one replaces what they had. Done in one RPC so a
 * double-click can't race, and so channel_id stays server-derived. Resolves
 * true when a reaction is now on the message, false when it was taken off.
 */
export async function toggleReaction(messageId: string, emoji: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('fn_toggle_reaction', {
    p_message_id: messageId,
    p_emoji: emoji,
  })
  if (error) throw error
  return data
}
