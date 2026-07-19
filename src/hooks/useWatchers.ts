import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchIsWatching, watchProject, unwatchProject } from '../api/watchers'

export const WATCHER_KEYS = {
  isWatching: (projectId: string) => ['project_watch', projectId] as const,
}

/** Whether the current user watches a project, plus a toggle that flips it. */
export function useProjectWatch(projectId: string | undefined) {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: WATCHER_KEYS.isWatching(projectId ?? ''),
    queryFn: () => fetchIsWatching(projectId!),
    enabled: !!projectId,
    staleTime: 60_000,
  })

  const toggle = useMutation({
    mutationFn: ({ watching }: { watching: boolean }) =>
      watching ? unwatchProject(projectId!) : watchProject(projectId!),
    onSuccess: () => qc.invalidateQueries({ queryKey: WATCHER_KEYS.isWatching(projectId ?? '') }),
  })

  return { isWatching: query.data ?? false, isLoading: query.isLoading, toggle }
}
