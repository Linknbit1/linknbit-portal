import { useMutation, useQueryClient } from '@tanstack/react-query'
import { setTaskReviewers } from '../api/taskReviewers'
import { TASK_KEYS } from './useTasks'
import { PROJECT_KEYS } from './useProjects'

/**
 * Adding a reviewer both grants them the task and, through a trigger, staffs
 * them onto its service, so the project's roster changes too.
 */
export function useSetTaskReviewers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, profileIds }: { taskId: string; profileIds: string[]; projectId: string }) =>
      setTaskReviewers(taskId, profileIds),
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: TASK_KEYS.all })
      qc.invalidateQueries({ queryKey: PROJECT_KEYS.detail(v.projectId) })
      qc.invalidateQueries({ queryKey: ['project-services'] })
    },
  })
}
