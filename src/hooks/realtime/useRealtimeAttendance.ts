import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

/**
 * Keeps the attendance queues honest while two people work them at once.
 *
 * Approving a request used to change nothing for a colleague looking at the same
 * list: their cache held for up to five minutes, which is long enough for both of
 * them to decide the same leave request.
 *
 * The payload is never read. A change arrives, the affected queries are marked
 * stale, and the browser refetches through RLS — so realtime is a doorbell, not a
 * second way into the data. Nobody is shown a row they could not have fetched.
 *
 * One channel for all five tables rather than five channels: they are always
 * viewed together, and the counts on the sidebar move as a set.
 */
export function useRealtimeAttendance() {
  const queryClient = useQueryClient()

  useEffect(() => {
    // Every attendance key starts with 'attendance', so one prefix covers the
    // queues, the rosters and the sidebar counts without listing them.
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
    }

    const channel = supabase
      .channel('attendance-queues')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wfh_requests' }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'overtime_requests' }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_exceptions' }, invalidate)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])
}
