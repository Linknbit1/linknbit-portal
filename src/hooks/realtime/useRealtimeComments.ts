import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { COMMENT_KEYS } from '../useComments'

/**
 * Live comment thread for an open task. Refreshes the cached thread whenever a
 * comment on this task changes. Cache-only (per the Realtime rules).
 */
export function useRealtimeComments(taskId: string | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!taskId) return

    const channel = supabase
      .channel(`comments:${taskId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments', filter: `task_id=eq.${taskId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: COMMENT_KEYS.byTask(taskId) })
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [taskId, queryClient])
}
