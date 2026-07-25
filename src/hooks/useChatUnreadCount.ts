import { useQuery } from '@tanstack/react-query'
import { fetchChatUnreadCounts } from '../api/chatUnread'
import { useAuthContext } from '../context/AuthContext'

export const CHAT_UNREAD_KEYS = {
  all: ['chat-unread'] as const,
}

export function useChatUnreadCounts() {
  const { accessToken } = useAuthContext()
  return useQuery({
    queryKey: CHAT_UNREAD_KEYS.all,
    queryFn: fetchChatUnreadCounts,
    enabled: !!accessToken,
    staleTime: 15_000,
  })
}

/** Per-channel lookup for conversation-row badges. */
export function useChatUnreadMap(): Map<string, number> {
  const { data = [] } = useChatUnreadCounts()
  return new Map(data.map((r) => [r.channel_id, r.unread_count]))
}

/** Single total for the sidebar nav badge. */
export function useChatUnreadTotal(): number {
  const { data = [] } = useChatUnreadCounts()
  return data.reduce((sum, r) => sum + r.unread_count, 0)
}
