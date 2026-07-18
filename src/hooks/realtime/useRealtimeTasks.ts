import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { TASK_KEYS } from '../useTasks'
import { PROJECT_KEYS } from '../useProjects'

/**
 * Live task changes for a project board. Any insert/update/delete on the
 * project's tasks refreshes the cached lists (and the project's counts) so
 * multiple people editing the same board stay in sync. Cache-only — never
 * writes into component state (per the Realtime rules).
 */
export function useRealtimeTasks(projectId: string | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!projectId) return

    const channel = supabase
      .channel(`tasks:${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `project_id=eq.${projectId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: TASK_KEYS.all })
          queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.detail(projectId) })
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [projectId, queryClient])
}
