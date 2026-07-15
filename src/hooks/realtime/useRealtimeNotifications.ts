import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/ui/toast-context'
import { NOTIFICATION_KEYS } from '../useNotifications'
import type { NotificationRow } from '../../api/notifications'

/**
 * Live notifications for the signed-in user.
 *
 * This is the IN-APP channel and is deliberately independent of web push: it
 * works even when someone denied notification permission, and it is what makes a
 * focused tab show a toast. The service worker suppresses the system popup while
 * a window is focused precisely so these two never double up.
 *
 * The realtime event only refreshes the cache and raises a toast — the gate
 * trigger has already dropped anything this user opted out of, so whatever
 * arrives here is meant to be seen.
 */
export function useRealtimeNotifications(profileId: string) {
  const queryClient = useQueryClient()
  const toast = useToast()
  // Keep the latest toast fn without re-subscribing the channel on every render.
  const toastRef = useRef(toast)
  useEffect(() => { toastRef.current = toast }, [toast])

  useEffect(() => {
    if (!profileId) return

    const channel = supabase
      .channel(`notifications:${profileId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `profile_id=eq.${profileId}`,
        },
        (payload) => {
          const row = payload.new as NotificationRow
          queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all(profileId) })
          // Only speak up if the user is actually looking — otherwise the push
          // notification is the right surface and a toast would go unseen.
          if (document.visibilityState === 'visible') {
            toastRef.current(row.body ? `${row.title} — ${row.body}` : row.title, 'info')
          }
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profileId, queryClient])
}
