import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchIsWatching, watchProject, unwatchProject,
  fetchTaskWatchState, setTaskWatchState, type TaskWatchState,
} from '../api/watchers'

export const WATCHER_KEYS = {
  isWatching: (projectId: string) => ['project_watch', projectId] as const,
  taskWatch: (taskId: string) => ['task_watch', taskId] as const,
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

/**
 * The signed-in user's subscription to one task, plus a setter.
 * `isSubscribed` folds in the implicit rule the caller can't see from the row
 * alone: an assignee or the creator is on by default until they mute.
 */
export function useTaskWatch(taskId: string | undefined, implicitlySubscribed: boolean) {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: WATCHER_KEYS.taskWatch(taskId ?? ''),
    queryFn: () => fetchTaskWatchState(taskId!),
    enabled: !!taskId,
    staleTime: 60_000,
  })

  const state: TaskWatchState = query.data ?? 'default'
  const isSubscribed = state === 'on' || (state === 'default' && implicitlySubscribed)

  const set = useMutation({
    mutationFn: (next: TaskWatchState) => setTaskWatchState(taskId!, next),
    onSuccess: () => qc.invalidateQueries({ queryKey: WATCHER_KEYS.taskWatch(taskId ?? '') }),
  })

  // Turning off an implicit subscription needs a mute row; turning off an
  // explicit one just clears the row back to default.
  const toggle = () => set.mutate(isSubscribed ? (implicitlySubscribed ? 'muted' : 'default') : 'on')

  return { state, isSubscribed, isLoading: query.isLoading, isPending: set.isPending, toggle, set }
}
