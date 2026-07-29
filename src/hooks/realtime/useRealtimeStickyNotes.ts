import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { STICKY_NOTE_KEYS } from '../useStickyNotes'

/**
 * Coalescing window for incoming changes.
 *
 * Note content is saved on every keystroke, so a person typing produces a
 * stream of UPDATE events. Refetching per keystroke would be pointless traffic;
 * a short debounce collapses a burst of typing into one refresh while still
 * feeling immediate for a pin, a drag or a delete.
 */
const REFRESH_DEBOUNCE_MS = 250

/**
 * Live sticky-note board. Cache-only, per the Realtime rules.
 *
 * The subscription is unfiltered because sticky_notes is owner-only at the
 * database level: RLS already limits delivery to the caller's own board, so
 * there is nothing narrower to filter on.
 */
export function useRealtimeStickyNotes() {
  const queryClient = useQueryClient()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const channel = supabase
      .channel('sticky_notes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sticky_notes' }, () => {
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => {
          /*
           * Never pull the rug out from under this client's own writes.
           *
           * Every keystroke and every drop is a mutation that has already
           * written the new value optimistically. A refetch landing mid-flight
           * would answer with the server's older row and visibly undo what is
           * being typed or dragged, so incoming changes wait until this side is
           * idle. The events that prompted this are the writer's own echo
           * anyway — the remote change is picked up by the next one through.
           */
          if (queryClient.isMutating({ mutationKey: STICKY_NOTE_KEYS.all })) return
          queryClient.invalidateQueries({ queryKey: STICKY_NOTE_KEYS.all })
        }, REFRESH_DEBOUNCE_MS)
      })
      .subscribe()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      supabase.removeChannel(channel)
    }
  }, [queryClient])
}
