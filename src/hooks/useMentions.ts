import { useMutation } from '@tanstack/react-query'
import { syncMentions, type MentionSource } from '../api/mentions'

/**
 * Record @mentions on a source. Notifications are fired by a DB trigger, so this
 * mutation needs no cache invalidation. Safe to call on every autosave — only new
 * mentions insert (and notify).
 */
export function useSyncMentions() {
  return useMutation({
    mutationFn: ({ sourceType, sourceId, projectId, profileIds }: {
      sourceType: MentionSource; sourceId: string; projectId: string; profileIds: string[]
    }) => syncMentions(sourceType, sourceId, projectId, profileIds),
  })
}
