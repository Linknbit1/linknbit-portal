import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { AUDIT_KEYS } from '../useAuditLog'

/**
 * Live audit stream for admins. Non-admins never subscribe (RLS would return
 * nothing anyway) — pass `enabled` from the viewer's capability check.
 *
 * Pass `onInsert` to take over what a new row does. The log list is an infinite
 * query, and invalidating it refetches *every* loaded page — so a viewer who has
 * paged back through a month would re-request all of it on each incoming row,
 * and the list would reflow under them mid-read. The Audit Log page therefore
 * handles inserts by offering an explicit refresh instead. Without a handler the
 * original behaviour stands: refresh the list in place.
 *
 * The unread nav badge is a cheap head-count and always refreshes either way.
 */
export function useRealtimeAuditLog(enabled: boolean, onInsert?: () => void) {
  const queryClient = useQueryClient()

  // Kept in a ref so a new closure each render doesn't resubscribe the channel.
  const onInsertRef = useRef(onInsert)
  useEffect(() => { onInsertRef.current = onInsert })

  useEffect(() => {
    if (!enabled) return

    const channel = supabase
      .channel('audit_log')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'audit_log' },
        () => {
          queryClient.invalidateQueries({ queryKey: AUDIT_KEYS.newCount })
          if (onInsertRef.current) onInsertRef.current()
          else queryClient.invalidateQueries({ queryKey: AUDIT_KEYS.all })
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [enabled, queryClient])
}
