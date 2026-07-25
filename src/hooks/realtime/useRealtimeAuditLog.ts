import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { AUDIT_KEYS } from '../useAuditLog'

/**
 * Live audit stream for admins. Every new row refreshes the list and the danger
 * badge, so a flagged action surfaces without a manual reload. Non-admins never
 * subscribe (RLS would return nothing anyway) — pass `enabled` from the viewer's
 * capability check.
 */
export function useRealtimeAuditLog(enabled: boolean) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!enabled) return

    const channel = supabase
      .channel('audit_log')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'audit_log' },
        () => {
          queryClient.invalidateQueries({ queryKey: AUDIT_KEYS.all })
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [enabled, queryClient])
}
