import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchNotifications,
  markNotificationRead,
  markAllRead,
} from '../api/notifications'

export const NOTIFICATION_KEYS = {
  all: (profileId: string) => ['notifications', profileId] as const,
}

export function useNotifications(profileId: string) {
  return useQuery({
    queryKey: NOTIFICATION_KEYS.all(profileId),
    queryFn: () => fetchNotifications(profileId),
    enabled: !!profileId,
    refetchInterval: 30_000,
  })
}

export function useMarkRead(profileId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (notificationId: string) => markNotificationRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all(profileId) })
    },
  })
}

export function useMarkAllRead(profileId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => markAllRead(profileId),
    onMutate: async () => {
      // Optimistic: mark all as read locally before server confirms
      await queryClient.cancelQueries({ queryKey: NOTIFICATION_KEYS.all(profileId) })
      const prev = queryClient.getQueryData(NOTIFICATION_KEYS.all(profileId))
      queryClient.setQueryData(
        NOTIFICATION_KEYS.all(profileId),
        (old: ReturnType<typeof fetchNotifications> extends Promise<infer T> ? T : never) =>
          old?.map((n) => ({ ...n, read: true })) ?? [],
      )
      return { prev }
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData(NOTIFICATION_KEYS.all(profileId), context.prev)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all(profileId) })
    },
  })
}
