import { useMutation, useQueryClient } from '@tanstack/react-query'
import { setTaskAssignees } from '../api/taskAssignees'
import { TASK_KEYS } from './useTasks'
import { PROJECT_KEYS } from './useProjects'

export function useSetTaskAssignees() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, profileIds }: { taskId: string; profileIds: string[]; projectId?: string }) =>
      setTaskAssignees(taskId, profileIds),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: TASK_KEYS.detail(v.taskId) })
      qc.invalidateQueries({ queryKey: TASK_KEYS.all })
      if (v.projectId) qc.invalidateQueries({ queryKey: PROJECT_KEYS.detail(v.projectId) })
    },
  })
}
