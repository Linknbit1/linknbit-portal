import { useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import type { ProfileRow } from '../../api/auth'

/**
 * Watches the signed-in user's own profile row and signs them out the moment
 * they are deactivated.
 *
 * Without this, a deactivated employee keeps working until their access token
 * expires — auth-refresh then rejects them, but that can be the better part of an
 * hour. Deactivation means they have left the building, so the portal should
 * close in seconds, not eventually.
 *
 * The subscription is filtered to `id=eq.<mine>` server-side, so this receives
 * one row (their own) rather than every profile change in the company. The
 * own-profile RLS policy is `id = auth.uid()` with no is_active condition, which
 * is what lets the deactivating UPDATE still reach them — the very last thing
 * they are allowed to read.
 *
 * `onDeactivated` also fires on role changes etc. only insofar as those arrive in
 * the same payload; the is_active check is explicit, so nothing else triggers it.
 */
export function useRealtimeOwnProfile(profileId: string | undefined, onDeactivated: () => void) {
  // Ref so a new inline callback each render doesn't tear down the channel.
  const handlerRef = useRef(onDeactivated)
  useEffect(() => { handlerRef.current = onDeactivated })

  useEffect(() => {
    if (!profileId) return

    const channel = supabase
      .channel(`own_profile:${profileId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${profileId}` },
        (payload) => {
          // Narrowed rather than cast: the realtime payload is typed as a generic
          // record, and only this one field is being trusted.
          const next: Partial<ProfileRow> = payload.new
          if (next.is_active === false) handlerRef.current()
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profileId])
}
