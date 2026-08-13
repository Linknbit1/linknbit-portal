import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchChannelCategories, createChannelCategory, renameChannelCategory,
  deleteChannelCategory, setChannelCategory,
} from '../api/channelCategories'
import { CHANNEL_KEYS } from './useChannels'

export const CHANNEL_CATEGORY_KEYS = {
  all: ['channel-categories'] as const,
}

export function useChannelCategories() {
  return useQuery({
    queryKey: CHANNEL_CATEGORY_KEYS.all,
    queryFn: fetchChannelCategories,
    staleTime: 60_000,
  })
}

/**
 * Every category mutation can change how the sidebar groups, so each one
 * refreshes the channel list alongside the categories themselves.
 */
function useCategoryInvalidation() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: CHANNEL_CATEGORY_KEYS.all })
    qc.invalidateQueries({ queryKey: CHANNEL_KEYS.all })
  }
}

export function useCreateChannelCategory() {
  const invalidate = useCategoryInvalidation()
  return useMutation({ mutationFn: (name: string) => createChannelCategory(name), onSuccess: invalidate })
}

export function useRenameChannelCategory() {
  const invalidate = useCategoryInvalidation()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameChannelCategory(id, name),
    onSuccess: invalidate,
  })
}

export function useDeleteChannelCategory() {
  const invalidate = useCategoryInvalidation()
  return useMutation({ mutationFn: (id: string) => deleteChannelCategory(id), onSuccess: invalidate })
}

export function useSetChannelCategory() {
  const invalidate = useCategoryInvalidation()
  return useMutation({
    mutationFn: ({ channelId, categoryId }: { channelId: string; categoryId: string | null }) =>
      setChannelCategory(channelId, categoryId),
    onSuccess: invalidate,
  })
}
