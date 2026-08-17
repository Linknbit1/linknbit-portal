import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { BD_KEYS } from '../useBd'

/**
 * Keep the whole BD module live for as long as it is open.
 *
 * Mounted once, at the layout, rather than per screen. The pipeline, the board
 * and the reports are four filters over the same four collections, so
 * subscribing per page would open the same channels four times over and still
 * miss the case that matters most: a card that moves on the board while you are
 * reading the funnel.
 *
 * Cache-only, per the Realtime rules — a change invalidates the collection it
 * belongs to and TanStack refetches it. It does NOT apply the payload directly:
 * the rows these screens render carry joined names (owner, assignee, campaign)
 * that a replication payload does not include, so patching from it would blank
 * every one of them.
 *
 * One caveat worth knowing: your own optimistic writes echo back here too. That
 * is harmless — the invalidation refetches data the cache already agrees with —
 * but it is why the mutations mint their own ids rather than waiting for one.
 */
export function useRealtimeBd(enabled: boolean) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!enabled) return

    const invalidate = (key: readonly unknown[]) => () => {
      queryClient.invalidateQueries({ queryKey: key })
    }

    const channel = supabase
      .channel('bd:module')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bd_leads' }, invalidate(BD_KEYS.leads))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bd_tasks' }, invalidate(BD_KEYS.tasks))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bd_projects' }, invalidate(BD_KEYS.projects))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bd_activities' }, invalidate(BD_KEYS.activities))
      // A checklist item lives on a task, so a tick refreshes the task list.
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bd_task_checklist' }, invalidate(BD_KEYS.tasks))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [enabled, queryClient])
}
