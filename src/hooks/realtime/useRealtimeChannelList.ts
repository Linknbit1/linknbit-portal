import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { CHANNEL_KEYS } from '../useChannels'
import { CHAT_UNREAD_KEYS } from '../useChatUnreadCount'

/**
 * Keeps the conversation list and unread badges live app-wide. Deliberately
 * unfiltered: Realtime applies each table's SELECT policy per client, so a
 * subscriber only receives events for channels they're a member of.
 */
export function useRealtimeChannelList(enabled: boolean) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!enabled) return

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: CHANNEL_KEYS.all })
      queryClient.invalidateQueries({ queryKey: CHAT_UNREAD_KEYS.all })
    }

    const channel = supabase
      .channel('chat:list')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'channels' }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'channel_members' }, invalidate)
      // A reaction is activity too: it can be the newest thing in a conversation,
      // which changes both what the row says and where it sits in the list.
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, invalidate)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [enabled, queryClient])
}
