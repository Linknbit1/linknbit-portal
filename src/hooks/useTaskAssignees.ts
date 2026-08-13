import { useMutation, useQueryClient } from '@tanstack/react-query'
import { setTaskAssignees } from '../api/taskAssignees'
import { TASK_KEYS } from './useTasks'
import { PROJECT_KEYS } from './useProjects'
import type { PersonMini } from '../api/projects'
import type { TaskListItem } from '../api/tasks'

interface SetAssigneesVars {
  taskId: string
  profileIds: string[]
  projectId?: string
  /**
   * The chosen people, resolved. Supplying them lets the picker fill in
   * immediately instead of waiting for the write and refetch — assignment is a
   * click, so it should feel like one.
   */
  people?: PersonMini[]
}

export function useSetTaskAssignees() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ taskId, profileIds }: SetAssigneesVars) => setTaskAssignees(taskId, profileIds),

    onMutate: async ({ taskId, people }) => {
      if (!people) return undefined
      const key = TASK_KEYS.detail(taskId)
      // Stop an in-flight refetch from landing on top of the optimistic value.
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<TaskListItem>(key)
      qc.setQueryData<TaskListItem>(key, (old) => (old ? { ...old, assignees: people } : old))
      return { previous, key }
    },

    onError: (_error, _vars, context) => {
      // Put the server's version back; the caller surfaces the failure.
      if (context?.previous) qc.setQueryData(context.key, context.previous)
    },

    onSettled: (_data, _error, v) => {
      qc.invalidateQueries({ queryKey: TASK_KEYS.detail(v.taskId) })
      qc.invalidateQueries({ queryKey: TASK_KEYS.all })
      if (v.projectId) qc.invalidateQueries({ queryKey: PROJECT_KEYS.detail(v.projectId) })
    },
  })
}
