import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import {
  fetchMessages, createMessage, updateMessage, softDeleteMessage, markChannelRead, searchMessages,
  MESSAGE_PAGE_SIZE, type MessageWithAuthor, type CreateMessageArgs,
} from '../api/messages'
import { CHANNEL_KEYS } from './useChannels'
import { CHAT_UNREAD_KEYS } from './useChatUnreadCount'
import { MESSAGE_ATTACHMENT_KEYS } from './useMessageAttachments'
import type { Json } from '../types/database'

export const MESSAGE_KEYS = {
  byChannel: (channelId: string) => ['messages', channelId] as const,
  search: (query: string) => ['messages', 'search', query] as const,
}

type MessagePages = InfiniteData<MessageWithAuthor[], string | undefined>

export interface SendMessageArgs extends CreateMessageArgs {
  channelId: string
  /** Used for the optimistic bubble only; the server sets the real author. */
  author: { id: string; name: string; avatar_url: string | null; role: string } | null
}

/**
 * Channel history, paged backwards. Pages arrive oldest-first within a page;
 * page 0 is the newest window, so render pages in reverse.
 */
export function useMessages(channelId: string | undefined) {
  return useInfiniteQuery({
    queryKey: MESSAGE_KEYS.byChannel(channelId ?? ''),
    queryFn: ({ pageParam }) => fetchMessages(channelId!, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.length < MESSAGE_PAGE_SIZE ? undefined : lastPage[0]?.created_at,
    enabled: !!channelId,
    staleTime: 10_000,
  })
}

/**
 * Local echo on send: the message shows instantly for the sender via onMutate,
 * then the realtime INSERT event invalidates and the authoritative row replaces
 * the temp one. Other participants get it purely via realtime.
 */
export function useSendMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ channelId, bodyText, bodyDoc, attachmentIds }: SendMessageArgs) =>
      createMessage(channelId, { bodyText, bodyDoc, attachmentIds }),

    onMutate: async (v) => {
      const key = MESSAGE_KEYS.byChannel(v.channelId)
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<MessagePages>(key)

      const optimistic: MessageWithAuthor = {
        id: `optimistic-${crypto.randomUUID()}`,
        channel_id: v.channelId,
        author_id: v.author?.id ?? null,
        body_text: v.bodyText,
        body_doc: v.bodyDoc as Json,
        edited_at: null,
        deleted_at: null,
        created_at: new Date().toISOString(),
        author: v.author,
      }

      qc.setQueryData<MessagePages>(key, (old) => {
        if (!old || old.pages.length === 0) {
          return { pages: [[optimistic]], pageParams: [undefined] }
        }
        const pages = old.pages.slice()
        pages[0] = [...pages[0], optimistic]
        return { ...old, pages }
      })

      return { previous }
    },

    onError: (_err, v, ctx) => {
      if (ctx?.previous) qc.setQueryData(MESSAGE_KEYS.byChannel(v.channelId), ctx.previous)
    },

    onSettled: (_data, _err, v) => {
      qc.invalidateQueries({ queryKey: MESSAGE_KEYS.byChannel(v.channelId) })
      qc.invalidateQueries({ queryKey: MESSAGE_ATTACHMENT_KEYS.byChannel(v.channelId) })
      qc.invalidateQueries({ queryKey: CHANNEL_KEYS.all })
    },
  })
}

export function useEditMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, bodyText, bodyDoc }: { id: string; channelId: string } & CreateMessageArgs) =>
      updateMessage(id, { bodyText, bodyDoc }),
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: MESSAGE_KEYS.byChannel(v.channelId) }) },
  })
}

export function useDeleteMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; channelId: string }) => softDeleteMessage(id),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: MESSAGE_KEYS.byChannel(v.channelId) })
      // Its files are gone too, so the Media/Links/Files panel must refresh.
      qc.invalidateQueries({ queryKey: MESSAGE_ATTACHMENT_KEYS.byChannel(v.channelId) })
      qc.invalidateQueries({ queryKey: CHANNEL_KEYS.all })
    },
  })
}

/**
 * Message-content search. Debouncing is left to the caller's input; the query
 * stays disabled until the term is long enough to be meaningful.
 */
export function useMessageSearch(query: string) {
  const term = query.trim()
  return useQuery({
    queryKey: MESSAGE_KEYS.search(term),
    queryFn: () => searchMessages(term),
    enabled: term.length >= 2,
    staleTime: 15_000,
  })
}

export function useMarkChannelRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (channelId: string) => markChannelRead(channelId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: CHAT_UNREAD_KEYS.all }) },
  })
}

/** Flat, chronological view of every loaded page — what the thread renders. */
export function useFlatMessages(channelId: string | undefined) {
  const query = useMessages(channelId)
  const messages = query.data ? [...query.data.pages].reverse().flat() : []
  return { ...query, messages }
}
