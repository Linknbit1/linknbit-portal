import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { MESSAGE_KEYS } from '../useMessages'
import { CHAT_UNREAD_KEYS } from '../useChatUnreadCount'
import { MESSAGE_ATTACHMENT_KEYS } from '../useMessageAttachments'
import { REACTION_KEYS } from '../useMessageReactions'

/**
 * Live thread for the open conversation. The sender receives this event for
 * their own insert too, which is what swaps their optimistic row for the
 * authoritative one. Cache-only (per the Realtime rules).
 */
export function useRealtimeChatMessages(channelId: string | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!channelId) return

    const scope = { schema: 'public', filter: `channel_id=eq.${channelId}` } as const

    const channel = supabase
      .channel(`chat:${channelId}`)
      .on('postgres_changes', { event: '*', table: 'messages', ...scope }, () => {
        queryClient.invalidateQueries({ queryKey: MESSAGE_KEYS.byChannel(channelId) })
        queryClient.invalidateQueries({ queryKey: CHAT_UNREAD_KEYS.all })
      })
      .on('postgres_changes', { event: '*', table: 'message_attachments', ...scope }, () => {
        queryClient.invalidateQueries({ queryKey: MESSAGE_ATTACHMENT_KEYS.byChannel(channelId) })
      })
      .on('postgres_changes', { event: '*', table: 'message_reactions', ...scope }, () => {
        queryClient.invalidateQueries({ queryKey: REACTION_KEYS.byChannel(channelId) })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [channelId, queryClient])
}
