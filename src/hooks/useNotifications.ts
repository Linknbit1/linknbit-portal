import { useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchNotifications,
  markNotificationRead,
  markNotificationsRead,
  markAllRead,
  fetchNotificationPreferences,
  setNotificationPreference,
  fetchPushSubscriptions,
  fetchVapidPublicKey,
  upsertPushSubscription,
  setPushSubscriptionEnabled,
  deletePushSubscription,
} from '../api/notifications'
import {
  subscribeThisDevice,
  unsubscribeThisDevice,
  getCurrentSubscription,
  permissionState,
} from '../lib/push'
import { getDeviceName, getDeviceToken } from '../lib/deviceUtils'

export const NOTIFICATION_KEYS = {
  all: (profileId: string) => ['notifications', profileId] as const,
  preferences: (profileId: string) => ['notification_preferences', profileId] as const,
  pushSubscriptions: (profileId: string) => ['push_subscriptions', profileId] as const,
  currentPushSubscription: () => ['push_subscriptions', 'current'] as const,
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

/** Clears every notification behind one grouped row. */
export function useMarkGroupRead(profileId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => markNotificationsRead(ids),
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

// ── Preferences ──────────────────────────────────────────────────────────────
// Opt-out: the table only holds rows for types a user switched OFF, so an absent
// row means enabled. Callers get a simple `isEnabled(type)` instead of the rows.

export function useNotificationPreferences(profileId: string) {
  const query = useQuery({
    queryKey: NOTIFICATION_KEYS.preferences(profileId),
    queryFn: () => fetchNotificationPreferences(profileId),
    enabled: !!profileId,
    staleTime: 60_000,
  })
  const disabled = new Set((query.data ?? []).filter((p) => !p.enabled).map((p) => p.type))
  return { ...query, isEnabled: (type: string) => !disabled.has(type) }
}

export function useSetNotificationPreference(profileId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ type, enabled }: { type: string; enabled: boolean }) =>
      setNotificationPreference(profileId, type, enabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTIFICATION_KEYS.preferences(profileId) }),
  })
}

// ── Push devices ─────────────────────────────────────────────────────────────

/** Every device this account has subscribed — one row per browser install. */
export function usePushSubscriptions(profileId: string) {
  return useQuery({
    queryKey: NOTIFICATION_KEYS.pushSubscriptions(profileId),
    queryFn: () => fetchPushSubscriptions(profileId),
    enabled: !!profileId,
  })
}

/** The endpoint this browser holds, used to mark "This device" in the list. */
export function useCurrentPushEndpoint() {
  return useQuery({
    queryKey: NOTIFICATION_KEYS.currentPushSubscription(),
    queryFn: async () => (await getCurrentSubscription())?.endpoint ?? null,
    staleTime: 30_000,
  })
}

/**
 * Puts this browser's push subscription back on the server if it has gone
 * missing, once per session and without asking anybody anything.
 *
 * It goes missing more often than it sounds. Push services expire an endpoint,
 * or rotate it; the send function then gets a 410 and deletes the row, which is
 * correct — a dead endpoint is worse than none. But nothing ever put a row back,
 * so from that moment the person silently received no push at all, on a portal
 * that still showed their notifications as switched on. That is the whole of
 * "some people get notified and some do not": it is not the notification, it is
 * who it was for.
 *
 * Deliberately narrow. It only acts when the BROWSER still holds a subscription
 * and the server does not know about that endpoint — a repair, never a decision.
 * Somebody who turned push off has no browser subscription, so this leaves them
 * alone rather than quietly switching them back on.
 */
export function useResyncPushSubscription(profileId: string) {
  const ran = useRef(false)

  useEffect(() => {
    if (!profileId || ran.current) return
    if (permissionState() !== 'granted') return
    ran.current = true

    void (async () => {
      try {
        const browserSub = await getCurrentSubscription()
        if (!browserSub) return

        const known = await fetchPushSubscriptions(profileId)
        if (known.some((row) => row.endpoint === browserSub.endpoint)) return

        await upsertPushSubscription({
          profileId,
          endpoint: browserSub.endpoint,
          p256dh: browserSub.p256dh,
          auth: browserSub.auth,
          deviceLabel: getDeviceName(),
          deviceFingerprint: getDeviceToken(),
        })
      } catch {
        // A background repair has no business interrupting anyone when it fails.
      }
    })()
  }, [profileId])
}

/** Enable push on THIS device — the only device a browser can subscribe for. */
export function useEnablePushHere(profileId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const key = await fetchVapidPublicKey()
      const sub = await subscribeThisDevice(key)
      await upsertPushSubscription({
        profileId,
        endpoint: sub.endpoint,
        p256dh: sub.p256dh,
        auth: sub.auth,
        deviceLabel: getDeviceName(),
        // Soft link only — push never requires an enrolled device.
        deviceFingerprint: getDeviceToken(),
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NOTIFICATION_KEYS.pushSubscriptions(profileId) })
      qc.invalidateQueries({ queryKey: NOTIFICATION_KEYS.currentPushSubscription() })
    },
  })
}

/** Turn push off. For this device we also unsubscribe the browser itself. */
export function useDisablePushDevice(profileId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, isCurrentDevice }: { id: string; isCurrentDevice: boolean }) => {
      if (isCurrentDevice) await unsubscribeThisDevice()
      await deletePushSubscription(id)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NOTIFICATION_KEYS.pushSubscriptions(profileId) })
      qc.invalidateQueries({ queryKey: NOTIFICATION_KEYS.currentPushSubscription() })
    },
  })
}

/** Mute/unmute a device without unsubscribing it (works for remote devices too). */
export function useTogglePushDevice(profileId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      setPushSubscriptionEnabled(id, enabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTIFICATION_KEYS.pushSubscriptions(profileId) }),
  })
}
