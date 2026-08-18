import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchComments, createComment, updateComment, deleteComment,
  type CreateCommentArgs, type UpdateCommentArgs,
} from '../api/comments'
import { TASK_KEYS } from './useTasks'

export const COMMENT_KEYS = {
  byTask: (taskId: string) => ['comments', taskId] as const,
}

export function useComments(taskId: string | undefined) {
  return useQuery({
    queryKey: COMMENT_KEYS.byTask(taskId ?? ''),
    queryFn: () => fetchComments(taskId!),
    enabled: !!taskId,
    staleTime: 10_000,
  })
}

export function useCreateComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, args }: { taskId: string; args: CreateCommentArgs }) => createComment(taskId, args),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: COMMENT_KEYS.byTask(row.task_id) })
      qc.invalidateQueries({ queryKey: TASK_KEYS.all })
    },
  })
}

export function useUpdateComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, args }: { id: string; args: UpdateCommentArgs; taskId: string }) => updateComment(id, args),
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: COMMENT_KEYS.byTask(v.taskId) })
    },
  })
}

export function useDeleteComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; taskId: string }) => deleteComment(id),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: COMMENT_KEYS.byTask(v.taskId) })
      qc.invalidateQueries({ queryKey: TASK_KEYS.all })
    },
  })
}
