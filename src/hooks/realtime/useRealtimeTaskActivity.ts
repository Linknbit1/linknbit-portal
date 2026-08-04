import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { AUDIT_KEYS } from '../useAuditLog'
import { TIME_ENTRY_KEYS } from '../useTimeEntries'
import { TASK_KEYS } from '../useTasks'

/**
 * Keeps one open task in sync while it is on screen: field edits and time
 * entries both land in the activity feed, so either changing means the feed,
 * the tracked total and the task itself are all stale.
 *
 * Watches the source tables rather than audit_log, because audit_log is
 * admin-only under RLS — subscribing there would deliver nothing to everyone
 * else. The audit row is written by a trigger in the same transaction, so it
 * already exists by the time these events arrive. Cache-only, per the Realtime
 * rules.
 */
export function useRealtimeTaskActivity(taskId: string | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!taskId) return

    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: AUDIT_KEYS.task(taskId) })
      queryClient.invalidateQueries({ queryKey: TIME_ENTRY_KEYS.byTask(taskId) })
      queryClient.invalidateQueries({ queryKey: TIME_ENTRY_KEYS.running })
      queryClient.invalidateQueries({ queryKey: TASK_KEYS.detail(taskId) })
    }

    const channel = supabase
      .channel(`task-activity:${taskId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `id=eq.${taskId}` },
        refresh,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_time_entries', filter: `task_id=eq.${taskId}` },
        refresh,
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [taskId, queryClient])
}
