import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { BD_KEYS } from '../useBd'
import type { BdCommentParent } from '../../api/bd'

/** The column each parent kind occupies — mirrors PARENT_COLUMN in src/api/bd.ts. */
const PARENT_COLUMN: Record<BdCommentParent, string> = {
  task: 'task_id',
  lead: 'lead_id',
  project: 'project_id',
}

/**
 * Live comment thread for the open BD record.
 *
 * Server-side filtered to this one parent, so a busy pipeline does not wake
 * every open drawer in the company for a comment on a lead nobody here is
 * looking at.
 *
 * Cache-only. The refetch is what resolves the author's name and avatar: a
 * replication payload carries `author_id` and nothing else, so rendering
 * straight from it would show every incoming comment as "Unknown".
 */
export function useRealtimeBdComments(parentType: BdCommentParent, parentId: string | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!parentId) return

    const channel = supabase
      .channel(`bd_comments:${parentType}:${parentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bd_comments',
          filter: `${PARENT_COLUMN[parentType]}=eq.${parentId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: BD_KEYS.comments(parentType, parentId) })
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [parentType, parentId, queryClient])
}
